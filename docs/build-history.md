# Build history

Handoff entries moved out of [BUILD.md](../BUILD.md#handoff-log), which keeps the newest eight. Oldest last.

### 2026-11-26 · P4.1, P4.2 · feltprep.com live through the build

- **Completed:** `deploy/` on the host contract with continuous deploy of `main` (D-10), a strict CSP, the contract’s migrator (`b61c1dc`); account, database and roles provisioned; site registered in `ubuntu-vm-backup` (`9766f4c`); DDNS covers both names (`xrayservice` `8bc2e05`); `feltprep.app` redirects in Cloudflare (D-11).
- **Verified:** full gate locally and in CI; prepare and cutover on the server; public checks from outside; phone width in both themes; backup drill rehearsed; autodeploy shipped, waited on CI and held a `deploy/` change as designed; one more hand deploy (`1b09b36`).
- **Open decisions:** Q-2 settled as D-11; Q-10 kept for hand deploys and server changes.
- **Next ready task:** P2.1: write `docs/grading.md`.
- **Plan changes:** D-10 and D-11 added at the owner’s request.

### 2026-11-24 · P1.5 · Heads-up fixtures and the rules trace; Phase 1 complete

- **Completed:** 15 hand-worked fixtures in `web/src/lib/engine/fixtures.ts`, with a runner that also asserts legal actions; the odd-chip checks; `rules-trace.spec.ts`. Phase 1’s exit criteria are ticked.
- **Verified:** every fixture matched its derivation on the first run; a wrong expectation and a removed rule each failed as they should; full gate from a clean clone and in CI.
- **Open decisions:** none touched.
- **Next ready task:** P2.1: write `docs/grading.md` defining a spot, a solution artifact, its manifest and the registry.
- **Plan changes:** none.

### 2026-11-24 · P1.4 · Rules and engine imported from RiverMind

- **Completed:** `docs/rules.md` and the engine from RiverMind `233b9c6`, now in `web/src/lib/engine/`; Web Crypto `cryptoRandom`; `engine:fuzz`, `engine:bench`, `engine:parity`; a property test applying every offered action; provenance with per-file hashes, GPL and Deuces notices.
- **Verified:** gate from a clean copy; parity byte-identical with Python, all five-card hands included; fuzz of 800,000 hands passed: per seat count 2 to 9, side-pot hands 0, 21,637, 42,119, 58,583, 71,390, 80,606, 86,871, 91,261 and odd-chip splits 0, 841, 1,239, 2,042, 2,693, 3,702, 4,573, 5,487.
- **Open decisions:** none touched.
- **Next ready task:** P1.5: write the heads-up short-stack fixtures by hand from the rules.
- **Plan changes:** P1.5 gains Gate A’s rules trace, with the rules that had no fixture at import.

### 2026-11-24 · P1.2 · Continuous integration

- **Completed:** `.github/workflows/test.yml` runs the full gate on every push and pull request (`52edfd7`).
- **Verified:** the first run on `main`, Test #45454058647, passed every step in 1 minute 34 seconds.
- **Open decisions:** none touched.
- **Next ready task:** P1.4: export RiverMind at its pinned commit into a scratch directory and copy the engine files into `web/src/lib/engine/`.

### 2026-11-24 · P1.1 · Scaffold the app

- **Completed:** `web/` from `sv create` 1.7.0, pinned to the host baseline, `pg` driver, optional database, `/healthz` with the build’s commit, a neutral home page with light and dark tokens, six Playwright projects against `node build`, root `.gitignore`. Docs, provenance and the sv notice updated.
- **Verified:** full gate from a clean copy (check, lint, 5 unit and component tests, build, 18 e2e tests); home page at 375 × 812 in both themes; `/healthz` with no, a working and an unreachable database; database commands on a scratch database. Not verified: CI (P1.2), the host.
- **Open decisions:** none touched. Q-12 still blocks brand artwork, so there is no favicon.
- **Next ready task:** P1.2: add a GitHub Actions workflow running the gate in `web/`.
- **Plan changes:** none. AGENTS.md section 8 said `docs/rules.md` comes at P1.3; corrected to P1.4.

### 2026-11-24 · Planning · Changes from a review of the plan

- **Completed:** four plan corrections from a review the owner passed on; no code and no step ticked.
- **Verified:** the odd-chip point against RiverMind’s rules 9.1 and 11.2 and its fixtures, which cover odd chips only with three or more seats. Links rechecked by script. No suite exists to run.
- **Open decisions:** none raised. Q-7’s default gained a per-hand margin.
- **Next ready task:** P1.1, unchanged.
- **Plan changes:** (1) Gate C’s on-demand item moved to P5.4, since M1 has no on-demand solving; P4.3 now waits for P3.7. (2) P1.5 tests an ordinary heads-up tie: two players cannot produce an odd chip. (3) Grading-gate item 9 with B-11 and B-12: exploitability qualifies a strategy, not each hand’s values. (4) P4.5, a pilot of M1 with a few players, feeding P5.5 and P6.4.

### 2026-11-24 · P1.3 · License and provenance record

- **Completed:** the owner chose AGPL-3.0-or-later (D-9, closing Q-1). Added `LICENSE`, `docs/provenance.md` with the record format and a table of which source licenses may be imported, and `licenses/`. The README and AGENTS.md name the license.
- **Verified:** `LICENSE` is byte-identical to gnu.org’s `agpl-3.0.txt` (SHA-256 in the provenance record). Links rechecked by script. No suite exists to run.
- **Open decisions:** Q-12 raised: terms for lesson text, the name and artwork. No lesson or artwork is committed before the owner answers.
- **Next ready task:** P1.1, starting with the current SvelteKit 3 documentation and `sv create` in `web/`.
- **Plan changes:** “`package.json` names the license” moved from P1.3 to P1.1, because no `package.json` exists until the scaffold.

### 2026-11-24 · Planning · Foundational documents

- **Completed:** README.md, AGENTS.md and BUILD.md written and committed as the first commit on `main`. `origin` was given GitHub and Codeberg push URLs, as the owner’s other repositories have. No code exists.
- **Verified:** read both reference repositories’ AGENTS.md, README.md and BUILD.md; RiverMind’s engine, bots, tests, licenses and evaluations at `233b9c6`. Ran its TypeScript engine benchmark and a 16,000-hand fuzz read-only from a scratch directory (results in the reuse assessment). Checked that the links between the three documents resolve and that every cited RiverMind path exists. Not run: RiverMind’s pytest, Vitest and parity suites.
- **Open decisions:** Q-1 to Q-11 raised with defaults.
- **Next ready task:** P1.1, starting with the current SvelteKit 3 documentation and `sv create` in `web/`.
