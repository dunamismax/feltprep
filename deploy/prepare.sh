#!/usr/bin/env bash
# Build and test a commit of origin/main as sawyer, outside the deploy lock
# (step 1 of the deploy flow, README.md). Never touches anything live. Prints
# the cutover command.
#
#   deploy/prepare.sh [COMMIT]          COMMIT defaults to origin/main
#
# FELTPREP_REPO names the checkout to build from (default: the one this script
# is in, or /home/sawyer/github/feltprep when run from a release). The
# end-to-end browser suite is not run here: GitHub Actions runs the full gate on
# every push, and autodeploy.sh deploys only a commit whose run passed.
set -Eeuo pipefail
# shellcheck source=deploy/common.sh
source "$(dirname "$0")/common.sh"

main() {
  [[ $EUID != 0 ]] || die 'prepare as sawyer, not root'
  local here repo commit candidate
  here=$(cd "$(dirname "$0")/.." && pwd)
  if [[ -n ${FELTPREP_REPO:-} ]]; then repo=$FELTPREP_REPO
  elif [[ -d $here/.git ]]; then repo=$here
  else repo=$REPO_DEFAULT; fi
  git -C "$repo" fetch --quiet origin main
  commit=$(git -C "$repo" rev-parse "${1:-origin/main}^{commit}")
  [[ $commit == "$(git -C "$repo" rev-parse origin/main)" ]] || die "$commit is not origin/main; push it first"

  candidate=$WORK/$HOST-$commit
  if [[ -f $candidate/COMMIT ]]; then
    echo "Already prepared: $candidate"
    print_next "$candidate"
    return
  fi
  # An earlier attempt that stopped part-way: start again.
  rm -rf "$candidate"
  mkdir -p "$candidate/src"

  step "Build and test $commit in $candidate"
  git -C "$repo" archive "$commit" | tar -x -C "$candidate/src"
  cd "$candidate/src/web"
  [[ $(cat .node-version) == "$NODE_VERSION" ]] || die ".node-version is not $NODE_VERSION"
  node-26 pnpm install --frozen-lockfile
  node-26 pnpm run check
  node-26 pnpm run lint
  node-26 pnpm run test
  # /healthz reports the commit the build was made from.
  FELTPREP_REVISION=$commit node-26 pnpm run build

  # Production dependencies only, from a clean install: `--prod` on top of the
  # full install would leave the devDependencies in node_modules/.pnpm.
  rm -rf node_modules
  node-26 pnpm install --frozen-lockfile --prod

  step 'Assemble the release'
  # The contract's layout: REVISION, .node-version, package.json ("type":
  # "module"), the build, production node_modules, deploy/ and the migrations,
  # plus the migration program.
  local release=$candidate/$RELEASE_DIR
  mkdir -p "$release/scripts"
  printf '%s\n' "$commit" > "$release/REVISION"
  cp -a .node-version package.json build node_modules drizzle "$release/"
  cp -a scripts/db-migrate.ts "$release/scripts/"
  cp -a "$candidate/src/deploy" "$release/deploy"
  [[ -z $(find "$release" -type l ! -path "$release/node_modules/*" -print) ]] || die 'release must contain no symlinks outside node_modules'

  step 'Smoke test the release on its own'
  smoke_release "$release" "$commit"

  (cd "$release" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$candidate/release.sha256"
  printf '%s\n' "$commit" > "$candidate/COMMIT"
  printf 'Candidate prepared: %s\nCommit: %s\n' "$candidate" "$commit"
  print_next "$candidate"
}

# The assembled release serves its pages and /healthz with no database, and its
# migration program reads drizzle/ with production dependencies only.
smoke_release() {
  local release=$1 commit=$2 port pid
  port=$(( 20000 + RANDOM % 20000 ))
  (cd "$release" && exec env -u DATABASE_URL HOST=127.0.0.1 PORT=$port ORIGIN=http://127.0.0.1:$port "$NODE" build/index.js) &
  pid=$!
  # shellcheck disable=SC2064 # expand $pid now: it is local to this function
  trap "kill $pid 2>/dev/null || true" EXIT
  check_health "http://127.0.0.1:$port" "$commit" 'not configured'
  smoke_app "http://127.0.0.1:$port"
  kill "$pid"; wait "$pid" 2>/dev/null || true
  trap - EXIT
  (cd "$release" && "$NODE" scripts/db-migrate.ts --check) || die 'the migration program cannot read drizzle/'
}

print_next() {
  printf 'Deploy (as root): /usr/local/sbin/with-deploy-lock %s/src/deploy/cutover.sh %s\n' "$1" "$1"
}

main "$@"
