#!/usr/bin/env bash
# Shared settings and helpers for feltprep.com deploys on ubuntu-vm, sourced by
# prepare.sh, cutover.sh, provision.sh and autodeploy.sh (see README.md). The
# flow is the host's web platform contract (ubuntu-vm-backup
# docs/web-platform.md): build and test outside the lock, then stage, migrate,
# check a candidate, switch and verify inside it. Fix forward only.
# shellcheck shell=bash disable=SC2034
set -Eeuo pipefail

NAME=feltprep
HOST=feltprep.com
SRV=/srv/www/feltprep.com
# The SvelteKit server (adapter-node) on loopback. 4316 was free on the host
# on 2026-11-26 (`ss -ltn`, /etc/caddy/sites and the contract's port table).
# Release candidates take a free port in 4400-4499.
PORT=4316
CANDIDATE_PORTS=(4400 4499)
FRAGMENT=feltprep.com
SITE=/etc/caddy/sites/$FRAGMENT.caddy
SERVICE=feltprep.service
UNIT=/etc/systemd/system/$SERVICE
CANDIDATE=feltprep-candidate.service
# Resource limits, kept apart from the unit as the contract asks.
LIMITS=50-resource-boundaries.conf
LIMITS_DIR=/etc/systemd/system/$SERVICE.d
# Continuous deploy of origin/main (autodeploy.sh).
AUTODEPLOY=feltprep-autodeploy
# The site's own system account (no login, no home).
ACCOUNT=feltprep-web
# Root-only database credentials written by the host's provision-app-database:
# web.env for the site, migration.env (with DB_OWNER_ROLE) for migrations only.
ENV_DIR=/etc/web-apps/feltprep
WEB_ENV=$ENV_DIR/web.env
MIGRATION_ENV=$ENV_DIR/migration.env
# Node 26 from the platform path for runtime and host-side checks. Builds use
# the /usr/local/bin/node-26 wrapper, which also puts pnpm 12 on PATH.
NODE=/opt/node-26/bin/node
NODE_VERSION=26.13.1
# Pre-migration dumps (root-only).
DUMP_DIR=/var/backups/$HOST
# Where prepare.sh builds, as sawyer, and the prepared release inside it.
WORK=/home/sawyer/web-work
RELEASE_DIR=release
# The server's checkout of the repository, owned by sawyer.
REPO_DEFAULT=/home/sawyer/github/feltprep
GITHUB_REPO=dunamismax/feltprep

die() { echo "ERROR: $*" >&2; exit 1; }
step() { printf '\n== %s\n' "$*"; }

# Privileged steps run only inside the host-wide lock, as descriptor 9.
require_lock() {
  [[ $EUID == 0 ]] || die 'run as root through /usr/local/sbin/with-deploy-lock'
  [[ $(readlink /proc/$$/fd/9) == /run/web-deploy/lock ]] || die 'shared deployment lock descriptor 9 is required'
  flock -n 9 || die 'shared deployment lock is not held'
}

# Things a FeltPrep deploy must never change: other sites and shared Caddy.
preserved() {
  sha256sum /etc/caddy/Caddyfile /usr/local/lib/caddy/caddy
  find /etc/caddy/sites -maxdepth 1 -type f ! -name "$FRAGMENT.caddy" -print0 | sort -z | xargs -0 -r sha256sum
  find /etc/systemd/system -maxdepth 1 -type f \( -name '*.service' -o -name '*.timer' \) ! -name 'feltprep*' -print0 \
    | sort -z | xargs -0 -r sha256sum
  find /srv/www -mindepth 2 -maxdepth 2 -name current ! -path "$SRV/current" -printf '%p -> %l\n' | sort
}

# Fetch a URL in full, retrying while a server starts. Never `curl | grep -q`:
# under pipefail grep exits early and curl fails writing the rest.
get() {
  local url=$1 attempt
  shift
  for attempt in {1..45}; do
    if curl -fsS --max-time 10 "$@" "$url"; then return 0; fi
    sleep 1
  done
  return 1
}

status_of() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@"; }

# /healthz must report this exact release, and the database state expected.
#   check_health BASE_URL COMMIT DATABASE [CURL_OPTION...]
check_health() {
  local base=$1 commit=$2 database=$3 body
  shift 3
  body=$(get "$base/healthz" "$@") || die "$base/healthz did not answer 200"
  [[ $body == "{\"status\":\"ok\",\"revision\":\"$commit\",\"database\":\"$database\"}" ]] \
    || die "$base/healthz answered $body, expected revision $commit and database $database"
}

# The site's own smoke check of the Node server, the same for the candidate,
# the live port and (with --resolve options) the public URL through Caddy.
#   smoke_app BASE_URL [CURL_OPTION...]
smoke_app() {
  local base=$1 home headers
  shift
  home=$(get "$base/" "$@") || die "$base/ failed"
  [[ $home == *'<title>FeltPrep</title>'* ]] || die "$base/ lacks the site title"
  headers=$(curl -fsS -D - -o /dev/null --max-time 10 "$@" "$base/") || die "$base/ headers failed"
  [[ ${headers,,} == *"content-security-policy: default-src 'self'"* ]] || die "$base/ sends no Content Security Policy"
  [[ $(status_of "$@" "$base/no-such-page") == 404 ]] || die "$base/no-such-page is not a 404"
}

# What the public sees, through the local Caddy with the real hostname and
# certificate: the app checks plus what only Caddy adds.
#   smoke_public COMMIT
smoke_public() {
  local commit=$1 resolve=(--resolve "$HOST:443:127.0.0.1" --resolve "www.$HOST:443:127.0.0.1")
  local base=https://$HOST headers
  check_health "$base" "$commit" ok "${resolve[@]}"
  smoke_app "$base" "${resolve[@]}"
  headers=$(curl -fsS -D - -o /dev/null --max-time 10 "${resolve[@]}" "$base/") || die 'headers failed through Caddy'
  [[ ${headers,,} == *'strict-transport-security:'* && ${headers,,} == *'x-content-type-options: nosniff'* ]] \
    || die 'security headers missing through Caddy'
  [[ $(status_of "${resolve[@]}" "https://www.$HOST/") == 301 ]] || die 'www does not redirect to the apex'
}
