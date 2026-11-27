#!/usr/bin/env bash
# One-time (and idempotent) host setup for feltprep.com, run as root under the
# shared lock from the server's checkout:
#   /usr/local/sbin/with-deploy-lock /home/sawyer/github/feltprep/deploy/provision.sh
#
# Creates, only where missing:
# - the feltprep-web system account (no login, no home) the site runs as;
# - the PostgreSQL 18 database `feltprep` with the host's role model
#   (feltprep_owner, feltprep_migration, feltprep_web), its pg_hba.conf rules and
#   the root-only /etc/web-apps/feltprep/{web,migration}.env, all through the
#   host's own ubuntu-vm-backup bin/provision-app-database;
# - /srv/www/feltprep.com/releases and /var/backups/feltprep.com.
# Existing passwords and files are left alone; nothing else on the host changes.
# The units and the Caddy fragment are installed by cutover.sh.
set -Eeuo pipefail
# shellcheck source=deploy/common.sh
source "$(dirname "$0")/common.sh"

main() {
  require_lock
  local provisioner=/home/sawyer/github/ubuntu-vm-backup/bin/provision-app-database

  if ! id -u "$ACCOUNT" >/dev/null 2>&1; then
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$ACCOUNT"
    echo "created account $ACCOUNT"
  fi

  [[ -x $provisioner ]] || die "missing $provisioner"
  # Additive and safe to repeat; it proves both logins before it returns. The
  # lock this process holds (descriptor 9) is inherited.
  "$provisioner" "$NAME"

  install -d -m 0755 -o root -g root "$SRV" "$SRV/releases"
  install -d -m 0700 -o root -g root "$DUMP_DIR"
  echo "Provisioned $HOST: account $ACCOUNT, database $NAME, credentials in $ENV_DIR."
}

main "$@"
