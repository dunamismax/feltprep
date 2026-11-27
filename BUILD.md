# FeltPrep build tracker

The authoritative roadmap and progress record for FeltPrep. Start with **Now**, then read [AGENTS.md](AGENTS.md) for how to work. Every step lists its acceptance criteria, and a ticked step carries the evidence that it was met.

**Jump to:** [Now](#now) · [How to work this file](#how-to-work-this-file) · [The first release](#the-first-release) · [Settled decisions](#settled-decisions) · [Open decisions](#open-decisions) · [Architecture proposals](#architecture-proposals) · [RiverMind reuse assessment](#rivermind-reuse-assessment) · [Verification gates](#verification-gates) · [Phase overview](#phase-overview) · [Release checklist](#first-release-checklist) · [Handoff log](#handoff-log)

## Now

Keep every cell to the current state, in at most two sentences. History goes in evidence lines and the handoff log.

| | |
| --- | --- |
| **Current phase** | [Phase 3 · The first loop](#phase-3--the-first-loop): P3.1 done, so theme tokens and code-drawn cards are on `/style`. |
| **Next step** | **P3.3 · Study view**: the 13 × 13 grid for the jam-or-fold solution. P3.2 can build its pipeline but commits no lesson before Q-12. |
| **In progress** | Nothing. |
| **Background run** | None. |
| **Waiting on the owner** | Q-12 (lesson text and artwork terms) before P3.2 commits a lesson; Q-13 (the published push/fold chart’s terms) is optional. Two optional Cloudflare settings for `feltprep.app` (D-11). |
| **Live** | <https://feltprep.com> serves `main` as a preview, redeployed by every push whose CI passes (D-10); `/healthz` names the live commit. `feltprep.app` redirects to it in Cloudflare (D-11). |
| **`main`** | Phases 1 and 2, the host deploy and a strict CSP. `origin` pushes to GitHub and Codeberg. |
| **Last updated** | 2026-11-26 |

## How to work this file

1. **Orient.** Read **Now**, then [AGENTS.md](AGENTS.md). Run `git status --short --branch` and `git log -5 --oneline`. Leave alone every change in the tree that you did not make.
2. **Choose.** The owner’s request in the current conversation comes first. Otherwise take **Next step**. If it is blocked, take the first unchecked step in the current phase whose dependencies are all checked, or record exactly what is needed to proceed.
3. **Claim.** Put the step ID, a one-line goal and today’s date under **In progress**. One step per session.
4. **Build and verify.** The checkboxes indented under a step are its criteria. Verify each through its real entry point as well as through tests, and pass the [verification gate](#verification-gates) the step names.
5. **Record.** Tick each criterion as it is verified, then the step. Add an `Evidence:` line with the commit and the checks you ran, in one or two sentences; a longer write-up goes in `docs/` and is linked. For partial work leave the step unchecked and add a `Remaining:` line saying exactly what is left and why.
6. **Advance.** Update **Now**. When a phase’s exit criteria are all ticked, tick the phase in the [overview](#phase-overview).
7. **Hand off.** Prepend an entry to the [handoff log](#handoff-log) in the [handoff format](#handoff-format).

**Ticking.** Tick a box only when the work is committed in this repository, the full suite passes, and the thing does what its line says, verified here. Work that exists only in RiverMind, in a scratch directory or in a plan is not done. Never delete a ticked item; if a regression undoes one, untick it and say why in the handoff entry.

**Step format.** `- [ ] **P<phase>.<step> · Title** · Depends on: <step IDs, Q-n or none>`, optionally followed by `· **Owner gate:** <action>`. Criteria are checkboxes indented under it, then the record lines `Evidence:` and, while partial, `Remaining:`.

**Changing the plan.** You may split a step (P2.3 becomes P2.3a and P2.3b), add one that real work shows is needed, or reword a criterion that turned out to be wrong. Say why in the handoff entry. Deleting an unfinished step, lowering a criterion or a gate threshold, reordering phases or changing a settled decision needs the owner: raise it as an open decision.

**Later phases are sketched.** Phases 1 to 3 are specified step by step. Phases 4 to 7 list their steps and exit criteria; the session that opens one writes each step’s criteria in full before starting it, and may not weaken the phase’s exit criteria in doing so.

**IDs.** Steps are `P<phase>.<step>`. Settled decisions are `D-n`, open decisions `Q-n`, architecture proposals `A-n`, benchmarks `B-n`. Gates are A, B and C.

**New work and ideas.** Work a step needs becomes a criterion or a step. A question only the owner can settle becomes an open decision with a default. Ideas that do not gate the first release go to [After the first release](#after-the-first-release).

---

## The first release

The first release is the smallest FeltPrep that is coherent: a player can take a small set of ideas through the whole loop (lesson, solver study, drill, full-hand practice, review) on a phone, and every grade they see rests on a reference that passed [Gate B](#gate-b--trustworthy-feedback-on-reference-spots).

### Scope

Rows marked **Proposal** are this plan’s recommendation, not yet confirmed by the owner. Rows marked **Open** point at the decision that settles them. Build with the proposal or the default until the owner says otherwise.

| Dimension | In the first release | Status |
| --- | --- | --- |
| Game | No-limit Texas hold’em cash game, 52-card deck, no ante, no rake, no straddle | Proposal |
| Graded format | Heads-up only. Two-player zero-sum play is where “how far from equilibrium” has a measurable answer | Proposal (Q-3) |
| Table sizes for full-hand practice | 2 seats. 6 seats only as ungraded practice, if Q-3 and Q-9 are answered yes | Proposal; 6 seats **Open** (Q-3, Q-9) |
| Stack depths, graded | 2 to 15 big blinds for the jam-or-fold game; 100 big blinds effective for the post-flop spot library | Proposal |
| Stack depths, practice | A short-stack table at 10 to 15 big blinds and a 100 big blind table | Proposal |
| Solver capability 1 | Exact equities: hand against hand, hand against range, range against range | Proposal |
| Solver capability 2 | The heads-up jam-or-fold equilibrium at each depth from 2 to 15 big blinds, precomputed | Proposal |
| Solver capability 3 | Heads-up post-flop subgame solving for a stated pair of ranges and bet sizes: river spots on demand, turn and flop spots as a precomputed library | Proposal (Q-6 for how it is computed) |
| Spot library | One pre-flop line (button opens, big blind calls) on at least 12 flops chosen to cover distinct textures, each solved to the river | Proposal; the count and the choice of flops are set at P5.5 from measured solve cost (P5.1) and the M1 pilot’s findings (P4.5) |
| Curriculum | At least 8 lessons, each tied to at least one spot with a study view and a drill | Proposal |
| Practice opponents | A rule-based opponent and a reference-strategy opponent for the jam-or-fold game; RiverMind’s trained heads-up champion at 100 big blinds if Q-9 is answered yes | Proposal; champion **Open** (Q-9) |
| Devices | Phone first (375 × 812 and 360 × 640), then tablet and desktop, in Chromium, Firefox and WebKit | Proposal |
| Identity | No sign-in. Progress lives in the browser, and a signed guest cookie identifies server-stored hands | **Open** (Q-4) |
| Hosting | The owner’s server behind Caddy, on `feltprep.com`, with `feltprep.app` redirecting to it | Settled (D-3, D-11) |

### Not in the first release

Multiway solving; graded 6-max or 9-max play; a pre-flop solve at 100 big blinds; on-demand flop solves; tournaments, antes and ICM; node locking and custom trees; hand-history import; accounts that sync across devices; other people at the table. Each is listed under [After the first release](#after-the-first-release).

### Definition of done

The first release is done when every item in the [first-release checklist](#first-release-checklist) is ticked. In short:

1. **The loop is whole.** From every lesson a player can reach its spot’s study view and drill, and from every graded mistake in a practice hand they can reach the lesson and drill that cover it.
2. **Rules are right.** Gate A passes on the release commit.
3. **Grades are earned.** Every reference that grades a decision is listed in the solution registry with its Gate B results, and every decision without one is shown as “not graded”.
4. **It works on a phone.** Gate C passes in three browser engines, and one pass on a real phone is recorded.
5. **Claims match benchmarks.** Every statement about accuracy in the app and the README names a benchmark in this file.
6. **It is live and recoverable.** The release commit serves on the canonical domain with a health check, a database backup and a one-command redeploy.
7. **Provenance is complete.** Every imported file, table and model is in `docs/provenance.md` with its license, and no asset is of unknown origin.

---

## Settled decisions

These come from the owner’s brief of 2026-11-24 and the owner’s standing rules. Build on them; change one only with the owner’s approval, and record the change here.

| ID | Decision |
| --- | --- |
| D-1 | **Product.** A mobile-friendly web app for learning, studying and practicing No-Limit Texas Hold’em. It gives a player one place to learn why a decision works, drill that decision in realistic spots, and apply it in full practice hands. The solver, the trainer and the practice table serve that one loop. |
| D-2 | **Stack.** The stack of RiverMind Poker and C From The Ground Up: SvelteKit 3, Svelte 5, strict TypeScript, Tailwind CSS 4, PostgreSQL 18 with Drizzle ORM, Node through `adapter-node`, and Caddy. |
| D-3 | **Hosting.** Self-hosted on the owner’s server. `feltprep.com` and `feltprep.app` are registered, and their Cloudflare DNS points at that server. |
| D-4 | **Original product.** FeltPrep’s interface, branding and artwork are original. RiverMind’s pixel-art style, social features and voice chat stay in RiverMind. |
| D-5 | **Reference projects.** `rivermind-poker` and `c-from-the-ground-up` are read-only references. Useful engineering is carried over where it fits, after its license and upstream notices are checked. |
| D-6 | **Individual preparation.** RiverMind is for recreational play with friends or bots. FeltPrep is for one player’s preparation and improvement. |
| D-7 | **This file is the authority** on the plan and its progress. An implementation item is ticked only when the work and its verification exist in FeltPrep. |
| D-8 | **Git.** `main` only, no branches or pull requests, and no AI attribution anywhere. |
| D-10 | **Live through the build** (owner, 2026-11-26). `feltprep.com` serves `main` from the start of the build, so the owner can review each change in a browser. Every push to `main` whose GitHub Actions run passes deploys itself through `feltprep-autodeploy` on the host, by the contract’s fix-forward flow with a candidate check ([`deploy/README.md`](deploy/README.md)). A commit that changes `deploy/` is held for a hand deploy, which stays an owner gate (Q-10). The preview is not the first public release: P4.3 still waits for M1, and the site sends `noindex` until then. |
| D-11 | **Canonical domain** (owner, 2026-11-27, answering Q-2). `feltprep.com` serves the app and `www.feltprep.com` redirects to it in Caddy. `feltprep.app` is a permanent (301) redirect to `https://feltprep.com/` set up by the owner in Cloudflare: its records are proxied, so it never reaches the host, and neither Caddy nor the host’s DDNS job handles it. Checked 2026-11-27: http and https both answer 301; the redirect drops the path, and `www.feltprep.app` has no record. Both are the owner’s Cloudflare settings to change if wanted. |
| D-9 | **License** (owner, 2026-11-24, answering Q-1). FeltPrep’s code is licensed under the GNU Affero General Public License, version 3 or later (`AGPL-3.0-or-later`), so that anyone who runs a modified FeltPrep as a service must offer its source. GPL-3.0 code, RiverMind’s included, may be combined with it under section 13 of both licenses and stays under the GPL. The terms for lesson text and for the name and artwork are Q-12. |

## Open decisions

Use each default until the owner decides otherwise. **Needed by** names the first step that relies on the answer.

| ID | Question | Default until decided | Needed by |
| --- | --- | --- | --- |
| Q-1 | **License.** RiverMind is GPL-3.0-or-later; C From The Ground Up is MIT. Which license does FeltPrep carry? | **Decided** (D-9): AGPL-3.0-or-later. | — |
| Q-2 | **Canonical domain.** Which of `feltprep.com` and `feltprep.app` serves the app? | **Decided** (D-11): `feltprep.com`. | — |
| Q-3 | **Formats in the first release.** Is heads-up the only graded format, and does 6-max full-hand practice ship ungraded? | Heads-up graded. 6-max practice ships only if Q-9 allows a six-seat opponent, and is labelled ungraded. No 9-max. | P3.5, P6.5 |
| Q-4 | **Accounts.** Guest-only, or sign-in to keep progress across devices? | No sign-in. Drill progress in browser storage; a signed guest cookie for server-stored practice hands. | P3.4, P3.5 |
| Q-5 | **Business model.** Free, paid or mixed? | Free, with no payments, ads or third-party trackers in the first release. | P7 |
| Q-6 | **Solver compute.** Is the solver core TypeScript on Node, as the settled stack suggests, or does it need a faster core or Python offline? | TypeScript on Node. P5.1 measures a reference river, turn and flop solve; if a solve cannot reach its Gate B threshold inside the budget, the session records the gap and proposes an alternative for the owner. | P5.1 |
| Q-7 | **Grading thresholds.** How close to equilibrium must a reference be, and how large a loss counts as a mistake? | Exploitability at most 0.5% of the starting pot for a precomputed post-flop spot, 1% for an on-demand river solve, and 0.001 big blinds per hand for jam-or-fold. An action is **acceptable** if the reference plays it at least 5% of the time with that hand or it loses at most 1% of the pot; an **inaccuracy** up to 5%; a **mistake** above that. A loss smaller than the reference’s own exploitability is never shown as a mistake, and a loss within that hand’s recorded margin of a band’s boundary (B-12) gets the kinder band. | P2.5 |
| Q-8 | **Range assumptions for post-flop spots.** A post-flop solve needs both players’ starting ranges, and the first release does not solve pre-flop at 100 big blinds. Where do they come from? | Ranges written for FeltPrep and shown to the player as assumptions. The alternative is the pre-flop frequencies of RiverMind’s heads-up champion (lossless before the flop), recorded with the model’s hash. Either way a grade is conditional on the ranges shown. | P5.5 |
| Q-9 | **RiverMind’s trained champions as practice opponents.** Serve them from FeltPrep? | The heads-up champion `hu-m1-s0-1024m` at P6.1, after measuring memory on the host (its bundle is about 450 MB in memory). The six-seat champion only if that measurement leaves room. Never for grading. | P6.1 |
| Q-10 | **Server setup.** May agents provision the host (database, roles, units, Caddy fragment) without asking each time, as RiverMind’s D-10 allows there? | No. Every server change and hand deploy needs the owner’s word until they say otherwise. Pushes to `main` deploy themselves (D-10); that is not a server change. | P4.1 |
| Q-11 | **Independent solver for cross-checks.** Which tool, under which license? | Chosen at P5.3 after reading the tool’s own license file. It runs as an external program on reference spots; none of its code enters the repository. | P5.3 |
| Q-12 | **Terms for lesson text, and for the FeltPrep name and artwork.** D-9 covers the code. Are lessons and brand assets under the same license, a content license, or reserved? | Undecided, and nothing of either kind exists yet. A lesson may be drafted, but none is committed to this public repository until the owner answers, because publishing under a free license cannot be taken back. | P3.1 (artwork), P3.2 (lessons) |
| Q-13 | **The published jam-or-fold chart.** B-5 compares FeltPrep’s solution with HoldemResources’ heads-up push/fold chart (<https://www.holdemresources.net/hune>), whose page names no license. May the chart, or the unsimplified equilibrium data the page offers for download, be kept in the repository or downloaded for the comparison? | No. The chart stays out of Git; the full gate checks five cited values, and `scripts/jam-or-fold-compare.ts` compares the rest against a hand-made copy outside the repository. The unsimplified data, which would settle the six differences recorded under B-5, is not downloaded. | — (B-5 passed without it) |

## Architecture proposals

Recommendations where the evidence is still thin. Each says what it rests on and what would change it. A session may build on one; replacing one is a plan change recorded in the handoff entry.

| ID | Proposal | Rests on | Would change if |
| --- | --- | --- | --- |
| A-1 | **The app lives in `web/`,** with the engine under `web/src/lib/engine/`. | RiverMind keeps its app in `web/` and C From The Ground Up in `site/`; matching RiverMind makes imported files easy to diff against their source. | The host’s platform contract or deploy tooling expects another layout (check at P4.1). |
| A-2 | **TypeScript only; no Python in the repository.** FeltPrep vendors RiverMind’s TypeScript engine at a pinned commit and then owns it. | The TypeScript engine runs under plain Node with no dependencies (observed below), and is kept byte-identical to RiverMind’s Python reference by `pnpm engine:parity` in RiverMind’s CI. One language keeps the gate short. | Q-6 finds that solving needs Python or a native core, or FeltPrep wants RiverMind’s Python training code. |
| A-3 | **The engine is browser-safe.** The rules, the evaluator and the grading of precomputed spots run in the browser; the server is needed only for stored hands, large solutions and trained opponents. | A single player has nobody to cheat, so RiverMind’s reason for a server-authoritative table (D-2 there) does not apply. Drills that grade locally respond instantly and work on a poor connection. | Stored progress or opponent bundles make a server round trip necessary for a flow anyway. |
| A-4 | **Practice hands use plain HTTP requests, not a WebSocket table server.** | One player against bots that answer at once needs no shared live state. RiverMind’s table server (`web/src/lib/server/table`, with seats, clocks, lobby and wallets) solves problems FeltPrep does not have. | A feature needs server push. |
| A-5 | **Spots and solutions are files with manifests, not database rows.** Small ones are committed under `solutions/`; large ones live under the ignored `artifacts/` and on the server, each checked against a registry of SHA-256 hashes before use. | RiverMind’s model registry (`docs/models.json`, `web/src/lib/champions.json`) and its `loadChampion` check, which refuses a bundle with any changed file. | Solutions become too many to ship as files. |
| A-6 | **The database holds learner state only:** practice hands and, later, progress. Lessons stay in Git and are prerendered. | C From The Ground Up’s rule that content stays in Git and the database holds learner state only (its BUILD.md, “Architecture”). | — |
| A-7 | **The best-response evaluator is the trust anchor.** Whatever produced a strategy, FeltPrep’s own evaluator measures its exploitability before it may grade. | It makes Gate B independent of the solver’s author, so an imported or externally computed solution is held to the same bar as FeltPrep’s own. | — |
| A-8 | **Jam-or-fold is the first solved game.** | It is the one no-limit hold’em game FeltPrep can solve and verify exactly with modest compute, so the first milestone can make an accuracy claim that is fully backed. | The exact equity table (P2.2) proves too costly to compute; then the session records the measurement and proposes an alternative first game. |

---

## RiverMind reuse assessment

Made on 2026-11-24 against RiverMind commit `233b9c6` by reading its source, tests and build record, and by two read-only runs from a scratch directory outside both repositories. Its working tree had another session’s uncommitted edits in five files, none of them an engine file. Nothing has been imported: every row below is a candidate, and each import is its own step with its own verification.

### What was checked directly

- **The TypeScript engine runs standalone.** `node scripts/engine-bench.ts --hands 5000 --repeats 3` on Node 26.13.1 played 66,571, 44,900 and 40,694 complete hands a second (median) at 2, 6 and 9 seats on one core. The script imports only engine files and Node built-ins.
- **A fuzz from outside the repository passed.** A scratch script importing `web/src/lib/server/engine/fuzz.ts` played 16,000 random hands (2,000 at each seat count from 2 to 9), checking every invariant after every action and that nearby illegal actions were rejected: no failures, in 4.0 seconds.
- **The evaluator’s extremes are right.** It ranks a royal flush 1 and 7-5-4-3-2 offsuit 7,462, and puts A♥3♦ one place above Q♣J♣ on K♠K♥7♦7♣2♠, as the rules document’s worked example says.

Not run from this session, because they write caches inside RiverMind: its pytest suite, its Vitest suite and its parity checks. RiverMind’s own record has them green in CI (437 pytest tests, 1,243 Vitest tests and 184 Playwright tests on the runs listed under **`main`** in its BUILD.md). P1.4 reruns what it imports, here.

### Licenses and notices

| Source | Terms found | Consequence for FeltPrep |
| --- | --- | --- |
| RiverMind as a whole | GPL-3.0-or-later (`LICENSE`, `pyproject.toml`, `web/package.json`) | Its files may be imported into FeltPrep’s AGPL-3.0-or-later code (D-9) under section 13 of both licenses. An imported file stays under the GPL, and its header says so. |
| `rivermind/` and `web/` | First committed in RiverMind by the owner (`0e8e63e`, 2026-11-19, onward); `rivermind/` imports nothing from `poker_ai/` | The candidates below come from here. |
| `rivermind/engine/evaluator.py`, `web/src/lib/engine/evaluator.ts` | Adapted from Deuces by Will Drevo, MIT (`licenses/Deuces.txt`), stated in both file headers | Import with the header and a copy of the notice in `licenses/`. |
| `poker_ai/` | Came from the upstream Poker AI project: GPL with an added indemnification section (`licenses/Poker-AI-additional-terms.txt`) | **Do not import.** It is the retired short-deck prototype and nothing below depends on it. |
| Playing-card sprites (`web/art/cards/`) | Source and license not recorded (RiverMind’s Q-8) | **Do not import.** FeltPrep draws its own cards (D-4). |
| Pixel art, palette and font (`web/art/`) | Original to RiverMind | **Do not import** (D-4). |
| Voice code and its notices (RFC 9605, ts-mls, python-mnemonic, web-noise-suppressor) | Various | Out of scope (D-4). |
| Trained models (`artifacts/models/`, ignored by Git) | Produced by RiverMind’s own training runs; every file’s SHA-256 is in `docs/models.json` | Usable as practice opponents if Q-9 allows, verified against the registry. No third-party model is involved. |

### 1. Rules engine: the strongest candidate

| Piece | Source path | What works today | What FeltPrep adapts | How to verify here |
| --- | --- | --- | --- | --- |
| Hand state machine | `web/src/lib/server/engine/state.ts`, `pots.ts`, `seating.ts` | Immutable `HandState`; `startHand`, `legalActions` with exact minimum and maximum raise totals, `apply`, side pots, split pots, odd chips, uncalled bets, 2 to 9 seats. A line-for-line port of `rivermind/engine/state.py`, held byte-identical to it by `pnpm engine:parity`. | Move it beside the evaluator so it is browser-safe (A-3). `timeoutAction` and the button-movement helpers are table behaviour FeltPrep may not need. | The imported specs, the 33 fixtures, the fuzz at 100,000 hands per seat count, and one parity run against RiverMind’s Python reference at the pinned commit (Gate A). |
| Cards and evaluator | `web/src/lib/engine/cards.ts`, `evaluator.ts` | Five- to seven-card ranking, 1 (best) to 7,462, already browser-safe. RiverMind records agreement with the legacy Deuces copy on 60,000 random hands, and its parity script can compare all 2,598,960 five-card hands. | Nothing. Keep the Deuces notice. | Imported specs; rank all five-card hands and check each hand class’s count against the known totals. |
| Randomness | `web/src/lib/server/engine/random.ts` | A `Random` interface, a seeded generator and a shuffle. | **Split it.** It imports `randomInt` from `node:crypto`, and `state.ts` imports it, so the engine does not load in a browser as it stands. Keep the interface and seeded generator in the engine and inject the secure source. | A Vitest browser-mode test that deals and plays a hand. |
| Histories and replay | `web/src/lib/server/engine/history.ts` | Versioned JSON hand states and hand histories (`"format": 1`), replay to an identical state, and a readable text history that hides mucked cards from other seats. | Nothing structural. FeltPrep’s review stores these. | Imported round-trip specs over every fixture and a sample of fuzzed hands. |
| Seat view | `web/src/lib/server/engine/view.ts` | `SeatView`: everything one seat may know and nothing else, proven by a test that reshuffles every hidden card. | Nothing. It is the input to opponents and to grading. | Imported privacy spec. |
| Fixtures | `web/src/lib/server/engine/rules.json` (33 hands, generated from `test/engine/fixtures.py`), `testing.ts`, `rules.spec.ts` | Hands from fold-outs to nine all-ins with eight side pots, with final stacks, pots, returned bets and shown or mucked seats **worked out by hand** from the rules. | Import the JSON as a fixed fixture. New fixtures are added here, by hand. | They pass; add heads-up short-stack fixtures for the jam-or-fold game. |
| Fuzzer and benchmark | `web/src/lib/server/engine/fuzz.ts`, `web/scripts/engine-bench.ts` | Random legal play with invariant checks after every action; a speed benchmark. | Wire both into FeltPrep’s commands. | Run them; record the results. |
| Rules specification | `docs/rules.md` | Thirteen numbered sections with worked examples and a table of the choices that vary between card rooms. | Keep sections 1 to 12. Drop or mark as unused the table rules: joining, button movement with empty seats, timeouts and disconnections. | Every kept rule still has a passing fixture. |
| Table UI logic | `web/src/lib/nl/bet.ts`, `hand-name.ts`, `replay.ts` | Pot-fraction bet sizing clamped to legal limits; hand names in words; a finished hand as steps that reveal only what the viewer may see. Each has a spec. | They import types from `protocol-v2.ts`, RiverMind’s WebSocket protocol, which FeltPrep does not use: re-type them against the engine. Import the logic only, never the components or styles (D-4). | Their specs, re-typed. |

### 2. Practice opponents: usable, as opponents only

| Piece | Source path | What works today | What FeltPrep adapts | How to verify here |
| --- | --- | --- | --- | --- |
| Rule-based bots | `web/src/lib/server/bots/policies.ts`, `mt.ts` | Random, calling station, a min-bet probe and a tight-aggressive heuristic (Chen scores before the flop, enumerated hand strength after it), drawing from a port of CPython’s generator so they play the same in both languages. RiverMind records 1,000 fuzzed hands per bot with only legal actions. | Take the heuristic as the first opponent. `PythonRandom` matters only for parity with Python, so it can be replaced once FeltPrep stops comparing. | Each bot plays 1,000 fuzzed hands legally at 2 seats, from both positions. |
| Trained heads-up opponent | `web/src/lib/server/bots/blueprint.ts`, `bundle.ts`, `tree.ts`, `abstraction.ts`, `champions.ts`; the bundle in `artifacts/models/hu-m1-s0-1024m/bundle/` | Plays `hu-m1-s0-1024m`, 1.024 billion MCCFR iterations. As served it won +58.8 big blinds per 100 hands against the heuristic (95% interval +50.1 to +67.5) over 20,000 duplicate deals at 100 big blinds (`docs/evaluations/hu-m1-s0-1024m-served.md`). A decision takes about 0.005 ms; the bundle holds about 442 MB in memory. | Load the bundle read-only and check it against RiverMind’s registry hashes. It was trained for 50 and 100 big blind stacks, so it is not an opponent for the short-stack table. | Hashes match `docs/models.json`; RiverMind’s bot parity fixtures pass; memory measured on the host (Q-9). |
| Trained six-seat opponent | `web/src/lib/server/bots/multiway.ts`; `artifacts/models/6max-s1-s0-3600m/` | The six-seat champion, served at RiverMind’s tables of 3 to 6. Both champions together hold 1.6 GB in RiverMind’s web service. | Only if Q-3 and Q-9 say yes. | As above. |
| Evaluation harness | `rivermind/bots/match.py` (Python) | Duplicate, seat-rotated matches with 95% intervals, reproducible from a seed whatever the worker count. | Not needed unless FeltPrep trains or ranks opponents. A good design to copy if it ever does. | — |

**What these are evidence for, and what they are not.** RiverMind’s promotion gate asks that a champion beats the heuristic and the calling station with a 95% interval above zero. That shows the champion is a much better opponent than a simple bot. It does not measure distance from equilibrium: the only exploitability figure in RiverMind is on Kuhn poker, where its trainer reaches 0.011 chips a hand (`docs/bots.md`, “Correctness”). The champion also plays an abstraction: 1,000 card buckets a street after the flop, so different hands share one strategy; a fixed set of bet sizes, with other bets mapped onto them at random; and two stack depths. RiverMind’s own design names tiny bets as a known way to probe it and real-time search (its P5.8, unstarted) as the fix.

### 3. Precomputed strategies: not a grading reference

RiverMind’s precomputed strategies are the two champions above. For FeltPrep they may serve as:

- a **practice opponent**, labelled as one (Q-9);
- possibly a **source of range assumptions** for heads-up post-flop spots, since the heads-up abstraction is lossless before the flop (169 classes): an input shown to the player with the model’s hash, not an answer (Q-8).

They may **not** grade a decision or be displayed as the correct play, because they fail items 2 and 3 of the [grading gate](#evidence-required-before-grading-a-decision): the cards are bucketed after the flop, and no exploitability has been measured.

The supporting code is worth knowing about but is in Python, so importing it would add a language (A-2): exact river equities by enumeration (`rivermind/bots/cards/equity.py`), suit isomorphism (`cards/iso.py`), the tree compiler that builds betting trees by playing actions through the engine (`blueprint/tree.py`, with the bet-size rules in `abstraction.py`), and the checkpoint manifests that record every input’s hash. FeltPrep should copy three of its **practices** from the start: build every betting tree by playing actions through the engine, so the tree can never disagree with the rules; make every artifact a pure function of its recorded inputs; and refuse to load an artifact whose hashes do not match.

### 4. On-demand solving: nothing to reuse

RiverMind has no on-demand solver. Real-time search is its step P5.8, unchecked, a stretch goal that does not gate its 1.0. Its trainer is external-sampling MCCFR over card buckets, built to train a whole-game blueprint over hours; a study solver needs the opposite, a small exact subgame solved without bucketing in seconds.

FeltPrep therefore builds its solver new (Phases 2 and 5). What carries over is method, not code:

- the Kuhn poker test (`test/engine/blueprint_helpers.py`), which checks a trainer against a game whose answer is known;
- the measurement that batching updates limits how far a strategy can move (“What batching costs” in `docs/bots.md`);
- the finding that scikit-learn’s parallel k-means was not reproducible, as a warning about parallel floating-point sums.

### Evidence required before grading a decision

A reference may grade a player’s decision only when **all** of these are recorded in its manifest and the solution registry. This is the grading gate.

1. **A stated game.** Format, positions, effective stacks, pot, board, both players’ ranges with their source, the bet sizes allowed on each street, and rake (none). The app shows these with every solved spot.
2. **No card abstraction.** Each hand has its own strategy, with only exact suit isomorphism allowed. A bucketed strategy cannot say what one particular hand should do.
3. **Measured exploitability under the threshold** (Q-7), computed by FeltPrep’s best-response evaluator for the stated game, not reported by the solver about itself.
4. **A verified verifier.** The evaluator and the solver pass benchmarks B-1 and B-2 at the commit that produced the artifact.
5. **Agreement with something independent.** A closed form, a published result or an independent solver, for the benchmark that covers this kind of spot (B-3 to B-7).
6. **Sanity invariants hold:** every strategy sums to one; both players’ values add up to the pot; no hand that cannot lose is folded.
7. **Reproducibility.** The manifest records the settings, the seed, the commit and every file’s SHA-256, and a second run from those inputs gives the same bytes.
8. **Both positions tested.** The grading path is exercised from each seat with fixed decisions whose verdicts were derived outside the code.
9. **Per-hand action values checked.** The values a grade uses pass B-11, each hand carries the margin B-12 measured for it, and a hand outside the stated ranges at that decision is not graded.

**Why item 9 is separate from item 3.** Exploitability is one number for the whole strategy, weighted by how often each hand reaches each decision. It can be low while the action values of a rarely held hand are wrong, and a grade is a statement about one hand. So the strategy and the grades are qualified separately:

- **Values are computed, not estimated.** The value of each action for each hand is calculated exactly from the finished strategies by the evaluator. A solver’s running averages are never used for a grade.
- **Values are checked hand by hand** against something derived separately (B-11), including the hands the range holds least often.
- **Close calls are treated as close.** A second, longer solve shows how much each hand’s loss moves (B-12). That movement is the hand’s margin, and a loss within the margin of a band’s boundary gets the kinder band.
- **Out-of-range hands are not graded.** If the player reaches a decision with a hand the spot’s ranges do not contain there, or contain less often than the contract’s minimum, the reference has nothing reliable to say about it. The verdict is “not graded: outside this spot’s ranges”.

A reference that misses any item may still be shown as study material labelled “unverified”, but it grades nothing.

---

## Verification gates

A gate is a fixed set of checks with thresholds. A step that names a gate passes it before the step is ticked, and the evidence line records the results. Lowering a threshold needs the owner.

### Gate A · Legal game actions

No player can take an illegal action, and every legal one is offered with the right amounts.

- [x] **Rules trace.** Every rule kept in `docs/rules.md` has at least one fixture, with expected stacks worked out by hand.
- [x] **Fixtures.** All imported fixtures pass, plus FeltPrep’s own heads-up short-stack fixtures.
- [x] **Properties.** After every action: chips conserved, no negative stack, every offered action applies, every other action is rejected, every hand ends, pots equal contributions.
- [x] **Long fuzz.** At least 100,000 random hands at each seat count from 2 to 9, with no failure. The count of showdowns, side pots and all-ins is recorded, so the run is known to have reached them.
- [x] **Parity at import.** One run of RiverMind’s differential check at the pinned commit shows the imported TypeScript files byte-identical in behaviour to its Python reference. Recorded once in `docs/provenance.md`; after that FeltPrep’s own tests carry the engine.
- [x] **Replay.** Every fixture and a sample of fuzzed hands round-trip through the history format to an identical state.
- [ ] **Interface.** A browser test plays seeded hands and asserts that the action panel offers exactly the engine’s legal actions, with the engine’s minimum and maximum raise, including an all-in for less than a full raise and a spot where raising is not allowed.
- [ ] **Server.** Any endpoint that accepts an action rejects one the engine does not offer, and a test proves it.

### Gate B · Trustworthy feedback on reference spots

A grade is shown only when it is backed by these benchmarks. **Expected values come from outside the code under test.**

| ID | Supports the claim that | Benchmark | Passes when | Expected value from |
| --- | --- | --- | --- | --- |
| B-1 | the solver finds equilibria | Kuhn poker | the first player’s value is within 0.001 of −1/18, and exploitability is at most 0.001 antes | the game’s known solution |
| B-2 | the best-response evaluator is right | fixed strategies in Kuhn poker and in a three-hand river game | its values equal the hand-derived ones to 1e-9 | derivations written in the test |
| B-3 | the solver handles ranges and bet sizes | a river game with a polarized bettor and a bluff-catcher: pot P, bet B | bluffs make up B / (P + 2B) of the betting range and the caller continues P / (P + B) of the time, each within 0.5 percentage points | closed form |
| B-4 | equities are exact | a fixed list of hand-against-hand and hand-against-range cases, with symmetry (the two equities sum to one) | exact agreement with a separately written brute-force enumerator, and with published values to their printed precision | the second enumerator; published values cited in the test |
| B-5 | the jam-or-fold charts are the equilibrium of the stated game | every depth from 2 to 15 big blinds | exploitability at most 0.001 big blinds a hand, and agreement with an independently published chart on every hand class that is not mixed, differences listed | B-2’s evaluator; the published chart, cited |
| B-6 | river solutions are near equilibrium | at least 20 reference river spots | exploitability at most 0.5% of the pot on each | B-2’s evaluator |
| B-7 | the solver is not merely self-consistent | at least 10 of those spots, solved by an independent tool (Q-11) | each player’s value within 0.5% of the pot | the independent tool |
| B-8 | library spots meet the bar | every turn and flop spot in the library | exploitability under the Q-7 threshold, and a second run reproduces every file’s hash | B-2’s evaluator |
| B-9 | grades do not drift | a fixed file of decisions with verdicts derived by hand for B-3 and B-5 spots, from both seats | every verdict and loss matches | derivations in the fixture |
| B-10 | on-demand solving is usable | 95th-percentile time of a reference river solve on the host | under the budget P5.1 sets from measurement (proposal: 5 seconds) | measurement |
| B-11 | each hand’s action values are right, not only the strategy on average | every hand at every graded decision of the B-3 and B-5 spots; for post-flop spots, a sample of hands at each graded decision that includes the hands the range holds least often | agreement with a separately derived value: to 1e-9 for jam-or-fold, where it follows from the equity table and the opponent’s range, and within 0.1% of the pot elsewhere | a closed form; a second, separately written calculation; the independent tool on the B-7 spots |
| B-12 | a verdict near a threshold is not an accident of one solve | each solution solved again with twice the iterations, and a different seed where the solver uses one | no hand’s verdict moves between acceptable and mistake; every hand whose band changes at all is listed; and the change in each hand’s loss is stored as its margin | the second solve |

Rules for this gate:

- **Exploitability qualifies the strategy; B-11 and B-12 qualify the grades.** Neither stands in for the other.
- **No row, no claim.** A statement about accuracy anywhere in the product points at a row here. The first release makes only the claims these rows support.
- **The claim is about the stated game.** “Equilibrium for jam-or-fold at 10 big blinds” is supported by B-5. “The best play at 10 big blinds” is not, because a real player may also limp or raise small, and the lesson says so.
- **Results are recorded** in `docs/benchmarks.md` with the commit, the machine and the command, and each solution’s manifest carries its own exploitability.
- **A failing benchmark blocks grading,** not study: the spot stays visible, labelled “unverified”.

### Gate C · Mobile practice flow

A player can complete the loop on a phone. M1 (P3.7) passes every item except the two that name a later step: on-demand solving, which does not exist until P5.4, and the real-phone pass (P7.2).

- [ ] **Journey.** One browser test goes lesson → study → drill → practice hand → review → back to the lesson, on seeded deals, against the production build.
- [ ] **Sizes and engines.** It passes at 375 × 812 and 360 × 640 with touch, in Chromium, Firefox and WebKit, and at a desktop size.
- [ ] **No sideways scrolling** on any page of the journey at either phone size.
- [ ] **Controls in reach.** While a decision is pending, every action control is fully inside the viewport without scrolling, with the board and the player’s cards visible at the same time.
- [ ] **Targets.** Every action control is at least 44 × 44 CSS pixels (proposal), with at least 8 pixels between neighbouring actions.
- [ ] **Nothing moves under a finger.** Action controls have the same positions before and after the turn arrives, and after feedback appears.
- [ ] **Fast feedback.** A grade from a precomputed spot appears within 200 ms of the tap in Chromium with the processor throttled four times (proposal).
- [ ] **Slow work shows itself** (from P5.4; not part of M1). An on-demand solve shows progress, can be cancelled, and leaves the rest of the page usable while it runs.
- [ ] **Resume.** Reloading mid-drill and mid-hand returns to the same decision.
- [ ] **Accessibility.** No axe-core WCAG 2.2 AA violation on any page of the journey, in both themes, and the journey can be completed with a keyboard.
- [ ] **A real phone.** Before the first release, one pass of the journey on a physical phone is recorded, with the device and browser named. Simulators do not satisfy this item.

---

## Phase overview

- [x] **Phase 1 · Foundation.** A running app on the settled stack and a verified rules engine. *Outcome: a clean clone builds, tests and serves a page, and plays legal hands in a test.*
- [x] **Phase 2 · Reference math.** Exact equities, a verified solver core and the jam-or-fold solution. *Outcome: FeltPrep can grade one family of decisions, with the evidence recorded.*
- [ ] **Phase 3 · The first loop (milestone M1).** One idea taken through lesson, study, drill, practice and review on a phone. *Outcome: a usable trainer for short-stack heads-up play.*
- [ ] **Phase 4 · Production.** The app live on its domain with a repeatable deploy. *Outcome: M1 on `feltprep.com`, tried by a few players.* Host preparation (P4.1, P4.2) needs only P1.1 and the owner, so it may run beside Phases 2 and 3; the first public deploy (P4.3) waits for M1 to pass (P3.7).
- [ ] **Phase 5 · Post-flop solver.** Heads-up subgame solving, a cross-checked spot library and on-demand river solves. *Outcome: study and drills for post-flop spots at 100 big blinds.*
- [ ] **Phase 6 · Full practice and curriculum.** Practice at 100 big blinds, graded review inside library spots, the lesson set and progress. *Outcome: the whole first-release loop.*
- [ ] **Phase 7 · Hardening and the first release.** Accessibility, performance, security, backups and the release checklist. *Outcome: the first release.*

**The first end-to-end milestone is M1, “one spot, end to end”,** the exit of Phase 3: on a phone, a player reads the lesson on jamming or folding heads-up at 10 big blinds, studies the solved chart, drills it with graded feedback, plays full short-stack hands against a practice opponent, and reviews a hand whose pre-flop decision is graded against the same chart.

**M1 is also the pilot.** Once it is live, a few players try it (P4.5). Whether they can use in a full hand what the lesson and drill taught, and whether review points them at the right drill, says more about FeltPrep’s value than the size of the first spot library, so the pilot’s findings shape Phases 5 and 6.

**The first implementation task is [P1.1 · Scaffold the app](#phase-1--foundation).** A fresh agent can start it with no further input.

---

## Phase 1 · Foundation

**Goal.** A SvelteKit app on the settled stack with a full local gate, and RiverMind’s rules engine imported, attributed and verified here.

**Exit criteria**

- [x] A clean clone passes the full gate with one documented command sequence.
- [x] Gate A’s engine items (rules trace, fixtures, properties, long fuzz, parity at import, replay) pass and are recorded.
- [x] `docs/provenance.md` lists every imported file with its source commit and license.

- [x] **P1.1 · Scaffold the app** · Depends on: none
  - [x] `web/` is created with the current `sv create` (SvelteKit 3, TypeScript) and the add-ons Tailwind CSS 4, Drizzle for PostgreSQL, ESLint, Prettier, Vitest, Playwright and `adapter-node`. Current documentation was consulted first, and the result has the SvelteKit 3 layout: configuration in `vite.config.ts`, no `svelte.config.js`.
  - [x] The toolchain is pinned as both reference projects pin it: Node in `web/.node-version` and `engines`, pnpm in `packageManager`, `saveExact` and `engineStrict` in `pnpm-workspace.yaml`, every dependency at an exact version, `pg` as the only database driver, and a committed `pnpm-lock.yaml`. `package.json` names the license, `AGPL-3.0-or-later` (D-9). Use the versions `rivermind-poker/web/package.json` pins on the day (Node 26.13.1 and pnpm 12.18.0 on 2026-11-24).
  - [x] Scripts exist for `dev`, `build`, `start`, `check`, `lint`, `format`, `test`, `e2e`, `db:generate` and `db:migrate`.
  - [x] `GET /healthz` answers 200 with a status and the build’s revision, and the app builds and starts with no database configured.
  - [x] The home page names FeltPrep and says it is in development, in neutral original styling with no asset from another project.
  - [x] Playwright runs against the production build in six projects: Chromium, Firefox and WebKit, each at 1440 × 900 and at 375 × 812 with touch. One smoke test loads the home page in each and asserts that nothing scrolls sideways.
  - [x] `.gitignore` covers dependencies, build output, `.env` files, test reports and `artifacts/`.
  - [x] AGENTS.md sections 6 and 7 and the README’s “Working on the project” describe the real layout and commands.
  - [x] From a clean clone, install with a frozen lockfile, then `check`, `lint`, `test`, `build` and `e2e` all pass.
  - Evidence: the commit that ticks this step. The full gate passed from a clean copy of the tree (5 Vitest tests, 18 Playwright tests in 6 projects), and by hand: the home page at 375 × 812 in both themes via `pnpm run start`, `/healthz` at 200 without a database, 200 with a scratch PostgreSQL 18 database and 503 with an unreachable one, and both `db:` commands on that scratch database; the sv scaffold (MIT) and the dependency license check are in `docs/provenance.md`.

- [x] **P1.2 · Continuous integration** · Depends on: P1.1, and `main` pushed to `origin`
  - [x] A workflow runs the full gate on every push, with the pinned Node and pnpm and the three Playwright browsers.
  - [x] Its first run on `main` is green, and the run is named in the evidence line.
  - Evidence: `.github/workflows/test.yml`, committed in `52edfd7`; its first run, [Test #45454058647](https://github.com/dunamismax/feltprep/actions/runs/45454058647) on `52edfd7`, passed every step of the gate in 1 minute 34 seconds on `ubuntu-latest`. GitHub only: Codeberg runs no CI.

- [x] **P1.3 · Provenance record and license** · Depends on: Q-1 · **Owner gate:** the license
  - [x] The owner’s answer to Q-1 is recorded under Settled decisions, and `LICENSE` holds the chosen license’s unmodified text.
  - [x] `docs/provenance.md` exists with the record format from AGENTS.md section 10, and `licenses/` exists for upstream notices.
  - [x] The README names the license. (`package.json` does not exist yet, so naming it there moved to P1.1.)
  - Evidence: the commit that ticks this step. `LICENSE` is gnu.org’s `agpl-3.0.txt`, 34,523 bytes, SHA-256 `0d96a4ff…079abcb0` (rechecked against gnu.org on 2026-11-27); the documents’ links were rechecked by script. There is no suite to run yet.

- [x] **P1.4 · Import the rules specification and the engine** · Depends on: P1.1, P1.3
  - [x] `docs/rules.md` is imported from RiverMind at a pinned commit, keeping every rule the engine implements and marking table-only rules (joining, button movement with empty seats, timeouts) as not used by FeltPrep.
  - [x] The engine is imported at the same commit: cards, evaluator, state, pots, seating, history, view, the fuzzer, the test helpers, `rules.json` and their specs. The evaluator keeps its Deuces header and `licenses/Deuces.txt` is added.
  - [x] The engine is browser-safe: the secure random source is injected, no engine file imports a Node module, and a browser-mode test deals and plays a hand.
  - [x] Every imported file is listed in `docs/provenance.md` with its source path, commit and license, and what was changed.
  - [x] Commands exist for the long fuzz and the benchmark, and are in AGENTS.md section 7.
  - [x] Gate A’s engine items pass: all imported specs; all 33 fixtures; 100,000 fuzzed hands at each seat count from 2 to 9, with its counts recorded; history round trips; and one parity run against RiverMind’s Python reference at the pinned commit, recorded in `docs/provenance.md`.
  - [x] The benchmark’s result on this Mac is recorded in the evidence line.
  - Evidence: the commit that ticks this step, importing RiverMind `233b9c6` into `web/src/lib/engine/`. Full gate from a clean copy (228 Vitest tests, among them the 33 fixtures and 3 engine tests in Chromium; 18 Playwright tests); `pnpm run engine:parity -- --all-five` byte-identical with RiverMind’s Python on 5,000 hands and every evaluator digest; `pnpm run engine:fuzz` passed 800,000 hands in 274 s, from 63,681 showdowns at 2 seats to 91,261 hands with side pots and 5,487 odd-chip splits at 9 (`docs/benchmarks.md` does not exist yet, so the counts are in the handoff entry); `pnpm run engine:bench -- --hands 5000 --repeats 3` on this Mac (Apple Silicon, Node 26.13.1, load average 37 from other work) gave a median of 64,558, 34,145 and 39,749 hands a second at 2, 6 and 9 seats.

- [x] **P1.5 · Heads-up short-stack fixtures** · Depends on: P1.4
  - [x] At least eight new hand-worked fixtures cover heads-up play at 2 to 15 big blinds: a jam and a fold, a jam and a call with each seat winning, a tied showdown that splits the pot, a call for less than the jam with the excess returned, and both button positions. One more covers a stack shorter than the big blind, below that range.
  - [x] No heads-up fixture expects an odd chip. With two players, returning the uncalled excess (rule 9.1) leaves equal contributions, so the pot is even and a tie splits it exactly. Odd chips (rule 11.2) stay covered by the imported fixtures with three or more seats, and a test asserts that those fixtures are still present and passing.
  - [x] Each fixture’s expected stacks are derived in a comment from the numbered rules, not from engine output.
  - [x] **Gate A’s rules trace.** Every rule kept in `docs/rules.md` has a fixture with hand-worked stacks, and a test maps each rule number to its fixtures, so a rule without one fails. At import (P1.4) these kept rules had no fixture naming them: 1.1 to 1.4, 2.1, 3.1, 4.3, 5.1 to 5.3, 6.1 to 6.3, 6.5, 7.1, 7.3, 7.5 to 7.7, 8.3, 10.1, 10.2 and 12.4. Several have rule tests in `rules.spec.ts` but no fixture; rule 10 has fixtures named “10”.
  - Evidence: the commit that ticks this step. `web/src/lib/engine/fixtures.ts` holds 15 fixtures, each derived in a comment before it was run: 9 heads-up hands at 2 to 15 big blinds (both buttons, each seat winning, a tie, a call for less with the excess returned, jam and fold, a minimum raise that is all-in, a five-high straight) and one below a big blind, then 5 for rules no imported fixture named (one of them a tenth heads-up hand at 10 big blinds); their scripts also assert the exact legal actions at 26 decisions. All matched on the first run, and a deliberately wrong expectation failed. `rules-trace.spec.ts` maps all 42 kept rules to fixtures and fails if one has none (checked by removing one). Full gate from a clean copy: 294 Vitest tests, 18 Playwright tests. The engine did not change, so the long fuzz was not rerun.

## Phase 2 · Reference math

**Goal.** The smallest solver that can be fully trusted, and the contract every later solution follows.

**Exit criteria**

- [x] Benchmarks B-1 to B-5, B-9, B-11 and B-12 pass, and `docs/benchmarks.md` records them.
- [x] The jam-or-fold solution for 2 to 15 big blinds is in the solution registry with a manifest that meets all nine items of the grading gate.

- [x] **P2.1 · Spot, solution and grading contract** · Depends on: P1.1 (it imports nothing)
  - [x] `docs/grading.md` defines a spot (every field of grading-gate item 1), a solution artifact (per-hand action frequencies and values, versioned with a `"format"` field), its manifest, and the solution registry with its hash check.
  - [x] It defines a verdict: the action taken, the reference’s frequencies and values for that hand, the loss, the hand’s margin, the band (Q-7) and the “not graded” case with its reason.
  - [x] It says where a grade’s numbers come from: action values computed exactly from the finished strategies, each hand’s margin (B-12) and how often the range holds the hand at that decision, all stored in the artifact, with the minimum below which a hand is not graded.
  - [x] TypeScript types and a reader that refuses an artifact whose hashes or format do not match, with tests for each refusal.
  - Evidence: the commit that ticks this step. [`docs/grading.md`](docs/grading.md); `web/src/lib/spots/` holds the types, a Web Crypto SHA-256 and `loadSolution`, whose 16 tests load a valid fixture and refuse each of the eight reasons (unknown id, graded entry missing a gate item, manifest hash, file hash or size, missing file, format of registry, manifest or solution, another solution’s files, malformed tables or paths). `minReach` 0.01 is a proposal recorded in each manifest. Full gate: 310 Vitest tests, 24 Playwright tests.

- [x] **P2.2 · Exact equities** · Depends on: P1.4
  - [x] An enumerator gives exact all-in equity for hand against hand, hand against range and range against range, on any board from pre-flop to river, handling shared cards correctly.
  - [x] The pre-flop table of all 169 × 169 class matchups is built by exact enumeration, with each matchup’s number of card combinations, as a reproducible artifact with a manifest. Its build time and memory on this Mac are recorded; if the build is impractical, the measurement is recorded and an alternative proposed (A-8).
  - [x] B-4 passes.
  - Evidence: the commit that ticks this step. `web/src/lib/solver/` (`classes.ts`, `equity.ts`, `preflop-table.ts`); `solutions/equity/` holds the table and its manifest, built by `pnpm run equity:build` in 37 s and 150 MB on one core and rebuilt byte-identical with `-- --check`. B-4 passed ([`docs/benchmarks.md`](docs/benchmarks.md)): exact agreement with Irving and d’Eon’s published exact table on all 14,365 class pairs (imported as a fixture, BSD 3-Clause, `docs/provenance.md`) and with the direct enumerator on six class pairs. Full gate: 341 Vitest tests, 24 Playwright tests.

- [x] **P2.3 · Solver core and best response** · Depends on: P2.1 (its benchmark games need no imported code)
  - [x] A game-tree interface, a CFR solver and an exact best-response evaluator, in plain TypeScript that runs in Node and in Vitest, deterministic for a given seed and settings.
  - [x] B-1, B-2 and B-3 pass, and a command runs the benchmark suite and is in AGENTS.md section 7.
  - [x] `docs/benchmarks.md` exists and records the three results with their commit and command.
  - Evidence: the commit that ticks this step. `web/src/lib/solver/game.ts` (private hands dealt once, then a public betting tree, which covers Kuhn, river games and jam-or-fold), `cfr.ts` (alternating CFR+ with linear averaging, exact best response, exploitability, exact per-type action values) and `benchmark-games.ts`; `pnpm run solver:bench`. B-1: value −0.055556, exploitability 4.4 × 10⁻⁵ antes after 2,000 iterations; B-2: six hand-derived values matched exactly; B-3: four pot and bet sizes within 0.02 points of the closed form ([`docs/benchmarks.md`](docs/benchmarks.md)). The solver draws no random numbers, so it has no seed; two runs give identical strategies (tested). The equity build now marks a dirty tree, and the table’s manifest names `8726459`, the commit holding the code that built it.

- [x] **P2.4 · The jam-or-fold solution** · Depends on: P2.2, P2.3
  - [x] The game is stated in `docs/grading.md`: heads-up, blinds of half and one big blind, no ante; the button jams or folds; the big blind calls or folds; effective stacks from 2 to 15 big blinds in whole steps.
  - [x] The solution for every depth is committed under `solutions/` with a manifest and a registry entry, and a second build reproduces its hashes.
  - [x] B-5 passes, with the published chart it was compared against cited and every difference listed.
  - [x] B-11 and B-12 pass at every depth: each hand class’s value for jamming, folding and calling matches the value derived from the equity table and the opponent’s range, and each class’s margin is stored.
  - [x] The lesson’s caveat is recorded here for P3.2: this is the equilibrium of the jam-or-fold game, and where that simplification weakens as stacks grow.
  - Evidence: the commits that tick this step. `web/src/lib/solver/jam-or-fold.ts`; `solutions/jam-or-fold/` (manifest and solution, 280 KB) and `solutions/registry.json`, built by `pnpm run jof:build` in 63 s and rebuilt byte-identical with `-- --check`. B-5: exploitability 1.0 to 7.2 × 10⁻⁸ bb a hand; against HoldemResources’ published chart, 4,712 pure decisions compared and 6 differ, each a fold by under 0.008 bb, and the chart’s own strategy measures within 8.6 × 10⁻⁵ bb of equilibrium with the same game values (Q-13 for the chart’s terms). B-11: 9,464 stored values equal a separate calculation to 1e-9. B-12: one band change, none between acceptable and mistake. All in [`docs/benchmarks.md`](docs/benchmarks.md). The registry entry is `unverified` until B-9 tests the grading path from both seats (P2.5).
  - **Caveat for P3.2** (also in `docs/grading.md` and every game statement): this is the equilibrium of a simplified game in which the button may only move all-in or fold and the big blind may only call or fold. Real players can also limp or make a smaller raise. Those options matter more the deeper the stacks, so the chart is a sound guide at the shortest stacks and a looser one towards 15 big blinds; how much they are worth is not measured here. A limp or a smaller raise leaves the game and is not graded.

- [x] **P2.5 · Grading** · Depends on: P2.4
  - [x] A pure function turns a spot, a hand and an action into a verdict under the Q-7 bands, and returns “not graded” with a reason when no registered reference covers the decision or the hand is outside the spot’s ranges.
  - [x] A loss within the hand’s margin of a band’s boundary gets the kinder band, and tests cover a hand just inside and just outside each boundary.
  - [x] A function decides whether a decision in a full hand falls inside the jam-or-fold game (stacks, position and prior action), tested from both seats, including hands that leave the game by limping or raising small.
  - [x] B-9 passes.
  - Evidence: the commit that ticks this step. `gradeDecision` and `bandOf` in `web/src/lib/solver/grading.ts`, `locateJamOrFold` in `jam-or-fold-hand.ts`, documented in `docs/grading.md`. `grading.spec.ts` covers each boundary just inside and outside, the margin, the 5% rule and the exploitability floor. B-9 ([`docs/benchmarks.md`](docs/benchmarks.md)): 26 jam-or-fold decisions played as full hands with the button in seat 0 and in seat 1, and 6 river decisions from both seats, every verdict and loss as derived by hand in `b9-decisions.ts`; ten kinds of decision are not graded, with their reasons. With B-9 passed, `jam-or-fold-hu` meets all nine grading-gate items and is `graded` in the registry. Its manifest now names `ced11f4`, the commit whose code built it (the solution’s bytes did not change). Full gate: 455 Vitest tests, 24 Playwright tests.

## Phase 3 · The first loop

**Goal.** Milestone **M1**: one idea through the whole loop on a phone.

**Exit criteria**

- [ ] Gate C’s M1 items pass on the M1 journey: every item except on-demand solving (P5.4) and the real-phone pass (P7.2).
- [ ] Gate A’s interface and server items pass.
- [ ] Every grade shown in the journey comes from the P2.4 solution, and a decision outside it is shown as “not graded”.

- [x] **P3.1 · Design foundation** · Depends on: P1.1, Q-12 (for brand artwork; tokens and code-drawn cards are code)
  - [x] An original identity: colour, type and spacing tokens in the Tailwind theme, light and dark, with text at WCAG AA contrast in both.
  - [x] Original playing cards drawn in code (SVG or CSS), legible at phone size and distinguishable without relying on red and black alone.
  - [x] A `/style` page shows the tokens, the cards and each component as it is added.
  - [x] Nothing is taken from RiverMind’s art, palette, fonts or layouts (D-4); fonts are recorded in `docs/provenance.md`.
  - Evidence: the commit that ticks this step. Tokens in `web/src/app.css`; `theme.spec.ts` measures 37 foreground/background pairs (`contrast.ts`) at 4.5:1 for text and 3:1 for graphics in both themes, and fails on a raw colour in any component. `PlayingCard.svelte` draws a four-colour deck with FeltPrep’s own suit shapes and a back; `/style` shows tokens, contrast measured live, type, spacing and all 52 cards, checked at 375 × 812 in both themes in the browser and by `style.e2e.ts` in six projects (no overflow, no CSP violation, no page error). No font file: system faces, recorded in provenance. No brand artwork (Q-12). Full gate: 467 Vitest tests, 36 Playwright tests.

- [ ] **P3.2 · Lesson pipeline and the first lesson** · Depends on: P3.1, P2.4, Q-12 (before the lesson is committed)
  - [ ] Lessons are Markdown files in `content/lessons/`, prerendered, each with a title, a summary and the IDs of the spots it teaches. A build fails on a lesson that names an unknown spot.
  - [ ] The first lesson, “Jam or fold: heads-up at 10 big blinds”, is original writing. It explains why jamming wins, states the game’s assumptions and limits (P2.4’s caveat), and links to its study view and drill.
  - [ ] It reads well at 375 pixels wide, checked in a browser.

- [ ] **P3.3 · Study view** · Depends on: P3.1, P2.4
  - [ ] A 13 × 13 hand grid shows the reference for the chosen depth and position: each class’s frequency, and its value on selection.
  - [ ] The spot’s stated game, the solution’s measured exploitability and a link to the benchmark are visible on the page.
  - [ ] The grid is usable by touch at 360 pixels wide and by keyboard, and does not rely on colour alone.

- [ ] **P3.4 · Drill** · Depends on: P3.3, P2.5
  - [ ] A drill deals hands for the spot and asks for the decision, with the practice table’s own action controls.
  - [ ] Feedback follows each answer at once: the verdict, the loss in big blinds, the reference’s frequencies, a one-sentence reason and a link to the lesson.
  - [ ] A session ends with a summary, and progress is kept in the browser (Q-4) and survives a reload.
  - [ ] Deals come from a seed in tests, so every browser test plays known hands.

- [ ] **P3.5 · Short-stack practice table** · Depends on: P3.1, P2.5, P1.5
  - [ ] A heads-up table at a chosen depth from 10 to 15 big blinds plays complete hands on the engine against a labelled practice opponent: the reference strategy inside the jam-or-fold game, and the imported rule-based bot (with its provenance entry) elsewhere.
  - [ ] The action panel offers exactly the engine’s legal actions and amounts, and the server rejects anything else (Gate A’s interface and server items).
  - [ ] The button alternates, a finished hand shows who won and why, and a reload returns to the same decision.
  - [ ] Finished hands are stored as versioned hand histories under the guest identity (Q-4), with a Drizzle migration.

- [ ] **P3.6 · Hand review** · Depends on: P3.5
  - [ ] A finished hand can be stepped through from the table, showing only what the player could see until the showdown.
  - [ ] Each of the player’s decisions is marked graded or not graded. A graded one shows its verdict and links to the lesson and the drill for its spot.

- [ ] **P3.7 · M1 journey** · Depends on: P3.2 to P3.6
  - [ ] The Gate C journey test exists and passes in all six browser projects and at 360 × 640.
  - [ ] Every Gate C item that applies at M1 passes, with results in the evidence line: all but on-demand solving (P5.4) and the real-phone pass (P7.2).
  - [ ] The README’s status says what a visitor can now do.

## Phase 4 · Production

**Goal.** M1 live on its domain, deployed the way the host’s other sites are.

**Entry.** P1.1 is done, for host preparation (P4.1 and P4.2). The first public deploy (P4.3) also waits for M1 (P3.7), so the domain’s first release is the milestone that passed its gates. Every step that changes the server or public DNS is an owner gate until Q-10 says otherwise.

**Exit criteria**

- [ ] The canonical domain serves the release commit over HTTPS; the other names redirect to it.
- [ ] `/healthz` reports the deployed commit, a database backup exists, and a redeploy is one documented command sequence.
- [ ] A live smoke test passes against the public site.

- [x] **P4.1 · Host facts** · Depends on: P1.1 · **Owner gate:** server access (given 2026-11-26)
  - [x] The host’s web platform contract (`docs/web-platform.md` in `ubuntu-vm-backup`) has been read, and anything in AGENTS.md or A-1 that differs from it is corrected.
  - [x] Recorded here: the app’s directory, service name, database and role names, and a loopback port confirmed free on the server itself (RiverMind uses 4320 and 4323, C From The Ground Up 4317, and others are taken).
  - [x] The Cloudflare records for both domains are confirmed DNS-only, so Caddy’s automatic HTTPS applies, as C From The Ground Up’s D10 found for its domain; or the difference is recorded with what it changes.

  Evidence: read on the server at `ubuntu-vm-backup` `3a4610f`; nothing in AGENTS.md or A-1 contradicted it, and AGENTS.md section 6 now points at it. Releases `/srv/www/feltprep.com`, `feltprep.service` as `feltprep-web` on `127.0.0.1:4316` (free in `ss -ltn` and every Caddy fragment on 2026-11-26; now in the contract’s port table), database `feltprep` with `feltprep_owner`, `feltprep_migration`, `feltprep_web`, credentials in `/etc/web-apps/feltprep/`. Cloudflare API: `feltprep.com` and `www` are A records, not proxied. `feltprep.app` had no records then; the owner has since made it a Cloudflare redirect (D-11).
- [x] **P4.2 · Deploy files and runbook** · Depends on: P4.1, Q-2 (D-11) — a Caddy fragment for the canonical name and the redirects, a sandboxed systemd unit, database provisioning with separate owner, migration and web roles, a fix-forward deploy with a candidate check, a strict Content Security Policy, and `deploy/README.md`.

  Evidence: `b61c1dc` deployed by hand on 2026-11-26 through every step (dump, 0 of 0 migrations, candidate on 4400, switch, `web-live` on Node 26.13.1, `caddy-apply`, public check); `bin/web-conformance` passes. From outside: `/healthz` names the commit with database `ok`, Let’s Encrypt certificate, `www` answers 301, HTTP 308, unknown path 404, the CSP and security headers present; checked at 375 × 812 in light and dark with no console errors. The e2e CSP test passes in all six projects. The backup registry gained the site (`ubuntu-vm-backup` `9766f4c`), its drill rehearsed against the live release. Continuous deploy (D-10): `feltprep-autodeploy.timer`.
  Redirects: `www.feltprep.com` in the Caddy fragment (301, path kept); `feltprep.app` in Cloudflare (D-11, 301 to the home page). The deploy notes were brought up to date in `1b09b36`, the first hand deploy after the first, on 2026-11-27: `feltprep-autodeploy` held it as designed (it changes `deploy/`) after waiting on CI for `61c39b8`, so both of its untested paths were seen working; `prepare.sh` and `cutover.sh` passed every step, `caddy-apply` reloaded the fragment, and `/healthz` reports `1b09b36` with database `ok`.
  DDNS: since `xrayservice` `8bc2e05` (switched 2026-11-27 00:16 UTC, X-6 there), the host’s Cloudflare DDNS job keeps `feltprep.com` and `www` on the home connection’s address; the 00:20 timer run checked 26 records with nothing to change, and both names answer with the host’s address from 1.1.1.1.
- [ ] **P4.3 · First deploy** · Depends on: P4.2, P3.7 · **Owner gate:** the deploy — the M1 release serves on the domain; the live smoke test and the redirect checks pass. A rehearsal deploy before M1 is the owner’s call and does not tick this step.
- [ ] **P4.4 · Backups and upkeep** · Depends on: P4.3 — a nightly database dump with rotation, and the deploy recorded in **Now**.
- [ ] **P4.5 · M1 pilot** · Depends on: P4.3 · **Needs the owner:** a few players (proposal: three to five) and their agreement to be observed
  - [ ] Each player goes through the M1 journey on their own phone, without help.
  - [ ] Recorded for each, in `docs/pilot-m1.md`, with no names: whether they finished the loop unaided and where they stalled; the share of their graded practice decisions that were acceptable, before and after the lesson and drill; whether review led them to a drill, and to the right one; and what they said they wanted next.
  - [ ] Two questions are answered from that record. Can a player apply in a full practice hand what the lesson and drill taught? Does review tell them what to drill next?
  - [ ] Each finding that calls for a change becomes a step or a criterion in this file. P5.5 (the size and choice of the spot library) and P6.4 (the lesson order) cite the findings.
  - [ ] Nothing beyond what the app already stores is collected, and no third-party tool is added to observe players.

  The pilot does not block the solver work of P5.1 to P5.4, which starts when Phase 2 is complete. It is not a Phase 4 exit criterion, because it waits on people; until it runs, it is listed under **Waiting on the owner** in **Now**.

## Phase 5 · Post-flop solver

**Goal.** Heads-up post-flop spots a player can study and drill, held to Gate B.

**Entry.** Phase 2 is complete.

**Exit criteria**

- [ ] B-6, B-7, B-8 and B-10 pass and are recorded, and B-11 and B-12 pass for every post-flop spot that grades.
- [ ] The spot library is in the registry, and every spot meets the grading gate.
- [ ] Study and drill work for a post-flop spot on a phone: Gate C on an extended journey, now including its on-demand item.

- [ ] **P5.1 · Solver design and measurements** · Depends on: P2.3 — `docs/solver.md`: trees built by playing bet sizes through the engine, per-hand strategies with exact card removal, the CFR variant, and measured time and memory for a reference river, turn and flop solve on this Mac and on the host. Settles Q-6, the library’s size and B-10’s budget.
- [ ] **P5.2 · River solver** · Depends on: P5.1 — B-3 on the full solver, B-6, and B-11 and B-12 on the reference river spots.
- [ ] **P5.3 · Independent cross-check** · Depends on: P5.2, Q-11 — the tool’s license read and recorded, a harness that converts a spot both ways, and B-7.
- [ ] **P5.4 · On-demand river solving** · Depends on: P5.2 — a server endpoint with limits, cancellation and a cache keyed by the spot’s hash; B-10; and Gate C’s on-demand item, in a browser test at phone size.
- [ ] **P5.5 · Turn and flop solving and the spot library** · Depends on: P5.2, Q-8 — offline solves for the library’s flops with manifests and registry entries; range assumptions recorded with their source; B-8, B-11 and B-12. The library’s size and choice of flops cite P5.1’s measurements and the M1 pilot’s findings (P4.5), or say that the pilot has not run.
- [ ] **P5.6 · Study and drill for post-flop spots** · Depends on: P5.5 — the study view for a spot with a board and a range grid per action, drills that start on a library spot, and the journey extended.

## Phase 6 · Full practice and curriculum

**Goal.** The whole first-release loop.

**Entry.** Phase 5 is complete.

**Exit criteria**

- [ ] The curriculum in the first-release scope exists, and every lesson reaches a study view and a drill.
- [ ] A practice hand at 100 big blinds is graded wherever it stays inside a library spot’s tree and is marked “not graded” elsewhere.
- [ ] A graded mistake in review leads to its lesson and drill.

- [ ] **P6.1 · Trained practice opponent** · Depends on: Q-9, P3.5 — RiverMind’s heads-up champion loaded from a bundle checked against its registry hashes, labelled as a practice opponent with its published evaluation linked, memory measured on the host, and a test that its output never reaches the grading path.
- [ ] **P6.2 · Practice at 100 big blinds** · Depends on: P6.1 or the rule-based opponent — free play of complete hands, and spot play that starts a hand on a library spot.
- [ ] **P6.3 · Graded review inside library spots** · Depends on: P5.5, P6.2 — the review follows a hand through a library spot’s tree street by street and stops grading, with the reason shown, when the hand leaves it.
- [ ] **P6.4 · Curriculum** · Depends on: P5.6 — the lesson set, each original, each tied to spots, in a recommended order.
- [ ] **P6.5 · Progress and weak spots** · Depends on: P6.3 — results per spot over time, drills resurfaced by need, and mistakes from practice feeding the drill queue.
- [ ] **P6.6 · Six-seat practice** · Depends on: Q-3, Q-9 — only if both are answered yes; ungraded and labelled so.

## Phase 7 · Hardening and the first release

**Goal.** Everything in the first-release checklist.

- [ ] **P7.1 · Accessibility and performance** — axe-core on every page in both themes, keyboard paths, and page weight and interaction budgets measured on a mid-range phone profile.
- [ ] **P7.2 · Real-phone pass** — Gate C’s last item, on a physical phone, recorded. Needs a device from the owner.
- [ ] **P7.3 · Security review** — headers and Content Security Policy, input validation on every endpoint, rate limits on solving, and dependency advisories.
- [ ] **P7.4 · Provenance and license audit** — every file, font, table and model traced; `docs/provenance.md` complete; notices in place.
- [ ] **P7.5 · Claims audit** — every accuracy statement in the app, the lessons and the README matched to a Gate B row.
- [ ] **P7.6 · Release** · **Owner gate:** the release — the checklist ticked on the release commit, deployed and tagged.

---

## First-release checklist

- [ ] Every lesson links to a study view and a drill, and every graded mistake in review links back to a lesson and a drill.
- [ ] Gate A passes on the release commit.
- [ ] Gate B: every benchmark row passes on the release commit, and `docs/benchmarks.md` records it.
- [ ] Every reference that grades a decision is in the solution registry and meets all nine items of the grading gate.
- [ ] Every decision without a qualified reference is shown as “not graded”, and a test proves no practice opponent’s output reaches a grade.
- [ ] Gate C passes, including the recorded real-phone pass.
- [ ] Every accuracy claim in the app and the README names a Gate B row.
- [ ] The release commit serves on the canonical domain; `/healthz` reports it; a backup exists; a redeploy is documented.
- [ ] `docs/provenance.md` is complete and no asset is of unknown origin.
- [ ] Every open decision the release relied on is either settled or listed in the release notes with the default that shipped.

## After the first release

Ideas that do not gate it. Triage one into a phase, with criteria, when it is picked up.

- Graded 6-max play, which needs a position on what “correct” means when more than two players are in the hand.
- A pre-flop solve at 100 big blinds, which would replace the range assumptions of Q-8.
- On-demand turn and flop solves, node locking and custom bet-size trees.
- Tournaments: antes, changing stack depths and ICM.
- Hand-history import, so a player can review hands played elsewhere.
- Accounts and progress that sync across devices (Q-4).
- Installing as an app and working offline.
- A 9-max practice table.

---

## Handoff format

Every session ends by prepending one entry to the log below, in this shape and in at most 150 words. Keep the newest eight entries and move older ones to `docs/build-history.md`.

```markdown
### YYYY-MM-DD · <step IDs> · <one-line title>

- **Completed:** what now exists, with the commit.
- **Verified:** the commands run and their results, what was checked by hand, and what was not verified.
- **Open decisions:** each `Q-n` touched or raised, with the default used.
- **Next ready task:** the step ID and its first concrete action.
- **Plan changes:** steps split, added or reworded, with the reason. Omit if none.
```

## Handoff log

### 2026-11-26 · P2.1 to P2.5 · Reference math; Phase 2 complete

- **Completed:** the grading contract and reader (`9f46c7a`); exact equities and the pre-flop class table (`8726459`); CFR+ and exact best response (`812e4c2`); the jam-or-fold solution (`ced11f4`); grading, the full-hand locator and B-9, with the solution now graded (the commit that ticks P2.5).
- **Verified:** full gate before each commit (455 Vitest and 24 Playwright tests at P2.5); B-1 to B-5, B-9, B-11, B-12 in `docs/benchmarks.md`; both builds rebuilt byte-identical. Not verified: CI on the last commit at the time of writing; nothing is visible in the app yet. `ced11f4`’s message miscounts B-5 (“4,712 of 4,718”); the record is 4,706 of 4,712.
- **Open decisions:** Q-13 raised (the published chart’s terms; default: keep it out of Git). Q-7’s bands and `minReach` 0.01 used as defaults.
- **Next ready task:** P3.1: theme tokens and code-drawn cards on a `/style` page.

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
