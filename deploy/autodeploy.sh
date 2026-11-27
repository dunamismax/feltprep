#!/usr/bin/env bash
# Continuous deploy of origin/main to feltprep.com (README.md, "Continuous
# deploy"). Run by feltprep-autodeploy.timer as root every two minutes, always
# from the live release (/srv/www/feltprep.com/current/deploy/), never from a
# checkout. Each run:
#
# 1. fetches origin/main into sawyer's checkout; stops if it is already live;
# 2. holds a commit that changes deploy/ (these scripts, the units, the Caddy
#    fragment) until someone deploys it by hand, so root only ever runs deploy
#    code that was deployed deliberately;
# 3. waits for the commit's GitHub Actions run (the full gate, browser tests
#    included) and skips a commit whose run failed;
# 4. runs prepare.sh as sawyer, then cutover.sh under the deploy lock.
#
# A commit that fails is not tried again; the next push is. State and logs are
# in /var/lib/feltprep-autodeploy; `journalctl -u feltprep-autodeploy` shows
# each decision. Retry a failed commit by deleting its failed-<commit> file.
set -Eeuo pipefail
# shellcheck source=deploy/common.sh
source "$(dirname "$0")/common.sh"

STATE=/var/lib/$AUTODEPLOY
REPO=${FELTPREP_REPO:-$REPO_DEFAULT}

as_sawyer() { runuser -u sawyer -- env HOME=/home/sawyer PATH=/usr/local/bin:/usr/bin:/bin "$@"; }
note() { echo "$*"; logger -t web-deploy "$HOST autodeploy: $*"; }
# Say something about a commit once, not every two minutes.
note_once() {
  local key=$1
  shift
  [[ -e $STATE/$key ]] && return 0
  : > "$STATE/$key"
  note "$*"
}

# success, failure or pending, from the GitHub Actions check runs on a commit
# of the public repository (unauthenticated; one request per run at most).
ci_state() {
  local json
  json=$(curl -fsS --max-time 20 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$GITHUB_REPO/commits/$1/check-runs?per_page=100") || { echo pending; return; }
  "$NODE" -e '
    const runs = JSON.parse(process.argv[1]).check_runs ?? [];
    const ok = new Set(["success", "skipped", "neutral"]);
    if (runs.length === 0 || runs.some((run) => run.status !== "completed")) console.log("pending");
    else console.log(runs.every((run) => ok.has(run.conclusion)) ? "success" : "failure");
  ' "$json"
}

main() {
  [[ $EUID == 0 ]] || die 'autodeploy runs as root (feltprep-autodeploy.service)'
  install -d -m 0700 -o root -g root "$STATE"

  if ! as_sawyer git -C "$REPO" fetch --quiet origin main; then
    echo 'fetch failed; trying again next run'
    return 0
  fi
  local target live candidate log state
  target=$(as_sawyer git -C "$REPO" rev-parse origin/main)
  live=$(head -n 1 "$SRV/current/REVISION" 2>/dev/null || echo none)
  # Keep the server's checkout current when nobody is working in it.
  if [[ $(as_sawyer git -C "$REPO" branch --show-current) == main && -z $(as_sawyer git -C "$REPO" status --porcelain) ]]; then
    as_sawyer git -C "$REPO" merge --ff-only --quiet origin/main || true
  fi
  [[ $target != "$live" ]] || return 0
  [[ ! -e $STATE/failed-$target ]] || return 0

  if [[ $(as_sawyer git -C "$REPO" rev-parse "$target:deploy") != $(as_sawyer git -C "$REPO" rev-parse "$live:deploy" 2>/dev/null || echo none) ]]; then
    note_once "held-$target" "$target changes deploy/; deploy it by hand (deploy/README.md, \"Every deploy\")"
    return 0
  fi

  state=$(ci_state "$target")
  case $state in
    pending)
      note_once "waiting-$target" "$target is waiting for its GitHub Actions run"
      return 0 ;;
    failure)
      : > "$STATE/failed-$target"
      note "$target failed its GitHub Actions run; not deploying it"
      return 0 ;;
  esac

  note "deploying $target (live: $live)"
  candidate=$WORK/$HOST-$target
  log=$STATE/$target.log
  if ! as_sawyer env FELTPREP_REPO="$REPO" nice -n 10 "$SRV/current/deploy/prepare.sh" "$target" > "$log" 2>&1; then
    : > "$STATE/failed-$target"
    tail -n 40 "$log"
    note "$target failed to prepare; see $log"
    return 0
  fi
  if ! /usr/local/sbin/with-deploy-lock "$SRV/current/deploy/cutover.sh" "$candidate" >> "$log" 2>&1; then
    : > "$STATE/failed-$target"
    tail -n 40 "$log"
    note "$target failed its cutover; see $log"
    return 0
  fi
  # The release now lives in /srv/www; drop the build tree, keep the record.
  rm -rf "${candidate:?}/src" "${candidate:?}/${RELEASE_DIR:?}"
  # Logs and markers older than two weeks are no longer evidence of anything.
  find "$STATE" -maxdepth 1 -type f -mtime +14 -delete
  note "$target live"
}

main "$@"
