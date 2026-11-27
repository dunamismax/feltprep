# Deploying feltprep.com

FeltPrep runs on `ubuntu-vm` beside the host’s other sites and follows the host’s web platform contract (`docs/web-platform.md` in `ubuntu-vm-backup`): Caddy fragments changed only through `caddy-apply`, Node 26.13.1 at `/opt/node-26` with pnpm 12.18.0 (builds go through the `node-26` wrapper), the host PostgreSQL 18 cluster, the host-wide deploy lock (`/usr/local/sbin/with-deploy-lock`), and fix-forward deploys with a candidate check. Where this file and the contract differ, the contract wins.

**The site is live for the whole build.** Every push to `main` deploys itself once its GitHub Actions run passes, so the owner can review each change at <https://feltprep.com> (owner decision D-10 in BUILD.md, 2026-11-26).

| What | Where |
| --- | --- |
| Live site | <https://feltprep.com>; `www.feltprep.com` redirects to it |
| Server checkout | `/home/sawyer/github/feltprep` (sawyer, HTTPS fetch from GitHub) |
| Releases | `/srv/www/feltprep.com/releases/<commit>`, the live one at `current` |
| App server | `feltprep.service`: `/opt/node-26/bin/node build/index.js` on `127.0.0.1:4316` as `feltprep-web` |
| Resource limits | `/etc/systemd/system/feltprep.service.d/50-resource-boundaries.conf` |
| Continuous deploy | `feltprep-autodeploy.timer` and `.service`, running the live release’s `deploy/autodeploy.sh` |
| Caddy site | `/etc/caddy/sites/feltprep.com.caddy` (automatic HTTPS; both names are Cloudflare “DNS only”) |
| Database | `feltprep` (schema `app`, bookkeeping in `drizzle`); roles `feltprep_owner`, `_migration`, `_web` |
| Credentials | `/etc/web-apps/feltprep/{web,migration}.env` (root only; never print them) |
| Pre-migration dumps | `/var/backups/feltprep.com/pre-migrate-<commit>.dump` (root only) |
| Nightly backup | the host’s `ubuntu-vm-backup` dumps every database and archives the live release (`config/applications.json`) |
| Build work | `/home/sawyer/web-work/feltprep.com-<commit>/` (sawyer; expired after 14 days) |
| Logs | `journalctl -u feltprep`, `journalctl -u feltprep-autodeploy`, `/var/lib/feltprep-autodeploy/<commit>.log`, `/var/log/caddy/feltprep-access.log` |

## What is live

Read it from the running process, never from a checkout:

```sh
curl -s https://feltprep.com/healthz        # {"status":"ok","revision":"<commit>","database":"ok"}
sudo /home/sawyer/github/ubuntu-vm-backup/bin/web-live feltprep.service
```

## Continuous deploy

`feltprep-autodeploy.timer` runs `deploy/autodeploy.sh` from the live release two minutes after each run ends. A run fetches `origin/main` into the server checkout and, when it is not what is live:

1. **holds** a commit that changes anything under `deploy/` until someone deploys it by hand (below), so root only runs deploy scripts that were deployed deliberately;
2. **waits** for the commit’s GitHub Actions run (the full gate: types, lint, unit, component and browser tests in three engines at desktop and phone sizes) and **skips** a commit whose run failed;
3. runs `prepare.sh` as sawyer and `cutover.sh` under the deploy lock, exactly as a hand deploy does.

A commit that fails any step is not tried again; the next push is. Each decision is logged once to the journal (`journalctl -u feltprep-autodeploy`, or `journalctl -t web-deploy | grep feltprep`). To retry a failed commit, delete `/var/lib/feltprep-autodeploy/failed-<commit>`. To pause continuous deploys, `systemctl stop feltprep-autodeploy.timer`; the next hand deploy turns it back on.

A push normally appears on the site three to six minutes later: about two minutes for CI, up to two for the timer, and two or three for the server’s build and checks.

## First time only

Done on 2026-11-26; kept for a rebuilt host. As sawyer:

```sh
git clone https://github.com/dunamismax/feltprep.git ~/github/feltprep
```

As root, create the account, the database, its roles and credentials (idempotent; keeps existing passwords):

```sh
/usr/local/sbin/with-deploy-lock /home/sawyer/github/feltprep/deploy/provision.sh
```

Then deploy by hand once (below). The first cutover installs the units and the Caddy fragment and starts the continuous-deploy timer.

## Every deploy by hand

Needed only for a commit that changes `deploy/`, or to redeploy without waiting for the timer.

1. Push the commit to `main`, and wait for its GitHub Actions run to pass.
2. As sawyer, build and test it in a fresh work directory. Nothing live changes:

   ```sh
   cd ~/github/feltprep && git pull --ff-only && deploy/prepare.sh
   ```

   It refuses a commit that is not `origin/main`, exports it with `git archive`, runs `pnpm install --frozen-lockfile`, `check`, `lint`, `test` and the build (with `FELTPREP_REVISION` set to the commit), drops the devDependencies, assembles the release (`REVISION`, `.node-version`, `package.json`, `build/`, production `node_modules/`, `scripts/db-migrate.ts`, `drizzle/`, `deploy/`), and smoke-tests it on its own. The Playwright end-to-end suite is CI’s job, not the server’s.

3. As root, run the cutover command that `prepare.sh` prints:

   ```sh
   /usr/local/sbin/with-deploy-lock /home/sawyer/web-work/feltprep.com-<commit>/src/deploy/cutover.sh /home/sawyer/web-work/feltprep.com-<commit>
   ```

   In one locked process it stages the immutable release, dumps the database and runs the migrations as `feltprep-web` with only `migration.env`, starts the release as a transient candidate on a free port in 4400–4499 and checks `/healthz` (this commit, database `ok`) and the smoke check, switches `current` and restarts `feltprep.service`, verifies the running process, applies the Caddy fragment if it changed, and checks the public site through the local Caddy. It stops at the first failure and names the step.

## When something fails

- **Before the switch** (prepare, stage, migrate, candidate): the previous release is still serving. Read the output, fix the cause in a new commit and push it.
- **After the switch**: the new release is live and unhealthy. Do not point `current` at an older release or restore an old unit or fragment. Read `journalctl -u feltprep`, fix it in a new commit and deploy that. There is no rollback on this host.
- **A failed migration** stops the deploy before the candidate. Restoring a pre-migration dump over the live database is the owner’s decision, never a deploy step.

## Smoke check

`common.sh` holds the one smoke check used for the candidate, the live port and the public site: the home page renders with its title and a Content Security Policy, an unknown path is a 404, `/healthz` reports the commit and database, and through Caddy the security headers are present and `www` redirects to the apex. Extend it as pages are added.

## Not yet done

- **`feltprep.app`** has no DNS records, so it is not served (Q-2 in BUILD.md).
- **Public-address changes.** The host’s Cloudflare DDNS job (in the `xrayservice` repository) does not yet manage the `feltprep.com` records, so if the home connection’s address changes the site goes dark until they are added there.
