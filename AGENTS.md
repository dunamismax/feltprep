# Working on FeltPrep

The working manual for every coding agent, and every person, who changes this repository. Read it before you change anything, then read **Now** in [BUILD.md](BUILD.md). BUILD.md says what to build and records where work stands; this file says how to work. When they disagree about what to build, BUILD.md wins. When they disagree about how to work, this file wins.

> **No AI attribution, ever.** Commit messages, tags, release notes, code, comments, docs and file headers never mention Claude, Anthropic, ChatGPT, OpenAI or any other AI tool. No `Co-Authored-By` trailers, no “Generated with …” lines, no tool signatures. Use the configured git identity and never change git config. Re-read every commit message before committing and remove anything your tooling added by default.

Contents:

1. [What FeltPrep is](#1-what-feltprep-is)
2. [Session workflow](#2-session-workflow)
3. [What you decide, and what needs the owner](#3-what-you-decide-and-what-needs-the-owner)
4. [Git](#4-git)
5. [Shared checkout](#5-shared-checkout)
6. [Stack and layout](#6-stack-and-layout)
7. [Commands](#7-commands)
8. [Poker correctness](#8-poker-correctness)
9. [Feedback and solver claims](#9-feedback-and-solver-claims)
10. [Imports and provenance](#10-imports-and-provenance)
11. [The reference repositories](#11-the-reference-repositories)
12. [Product boundaries](#12-product-boundaries)
13. [Pitfalls carried over](#13-pitfalls-carried-over)
14. [Documentation](#14-documentation)

---

## 1. What FeltPrep is

A mobile-friendly web app for one player to learn, study and practice No-Limit Texas Hold’em: a lesson explains why a decision works, the solver study shows the reference answer, a drill repeats the decision, and full-hand practice applies it. The [README](README.md) describes the loop, and [BUILD.md](BUILD.md#the-first-release) defines the first release.

Four rules settle most design questions:

- **One loop.** A feature earns its place by serving learn → study → drill → practice → review. The lesson, the study view, the drill and the review of a spot all read the same reference answer.
- **Feedback is only as strong as its evidence.** A decision is graded only against a reference that has passed the grading gate ([section 9](#9-feedback-and-solver-claims)). Anything else is shown as “not graded”.
- **Measured, not assumed.** A claim about rules, accuracy, speed or layout is backed by a check that someone ran, and the record says which one.
- **Phone first.** The lesson, drill and practice flows are designed and tested at phone sizes before desktop.

## 2. Session workflow

[BUILD.md](BUILD.md#how-to-work-this-file)’s **How to work this file** is the full procedure. The essentials:

### Start

1. Read **Now** in BUILD.md: the current phase, the next step, what is in progress and what is blocked.
2. Run `git status --short --branch` and `git log -5 --oneline`. Changes in the tree that you did not make belong to someone else: leave them exactly as they are ([section 5](#5-shared-checkout)).
3. Choose the work. The owner’s request in the current conversation comes first. Otherwise take **Next step**. If it is blocked, take the first unchecked step in the current phase whose dependencies are all checked.
4. Claim it: put the step ID, a one-line goal and today’s date under **In progress** in **Now**. One step per session.

### Execute

- Read the step’s criteria before writing code. They are the definition of done; do not swap in an easier one.
- Build on settled decisions (`D-n`). Where a step relies on an open decision (`Q-n`), build with its stated default and say so in the evidence line. Stop only at an owner gate ([section 3](#3-what-you-decide-and-what-needs-the-owner)).
- Write tests with the code. For a bug, first add a check that fails without the fix.
- SvelteKit 3, Svelte 5, Tailwind CSS 4 and Drizzle change quickly and differ from older tutorials. Look up current documentation (Context7 or the official docs) before writing framework code.
- New work you find but are not doing now goes into BUILD.md as a criterion, a step or an idea, never only into chat or a commit message.

### Verify

- Check every criterion through its real entry point as well as through tests: the page in a browser against the production build, the command as a user would run it, the live URL after a deploy.
- **Every push to `main` goes live** at <https://feltprep.com> once its GitHub Actions run passes (D-10). Push only what passed the full gate, and after pushing confirm that `https://feltprep.com/healthz` reports your commit, normally within six minutes. If it does not, read `journalctl -u feltprep-autodeploy` on the server ([`deploy/README.md`](deploy/README.md)).
- For anything a player touches, check it at phone width (375 × 812) and in both colour themes.
- For engine, solver or grading changes, follow sections [8](#8-poker-correctness) and [9](#9-feedback-and-solver-claims).
- Run the full suite before committing ([section 7](#7-commands)).
- If you could not verify something, say so. A step with an unverified criterion stays unchecked.

### Hand off

1. **Record.** Tick each verified criterion, then the step, and add an `Evidence:` line: the commit and the checks you ran, in one or two sentences. For partial work leave the step unchecked and add a `Remaining:` line saying exactly what is left.
2. **Advance.** Update **Now** so that the next session can start from it alone.
3. **Log.** Prepend an entry to the [handoff log](BUILD.md#handoff-log) in the [format BUILD.md gives](BUILD.md#handoff-format): what was completed, how it was verified, which decisions are open and the next ready task.
4. **Review.** Read `git status` and the full diff, new files included, before committing.
5. **Report** to the owner in chat: what was done, what is next, and what waits on them.

## 3. What you decide, and what needs the owner

**Decide it yourself,** and record anything a later session would wonder about in BUILD.md:

- code structure, algorithms, file layout, tests and tooling, within the settled stack;
- libraries, after the license check in [section 10](#10-imports-and-provenance), at the host’s pinned versions;
- splitting a step, adding one that real work shows is needed, or rewording a criterion that turned out to be wrong, with the reason in the handoff entry;
- an open decision that has a stated default: build with the default and say so.

**Owner gates.** Get the owner’s explicit word in the current conversation for each of:

- a hand deploy, or changing anything on the server, DNS or Cloudflare. Pushing to `main` is not a hand deploy: by the owner’s decision D-10 every push that passes CI deploys itself to `feltprep.com`. A commit that changes `deploy/` waits for a hand deploy ([`deploy/README.md`](deploy/README.md)), and that needs the owner’s word;
- creating accounts, OAuth apps or anything that costs money, and adding or changing a git remote;
- changing the project’s license (D-9), importing anything whose terms `docs/provenance.md` does not clear, and committing lesson text or artwork before Q-12 is answered;
- changing a settled decision, deleting an unfinished step, lowering an acceptance criterion or a threshold in a verification gate, or reordering phases. Raise these as an open decision instead;
- telling players something about accuracy or strength that no benchmark in BUILD.md supports.

Approval for one hand deploy does not carry over to the next. An item that needs a person never blocks other work: do everything up to that point, write the exact remaining instruction under **Waiting on the owner** in **Now**, and move on.

## 4. Git

- **`main` only.** Never create branches, worktrees or pull requests, and never force-push.
- **Commit** verified work to `main` when a step or a coherent part of one is done, or when the owner asks. Then push right away with `git push origin main`. `origin` has two push URLs, so one push updates both GitHub and Codeberg.
- **Before committing:** run the full suite ([section 7](#7-commands)). Check `git status` for stray files, make sure every intended change is staged, including files edited after a rename, and never commit what `.gitignore` excludes. After adding fixtures or data files, run `git status --short --ignored <dir>` to catch a file an ignore rule dropped silently.
- **Messages:** a short imperative summary line, then a brief body saying what changed and why, naming the BUILD.md step where there is one.
- **Tick in the same commit.** The BUILD.md tick, its evidence line and the change it records land together.
- **No AI attribution** (see the top of this file).

## 5. Shared checkout

The owner often runs several sessions in one checkout.

- Claim one step per session and stay out of the files another claimed step owns. Shared files (BUILD.md, AGENTS.md, `package.json`, the lockfile) take small edits made right before committing.
- Never revert, reformat, stage or “tidy” a change you did not make. Commit only your own paths (`git commit -- <paths>`), never `git add -A` when someone else’s work is in the tree.
- If another session’s half-finished change breaks the suite, verify yours in a scratch copy of `main` with your changes applied, and say so in the evidence line.
- Ask before heavy local work. A long solve or equity build takes every core for minutes to hours. Run it at low priority (`nice -n 19`) and name it under **Background run** in **Now**, with the command that resumes it.

## 6. Stack and layout

The stack is settled (D-2 in BUILD.md): SvelteKit 3 · Svelte 5 · strict TypeScript · Tailwind CSS 4 · PostgreSQL 18 with Drizzle ORM · Node through `adapter-node` · Caddy, self-hosted on the owner’s server. Do not swap a layer without the owner.

The host runs several sites under one web platform contract, `docs/web-platform.md` in the owner’s `ubuntu-vm-backup` repository, which both reference projects follow and which wins over this file where they differ. As both references record it on 2026-11-24: pnpm 12.18.0 and Node 26.13.1 at exact versions, every dependency pinned exactly at the host’s baseline, `pg` with `drizzle-orm/node-postgres` as the only database driver, the host PostgreSQL 18 cluster, and fix-forward deploys with a candidate check and no rollback. FeltPrep follows it (P4.1, 2026-11-26): `bin/web-conformance` passes, the release layout, unit, roles and deploy steps are the contract’s, and [`deploy/README.md`](deploy/README.md) maps them to FeltPrep. Read the contract itself (on the server, `/home/sawyer/github/ubuntu-vm-backup/docs/web-platform.md`) before changing `deploy/`; it is not checked out on the development Mac.

**Layout.** Entries marked “exists” are there now. The rest is the proposal in [BUILD.md](BUILD.md#architecture-proposals); the session that creates a directory updates this section to match what it built.

```text
web/                       the SvelteKit app (exists; the same place RiverMind keeps its app, so imported paths line up)
  vite.config.ts           SvelteKit, Tailwind and Vitest configuration; the build's revision for /healthz (exists)
  playwright.config.ts     six browser projects against the production build on port 4391 (exists)
  drizzle.config.ts        drizzle-kit settings (exists)
  src/app.css              Tailwind entry and the theme tokens, light and dark, at AA contrast (exists)
  src/env.ts               environment variables, validated at build and start (exists)
  src/routes/              pages and endpoints: the home page, /style, /study/jam-or-fold/[stack] and /healthz exist
  src/lib/ui/              shared components and their helpers: code-drawn playing cards and the
                           contrast pairs the theme test measures (exists)
  src/lib/study/           the study view's strategy grid and its formatting helpers (exists)
  src/lib/engine/          cards, hand evaluator, hand state machine, histories, seat views, fuzzer and fixtures:
                           pure, browser-safe TypeScript imported from RiverMind (exists)
  src/lib/solver/          hand classes, exact equities, the pre-flop class table, games with a public betting
                           tree (game.ts), CFR+ and exact best response (cfr.ts), the jam-or-fold game, its
                           location in a full hand (jam-or-fold-hand.ts) and grading (grading.ts) exist.
                           fixtures/ holds imported reference data
  src/lib/spots/           the contract's types (docs/grading.md), the reader that checks a solution's hashes and
                           sliceSolution, one game's share of a solution (exists)
  src/lib/server/          server-only code: database client, health check and solutions.ts, which bundles
                           solutions/ and checks it in the build (exist); practice sessions and opponents later
  scripts/                 Node scripts run by package.json: db-migrate.ts, engine-fuzz.ts, engine-bench.ts,
                           engine-parity.ts and its Node-only helper engine/parity.ts, equity-build.ts,
                           solver-bench.ts, jam-or-fold-build.ts and jam-or-fold-compare.ts exist
  drizzle/                 SQL migrations (never edit an applied one); only the empty journal exists
  e2e/                     Playwright tests, desktop and phone (exists)
content/lessons/           lessons as Markdown, kept in Git, prerendered
solutions/                 small artifacts kept in Git, each with a manifest: registry.json, equity/ (the pre-flop
                           class equity table) and jam-or-fold/ exist
deploy/                    the contract's deploy: prepare, cutover, provision and continuous-deploy scripts, the systemd
                           units, the Caddy fragment and the runbook, README.md (exists)
docs/                      rules, grading, solver design, build history; rules.md and provenance.md exist
licenses/                  upstream notices for imported code (exists; its README lists them)
LICENSE                    the GNU AGPL, version 3: FeltPrep's code is AGPL-3.0-or-later (exists)
artifacts/                 ignored by Git: large solves, equity tables, opponent bundles
```

Conventions both reference projects learned the hard way, to apply from the first commit:

- **SvelteKit 3 is not SvelteKit 2.** Configuration lives in the `sveltekit({...})` call in `vite.config.ts`, there is no `svelte.config.js`, and the `$lib` alias is gone: import `#lib/...` with the file extension.
- **Svelte 5 runes only:** `$props`, `$state`, `$derived`, `$effect` and snippets. No `export let`, no `$:`, no legacy stores.
- **Tailwind 4 is configured in CSS** with `@theme` tokens. No `tailwind.config.js`, and no raw colours in components: use the theme’s tokens.
- **Engine and solver files stay plain.** No framework imports, no Node-only imports and no non-erasable TypeScript (enums, parameter properties), with relative `.ts` imports, so the same file runs in the browser, in Vitest and directly under `node` for benchmarks.
- **Drizzle:** change `schema.ts`, generate the migration, review and commit the SQL. Migrations are forward-only and run while the previous release is still serving, so add first and remove in a later release.
- **Secrets stay out of Git.** Commit `.env.example` only.

## 7. Commands

Every command runs from `web/` with the pinned Node 26.13.1 and pnpm 12.18.0. A fresh machine needs the Playwright browsers once: `pnpm exec playwright install chromium firefox webkit`.

**The full gate**, which must pass before every commit:

```bash
pnpm install --frozen-lockfile && pnpm run check && pnpm run lint && pnpm run test && pnpm run build && pnpm run e2e
```

GitHub Actions runs the same gate on every push (`.github/workflows/test.yml`); check that the run for your commit is green: a green run is what lets the server deploy it (D-10). It needs no database and no `.env`. It does not cover: the database commands (no table exists yet), the deployed site, real phones, or anything in `docs/`.

Rules for this section:

- A command is listed here only once it exists in the repository and you have run it. Never document a command you intend to add.
- The session that adds, renames or removes a command updates this section in the same commit.
- Each entry gives the command, where to run it, what it checks and anything it needs (a database, a built app, a quiet machine).
- Keep one clearly named full gate, the set of commands that must pass before every commit, and say what it does not cover.

| Purpose | Command | Notes |
| --- | --- | --- |
| Development server | `pnpm run dev` | Vite on port 5173, hot reload. Never used by tests. |
| Production build | `pnpm run build` | `adapter-node` output in `web/build/`. Needs no database. |
| Serve the build | `pnpm run start` | `node build`, loading `web/.env` if it exists. Set `ORIGIN` (and `HOST`, `PORT`) or adapter-node assumes https. |
| Type check | `pnpm run check` | `svelte-check` with warnings as failures. |
| Lint | `pnpm run lint` | Prettier check, then ESLint with type-aware rules. `pnpm run format` rewrites. |
| Unit and component tests | `pnpm run test` | Vitest: `server` project in Node (`*.spec.ts`), `client` project in headless Chromium (`*.svelte.spec.ts`). |
| Browser tests, desktop and phone | `pnpm run e2e` | Playwright builds the app and serves it with `node build` on 127.0.0.1:4391, then runs `e2e/*.e2e.ts` in Chromium, Firefox and WebKit at 1440 × 900 and at 375 × 812 with touch. Port 4391 must be free. |
| Generate a migration | `pnpm run db:generate` | `drizzle-kit generate` from `src/lib/server/db/schema.ts` into `drizzle/`. Needs `DATABASE_URL`. Review the SQL before committing it. |
| Apply migrations | `pnpm run db:migrate` | `scripts/db-migrate.ts` applies `drizzle/` to `DATABASE_URL` (a PostgreSQL 18 database). |
| Engine rules and fixtures | `pnpm run test` | The engine's specs in `src/lib/engine/` run in the full gate: the 33 hand-worked fixtures imported in `rules.json` and FeltPrep's own in `fixtures.ts` (each derived in a comment; a script token like `S1:?f,c900` asserts the exact legal actions), the rules trace (`rules-trace.spec.ts`: every kept rule in `docs/rules.md` needs a fixture), rule tests, histories, seat views, a short fuzz, every offered action applied (`properties.spec.ts`), a guard that no engine file imports a Node module (`imports.spec.ts`), and `engine.browser.spec.ts` in Chromium. `rules.json` is an imported fixture: never reformat it (`.prettierignore`). |
| Long engine fuzz | `pnpm run engine:fuzz` | 100,000 random hands at each seat count from 2 to 9 (`-- --hands N --seats 2,6 --seed S`), every invariant checked after every action, illegal actions near the legal set rejected; prints counts of showdowns, side pots, all-ins and odd chips. About 5 minutes on one core (274 seconds on 2026-11-24): run it with `nice -n 19` after any engine change and record the result. |
| Engine benchmark | `pnpm run engine:bench` | Random self-play speed on one core at 2, 6 and 9 seats (`-- --hands 20000 --repeats 5`). Needs a quiet machine. |
| Engine parity with RiverMind | `pnpm run engine:parity -- --reference <dir>` | Replays hands from RiverMind's Python reference and compares every state byte for byte, plus evaluator digests (`--all-five` for every five-card hand). `<dir>` is a scratch export of RiverMind at the pinned commit (`git -C <rivermind> archive 233b9c6 \| tar -x -C <dir>`), never a live checkout, since `uv` writes a virtual environment there. Needs `uv`. Run once at import (done, `docs/provenance.md`) and again only if RiverMind's engine is re-imported. |
| Pre-flop equity table | `pnpm run equity:build` | Rebuilds `solutions/equity/preflop-classes.json` and its manifest from the code (P2.2): 134,459 boards, about 40 seconds and 150 MB on one core. `-- --check` rebuilds without writing and fails unless the bytes equal the committed table and its manifest. Run it after any change to the evaluator or `preflop-table.ts`, with `nice -n 19`; the full gate checks the committed table against the published one (B-4). |
| Jam-or-fold solution | `pnpm run jof:build` | Solves the jam-or-fold game at 2 to 15 big blinds from the equity table (P2.4), twice per depth for the margins (B-12), and writes `solutions/jam-or-fold/` and the registry entry’s manifest hash, keeping its gate record. About a minute on one core; fails if a depth is over the exploitability threshold or a verdict jumps between acceptable and mistake. `-- --check` rebuilds without writing and fails unless the solution’s bytes are unchanged. Commit code changes first and build on a clean tree, so the manifest names a commit that holds the code. |
| Jam-or-fold chart comparison | `node scripts/jam-or-fold-compare.ts --chart <file>` | B-5’s comparison with the published chart. `<file>` is a hand-made copy of the chart kept outside the repository (Q-13); the script’s header gives the format. |
| Solver benchmarks | `pnpm run solver:bench` | B-1 (CFR+ on Kuhn poker), B-2 (best responses against hand-derived values) and B-3 (the polarized river game against its closed form); prints each measured number for `docs/benchmarks.md` and exits 1 if one fails. A second or two. The same checks run in the full gate (`src/lib/solver/cfr.spec.ts`). |
| Build a release on the server | `deploy/prepare.sh [COMMIT]` | **On the server, as sawyer**, from `~/github/feltprep` (repository root, not `web/`). Exports `origin/main` into `~/web-work/feltprep.com-<commit>/`, runs install, check, lint, test and the build, assembles the release and smoke-tests it. Changes nothing live. |
| Put a release live | `/usr/local/sbin/with-deploy-lock <candidate>/src/deploy/cutover.sh <candidate>` | **On the server, as root.** Stage, migrate, candidate check, switch, verify, Caddy, public check. A hand deploy is an owner gate (section 3). |
| Provision the host | `/usr/local/sbin/with-deploy-lock ~sawyer/github/feltprep/deploy/provision.sh` | **On the server, as root.** Account, database, roles and credentials; idempotent. Done 2026-11-26. |
| Continuous deploy | `systemctl status feltprep-autodeploy.timer` | **On the server.** Every push to `main` whose CI passed deploys itself (D-10); `journalctl -u feltprep-autodeploy` shows each decision. |

## 8. Poker correctness

The engine decides what is legal, who wins and how many chips move. A mistake there makes every lesson, drill and grade built on it wrong, so engine changes carry extra checks.

- **The rules document is the specification.** Every engine rule traces to a numbered rule in `docs/rules.md` (created at P1.4). Change the rule text and the engine in the same commit.
- **Expected values are worked out by hand.** A fixture’s final stacks, pots and winners are derived from the rules, never copied from the engine’s own output. RiverMind’s fixtures were built this way (`test/engine/fixtures.py`), and a throwaway recomputation caught a wrong pot total in its rules document before any code ran.
- **Check the cases that go wrong.** Minimum and maximum raise amounts; an incomplete all-in raise that does not reopen the betting; side pots with several all-ins; a split pot with an odd chip, which needs three or more players, because two players’ matched contributions always make an even pot; an uncalled bet returned; heads-up blinds and order of action (the button posts the small blind, acts first before the flop and last after it); a hand that ends before showdown.
- **Invariants hold after every action:** chips are conserved, no stack is negative, every action the engine offers applies cleanly, every action it does not offer is rejected, and every hand ends.
- **After any engine change,** run the fixture tests, the property tests and the long fuzz (`pnpm run engine:fuzz`, section 7), and record the fuzz result in the evidence line.
- **Exercise both seats.** RiverMind’s evaluation always put the button in seat 0, so a seat-mapping bug that made the bot check or call every decision from seat 1 was found only when the bot was served at a live table (`docs/bots.md`, “Serving”). Test every position a player can be in.
- **Randomness comes from the caller.** The engine takes a deck order or a generator and holds no global state, so any hand can be replayed exactly. Tests, drills under test and benchmarks use seeds. A browser test never waits for a lucky deal: it plays a seeded hand.
- **The interface offers what the engine offers.** Action buttons and bet limits come from the engine’s legal actions for the current state, never from a second copy of the rules in a component.
- **Amounts are whole chips.** Convert to big blinds for display only.

## 9. Feedback and solver claims

Telling a player that a decision was a mistake is the product’s central claim, so it has the strictest rule in the repository.

- **Grade only against a qualified reference.** A reference qualifies by meeting every item of the [grading gate](BUILD.md#evidence-required-before-grading-a-decision): a stated game, no card bucketing, measured exploitability under the threshold, a passing benchmark suite and a reproducible artifact.
- **A practice opponent is not a reference.** RiverMind’s trained blueprints win against simple bots, but nothing measures how close they are to equilibrium, and their card abstraction groups different hands together. They may be opponents to play against. They never grade a decision and their frequencies are never shown as “the right play”.
- **“Not graded” is a correct answer.** When no qualified reference covers a decision, say so plainly. Do not fall back to a heuristic dressed as a verdict.
- **Show the assumptions.** A solved spot always displays its stacks, positions, bet sizes and ranges. A grade is a statement about that game, not about poker in general.
- **A good strategy does not vouch for every hand.** Exploitability is an average over the whole strategy, so it can be low while a rarely held hand’s action values are wrong. A grade uses values computed exactly from the finished strategies, checked hand by hand (B-11), with each hand’s margin recorded (B-12). A hand outside the spot’s ranges is not graded.
- **Mixed strategies are not mistakes.** An action the reference plays some of the time, or one that costs less than the tolerance, is acceptable. The thresholds are in BUILD.md (Q-7).
- **Every accuracy claim names its benchmark.** A sentence in the app, the README or a lesson that says how accurate FeltPrep is must point at a row in [BUILD.md’s benchmark table](BUILD.md#gate-b--trustworthy-feedback-on-reference-spots). No row, no claim.
- **The verifier is verified first.** Exploitability numbers come from FeltPrep’s own best-response code, which must first reproduce hand-derived answers on games small enough to solve on paper.
- **Expected answers come from outside the code under test:** a closed-form result, a published value with its source cited in the test, or an independent solver’s output. Never the solver’s own earlier output, except in a regression test that is labelled as one.
- **Artifacts are reproducible.** A solution’s manifest records the spot, the settings, the seed, the commit, the measured exploitability and the SHA-256 of every file. The same inputs must give the same bytes.

## 10. Imports and provenance

Nothing enters the repository from elsewhere until its origin and terms are known and written down. This covers code, test fixtures, data tables, trained models, solver output, fonts, icons, card faces, images, sounds and lesson text.

Before importing anything:

1. **Find the source.** The exact repository, path and commit, or the publication and page.
2. **Find the license,** in the source’s own license file and file headers, not in memory or a summary. If you cannot find one, treat the thing as not importable.
3. **Trace it one step further.** Check whether the source itself copied the thing from somewhere else with its own terms. In RiverMind, `rivermind/engine/evaluator.py` is adapted from Deuces and carries an MIT notice; everything under `poker_ai/` came from the upstream Poker AI project and carries that project’s additional indemnification terms (`licenses/Poker-AI-additional-terms.txt`); and the playing-card sprites have no recorded source or license at all (Q-8 in RiverMind’s BUILD.md), so they must not be copied.
4. **Check that the terms fit FeltPrep’s license.** The code is AGPL-3.0-or-later (D-9 in BUILD.md), and [`docs/provenance.md`](docs/provenance.md) lists which source licenses may be imported. GPL-3.0 code, RiverMind’s included, may be combined with it and stays under the GPL. For terms the table does not name, ask the owner.
5. **Record it** in `docs/provenance.md` in the same commit: what was imported, from where (repository, path, commit), under which license, who holds the copyright, what was changed, and how the copy was verified. Keep any required notice in `licenses/` and in the file’s header.
6. **Verify the copy.** Imported code keeps its tests and passes them here. Imported data or models are checked against a published hash; for a RiverMind model that is its entry in RiverMind’s `docs/models.json`.

Further rules:

- **Imported is not trusted.** A passing license check says nothing about correctness. Imported engine code meets [section 8](#8-poker-correctness) in this repository, and imported strategies meet [section 9](#9-feedback-and-solver-claims) before they grade anything.
- **A dependency is an import.** Before `pnpm add`, check the package’s license and that the version is the host baseline’s.
- **An external solver used for cross-checks is a tool, not a dependency.** Check its license before running it, record the version used, and import none of its code.
- **The license covers the code.** The terms for lesson text and for the FeltPrep name and artwork are an open decision (Q-12). Do not commit a lesson or brand artwork until the owner answers it.
- **Lesson content is original.** Do not copy charts, ranges, hand examples or wording from books, training sites or solver products. Where a published number is used as a benchmark, cite it in the test.
- **Load only trusted artifacts.** Never unpickle or execute a file from outside the project.

## 11. The reference repositories

Two of the owner’s projects are references for how to work and, for RiverMind, a source of poker engineering:

- `/Users/sawyer/github/rivermind-poker`: no-limit hold’em against people and bots. The reuse assessment in BUILD.md was made against commit `233b9c6`.
- `/Users/sawyer/github/c-from-the-ground-up`: a course site on the same stack, complete at v2.0.0 (`145f911`), with the cleanest example of the scaffold, the content pipeline and the deploy.

Both are **read-only** from a FeltPrep session. Do not edit, format, commit or run anything there that writes inside the repository. Other sessions work in them and leave uncommitted changes. Reading files and running a script that only reads, from a scratch directory outside both repositories, is fine.

When you copy something from one, pin the commit and follow [section 10](#10-imports-and-provenance). When you copy a practice from one, check it against what that repository does now, not only what this file says.

## 12. Product boundaries

- **FeltPrep’s interface, branding and artwork are original.** Do not copy RiverMind’s pixel-art style, palette, sprites, fonts, layouts or wording, or any other product’s look.
- **RiverMind keeps its own features.** Tables shared with other people, the lobby, wallets and play-chip balances, reactions and safety controls, and table voice stay in RiverMind. FeltPrep is one player preparing alone.
- **No real-money play, ever,** and nothing that resembles a wager with value.
- **No third-party trackers or ads.** Self-hosted, and any analytics are first-party and cookieless.

## 13. Pitfalls carried over

Mistakes that cost real time in the reference projects. Each is a rule here until FeltPrep’s own experience replaces it.

- **`Now` grows until nobody can read it.** RiverMind’s BUILD.md says to keep each **Now** cell to the current state, yet single cells grew to several hundred words each and the file to 278 KB. Here a **Now** cell is at most two sentences, history goes to evidence lines and the handoff log, and the log keeps eight entries.
- **A list built inline in a Svelte `{#each}` can stop being reactive.** Build the list in the script with `$derived` (RiverMind’s `/hands` page showed the first hand’s board for every hand until this was found).
- **`adapter-node` assumes https unless `ORIGIN` is set.** Set `ORIGIN` when running the built server locally.
- **`adapter-node` fixes its list of static files at build time.** A file written into the build output afterwards is a 404.
- **Keep pages free of inline script and style,** so a strict Content Security Policy can ship from the start. Animate with CSS classes, not Svelte transitions that inject styles.
- **Nothing may move under a finger.** On a phone, action buttons keep their positions when the turn comes round, and a panel that opens is laid over the table, never pushed into the flow.
- **A loopback port that is free on the Mac may be taken on the server.** Check the server before choosing one.
- **`curl | grep -q` under `pipefail`** fails a healthy check, because `grep -q` exits at the first match. Fetch in full, then match.
- **A timing-sensitive test that fails under load is still worth a look** before it is called flaky. Record the machine’s load when you report it.
- **A simulator is not a phone.** It is a faithful stand-in for a browser engine, not for a real touch screen, processor or mobile network.

## 14. Documentation

- **[README.md](README.md)** is for a visitor: who FeltPrep is for, what it does and its current state. Update its status when a milestone lands.
- **[BUILD.md](BUILD.md)** is the authoritative plan and record. Status, results and plan changes go there.
- **This file** holds durable ways of working: conventions, verified commands and recurring pitfalls. When a change makes something here wrong, fix it in the same commit.
- **`docs/`** holds specifications and designs that outlive a step: the rules, the grading contract, the solver design and the provenance record. A long write-up goes there and is linked from a one-line evidence entry.
- Write for a reader who was not in the session. Say what is true now; history belongs in the handoff log and `docs/build-history.md`.
