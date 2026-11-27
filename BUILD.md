# FeltPrep build tracker

The authoritative roadmap and progress record for FeltPrep. Start with **Now**, then read [AGENTS.md](AGENTS.md) for how to work. Every step lists its acceptance criteria, and a ticked step carries the evidence that it was met.

**Jump to:** [Now](#now) · [How to work this file](#how-to-work-this-file) · [The first release](#the-first-release) · [Settled decisions](#settled-decisions) · [Open decisions](#open-decisions) · [Architecture proposals](#architecture-proposals) · [RiverMind reuse assessment](#rivermind-reuse-assessment) · [Verification gates](#verification-gates) · [Phase overview](#phase-overview) · [Release checklist](#first-release-checklist) · [Handoff log](#handoff-log)

## Now

Keep every cell to the current state, in at most two sentences. History goes in evidence lines and the handoff log.

| | |
| --- | --- |
| **Current phase** | [Phase 5 · Post-flop solver](#phase-5--post-flop-solver). Phase 3 (M1) is complete: Gate C passes, accessibility and the owner’s iPhone pass included. |
| **Next step** | **P5.2 · River solver**: B-3 through the post-flop builder, then at least 20 reference river spots for B-6, with B-11 and B-12 on them. |
| **In progress** | None. |
| **Background run** | None. |
| **Waiting on the owner** | Nothing. P7.6 (the release) needs their word. |
| **Live** | <https://feltprep.com> serves `main` as a preview, redeployed by every push whose CI passes (D-10); `/healthz` names the live commit. `feltprep.app` redirects to it in Cloudflare (D-11). |
| **`main`** | Phases 1 to 3 (M1), and the post-flop solver core: spots through the engine, chance cards, linear-time showdowns, measured to the flop (P5.1). `origin` pushes to GitHub and Codeberg. |
| **Last updated** | 2026-11-27 |

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
| Graded format | Heads-up only. Two-player zero-sum play is where “how far from equilibrium” has a measurable answer | Settled (D-15) |
| Table sizes for full-hand practice | 2 seats. 6 seats only as ungraded practice, if a six-seat opponent fits on the host | Settled (D-15); 6 seats depend on P6.1’s memory measurement (D-14) |
| Stack depths, graded | 2 to 15 big blinds for the jam-or-fold game; 100 big blinds effective for the post-flop spot library | Proposal |
| Stack depths, practice | A short-stack table at 10 to 15 big blinds and a 100 big blind table | Proposal |
| Solver capability 1 | Exact equities: hand against hand, hand against range, range against range | Proposal |
| Solver capability 2 | The heads-up jam-or-fold equilibrium at each depth from 2 to 15 big blinds, precomputed | Proposal |
| Solver capability 3 | Heads-up post-flop subgame solving for a stated pair of ranges and bet sizes: river spots on demand, turn and flop spots as a precomputed library | Proposal (D-19 for how it is computed) |
| Spot library | One pre-flop line (button opens, big blind calls) on at least 12 flops chosen to cover distinct textures, each solved to the river | Proposal; the count and the choice of flops are set at P5.5 from measured solve cost (P5.1); there is no pilot (D-23) |
| Curriculum | At least 8 lessons, each tied to at least one spot with a study view and a drill | Proposal |
| Practice opponents | A rule-based opponent and a reference-strategy opponent for the jam-or-fold game; RiverMind’s trained heads-up champion at 100 big blinds | Settled (D-14) |
| Devices | Phone first (375 × 812 and 360 × 640), then tablet and desktop, in Chromium, Firefox and WebKit | Proposal |
| Identity | No sign-in. Progress lives in the browser, and a random guest token in a cookie identifies server-stored hands | Settled (D-16) |
| Hosting | The owner’s server behind Caddy, on `feltprep.com`, with `feltprep.app` redirecting to it | Settled (D-3, D-11) |

### Not in the first release

Multiway solving; graded 6-max or 9-max play; a pre-flop solve at 100 big blinds; on-demand flop solves; tournaments, antes and ICM; node locking and custom trees; hand-history import; accounts that sync across devices; other people at the table. Each is listed under [After the first release](#after-the-first-release).

### Definition of done

The first release is done when every item in the [first-release checklist](#first-release-checklist) is ticked. In short:

1. **The loop is whole.** From every lesson a player can reach its spot’s study view and drill. Every graded mistake, wherever it is shown, says what it cost and why, and one tap starts a drill whose first deal is that decision (D-25); the lesson that covers it is linked too.
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
| D-10 | **Live through the build** (owner, 2026-11-26). `feltprep.com` serves `main` from the start of the build, so the owner can review each change in a browser. Every push to `main` whose GitHub Actions run passes deploys itself through `feltprep-autodeploy` on the host, by the contract’s fix-forward flow with a candidate check ([`deploy/README.md`](deploy/README.md)). A commit that changes `deploy/` is held for a hand deploy, which an agent may run under D-13. The preview is not the first public release: P4.3 still waits for M1, and the site sends `noindex` until then. |
| D-11 | **Canonical domain** (owner, 2026-11-27, answering Q-2). `feltprep.com` serves the app and `www.feltprep.com` redirects to it in Caddy. `feltprep.app` is a permanent (301) redirect to `https://feltprep.com/` set up by the owner in Cloudflare: its records are proxied, so it never reaches the host, and neither Caddy nor the host’s DDNS job handles it. Checked 2026-11-27: http and https both answer 301; the redirect drops the path, and `www.feltprep.app` has no record. Both are the owner’s Cloudflare settings to change if wanted. |
| D-9 | **License** (owner, 2026-11-24, answering Q-1). FeltPrep’s code is licensed under the GNU Affero General Public License, version 3 or later (`AGPL-3.0-or-later`), so that anyone who runs a modified FeltPrep as a service must offer its source. GPL-3.0 code, RiverMind’s included, may be combined with it under section 13 of both licenses and stays under the GPL. The terms for lesson text and for the name and artwork are Q-12. |
| D-12 | **Content and brand terms** (owner, 2026-11-26, answering Q-12). Lesson text in `content/lessons/` is licensed under Creative Commons Attribution-ShareAlike 4.0 International (`CC-BY-SA-4.0`), stated in the repository and on every lesson page. The FeltPrep name, logo and brand artwork are reserved (all rights reserved) and covered by neither the AGPL nor the CC license. Theme tokens and code-drawn cards are code, under D-9. Lessons may now be committed; brand artwork may be committed once it is marked as reserved. |
| D-13 | **Agents run FeltPrep’s own host pieces** (owner, 2026-11-26, answering Q-10). Without asking each time, an agent may do anything to what FeltPrep owns on the host, under the web platform contract: hand deploys (`prepare.sh` and `cutover.sh`, including a commit that `feltprep-autodeploy` held for changing `deploy/`), FeltPrep’s account, database, roles and credentials, its systemd units and timer, and its Caddy fragment. The owner’s word is still needed for other sites, anything the host’s sites share (the contract’s scripts, the main Caddy configuration, other repositories such as `ubuntu-vm-backup`), DNS, Cloudflare, and anything that creates an account or costs money. Each such change is recorded in the step’s evidence line. |
| D-14 | **Trained practice opponent** (owner, 2026-11-26, answering Q-9). RiverMind’s heads-up champion `hu-m1-s0-1024m` is served at P6.1 after its memory is measured on the host (about 450 MB). The six-seat champion only if that measurement leaves room. Never for grading. |
| D-15 | **Formats** (owner, 2026-11-26, answering Q-3). Heads-up is the only graded format. Six-seat practice ships, labelled ungraded, only if a six-seat opponent fits on the host (D-14). No 9-max. |
| D-16 | **No sign-in** (owner, 2026-11-26, answering Q-4). The first release is guest-only, as built at P3.4 and P3.5b: drill progress in browser storage and a random guest token in an HTTP-only cookie, stored as its SHA-256, for server-stored hands. Syncing across devices stays after the release. |
| D-17 | **Free** (owner, 2026-11-26, answering Q-5). The first release is free, with no payments, donations, ads or third-party trackers. |
| D-18 | **Range assumptions** (owner, 2026-11-26, answering Q-8). Post-flop spots use starting ranges written for FeltPrep, recorded with their reasoning and shown to the player as assumptions; a grade is conditional on the ranges shown. RiverMind’s champion does not supply them. |
| D-19 | **Solver core** (owner, 2026-11-26, answering Q-6). The post-flop solver starts in TypeScript on Node. If P5.1 measures that a solve cannot reach its Gate B threshold inside the budget, an agent may add a Rust core compiled to WebAssembly without asking again: its toolchain pinned exactly, its dependencies license-checked like any import (AGENTS.md section 10), and the measurement that justified it recorded in `docs/solver.md`. An offline Python solver is not pre-approved. |
| D-20 | **Grading thresholds** (owner, 2026-11-26, answering Q-7). Exploitability at most 0.5% of the starting pot for a precomputed post-flop spot, 1% for an on-demand river solve, and 0.001 big blinds per hand for jam-or-fold. An action is **acceptable** if the reference plays it at least 5% of the time with that hand or it loses at most **0.5%** of the pot; an **inaccuracy** up to **3%**; a **mistake** above that. A loss smaller than the reference’s own exploitability is never shown as a mistake, and a loss within that hand’s recorded margin of a band’s boundary (B-12) gets the kinder band. These bands are stricter than the default the jam-or-fold solution was built with (1% and 5%); P3.8 applies them. |
| D-21 | **Independent cross-check tool** (owner, 2026-11-26, answering Q-11). B-7 uses an open-source solver chosen at P5.3 after reading its own license file, with its version recorded. It runs as an external program; none of its code enters the repository. No commercial tool, account or purchase. |
| D-22 | **The published chart stays out** (owner, 2026-11-26, answering Q-13). HoldemResources’ push/fold chart and its unsimplified data are neither committed nor downloaded. B-5 stands on the five cited values and the hand-made comparison outside the repository; the six differences stay recorded as they are. |
| D-23 | **No M1 pilot** (owner, 2026-11-26). P4.5 is dropped. The spot library’s size and choice of flops (P5.5) and the lesson order (P6.4) rest on measurement and the plan’s own reasoning, and say so. |
| D-24 | **Devices and the second domain** (owner, 2026-11-26). Gate C’s real-phone pass (P7.2) is run by the owner on an iPhone in Safari. The `feltprep.app` redirect stays as it is: to the home page, without the path, and no `www.feltprep.app`. |
| D-25 | **The path after a mistake is the product’s spine** (owner, 2026-11-26, from a review of the idea). FeltPrep is built around what happens when a graded decision loses: the player sees at once what it cost, reads a plain-English reason taken from the reference’s own numbers, and with one tap starts a drill of that same spot whose first deal is the decision they got wrong. Its best angle is how quickly a player on a phone goes from “why was that a mistake?” to practising the decision again, so that path is measured in taps and time (Gate C) and its explanations are held to a benchmark (B-13). Where two pieces of work compete, the one that shortens or strengthens this path comes first. |
| D-26 | **Agents choose imports** (owner, 2026-11-27, answering Q-14). FeltPrep is for the owner’s own use. Agents may add any dependency, tool or data they need, under any license whose terms they have read, without asking: each is still recorded in `docs/provenance.md` (source, version, license, where its notice is kept) in the same commit, and anything that ships to the browser or the server must be compatible with distributing FeltPrep under the AGPL. Nothing of unknown origin or with no license is imported. axe-core (MPL-2.0) is approved for Gate C’s accessibility check. |
| D-27 | **Heavy compute needs no asking** (owner, 2026-11-27). Agents may run the post-flop solver and any other long build on every core of the development Mac whenever they need to, still naming it under **Background run** in **Now** with the command that resumes it. |
| D-28 | **The real-phone pass** (owner, 2026-11-27). The owner tested FeltPrep on an iPhone and reported that everything works. This is the real-phone pass of Gate C and P7.2, as of `43f656a` (the browser was not named in the report; D-24 names Safari). The site stays `noindex` and unshared: going public (P4.3’s owner gate) is not wanted. |

## Open decisions

Use each default until the owner decides otherwise. **Needed by** names the first step that relies on the answer. The owner answered Q-1 to Q-13 on 2026-11-26 and Q-14 on 2026-11-27; a new one is added here with a default.

| ID | Question | Default until decided | Needed by |
| --- | --- | --- | --- |
| Q-1 | **License.** RiverMind is GPL-3.0-or-later; C From The Ground Up is MIT. Which license does FeltPrep carry? | **Decided** (D-9): AGPL-3.0-or-later. | — |
| Q-2 | **Canonical domain.** Which of `feltprep.com` and `feltprep.app` serves the app? | **Decided** (D-11): `feltprep.com`. | — |
| Q-3 | **Formats in the first release.** Is heads-up the only graded format, and does 6-max full-hand practice ship ungraded? | **Decided** (D-15): heads-up graded; ungraded six-seat practice only if a six-seat opponent fits. | — |
| Q-4 | **Accounts.** Guest-only, or sign-in to keep progress across devices? | **Decided** (D-16): guest only, as built. | — |
| Q-5 | **Business model.** Free, paid or mixed? | **Decided** (D-17): free, with no payments, ads or trackers. | — |
| Q-6 | **Solver compute.** Is the solver core TypeScript on Node, as the settled stack suggests, or does it need a faster core or Python offline? | **Decided** (D-19): TypeScript first; a Rust/WebAssembly core pre-approved if P5.1 measures a shortfall. | — |
| Q-7 | **Grading thresholds.** How close to equilibrium must a reference be, and how large a loss counts as a mistake? | **Decided** (D-20): acceptable up to 0.5% of the pot, inaccuracy up to 3%, exploitability thresholds unchanged. | P3.8 |
| Q-8 | **Range assumptions for post-flop spots.** A post-flop solve needs both players’ starting ranges, and the first release does not solve pre-flop at 100 big blinds. Where do they come from? | **Decided** (D-18): ranges written for FeltPrep, shown as assumptions. | — |
| Q-9 | **RiverMind’s trained champions as practice opponents.** Serve them from FeltPrep? | **Decided** (D-14): the heads-up champion at P6.1; six-seat only if memory allows. | — |
| Q-10 | **Server setup.** May agents provision the host (database, roles, units, Caddy fragment) without asking each time, as RiverMind’s D-10 allows there? | **Decided** (D-13): agents run everything FeltPrep owns on the host; shared host pieces, DNS and Cloudflare still need the owner. | — |
| Q-11 | **Independent solver for cross-checks.** Which tool, under which license? | **Decided** (D-21): an open-source tool, license read at P5.3. | — |
| Q-12 | **Terms for lesson text, and for the FeltPrep name and artwork.** D-9 covers the code. Are lessons and brand assets under the same license, a content license, or reserved? | **Decided** (D-12): lessons CC BY-SA 4.0; name and artwork reserved. | — |
| Q-13 | **The published jam-or-fold chart.** B-5 compares FeltPrep’s solution with HoldemResources’ heads-up push/fold chart (<https://www.holdemresources.net/hune>), whose page names no license. May the chart, or the unsimplified equilibrium data the page offers for download, be kept in the repository or downloaded for the comparison? | **Decided** (D-22): the chart stays out, and its data is not downloaded. | — |
| Q-14 | **An accessibility checker.** May axe-core and `@axe-core/playwright` (MPL-2.0) be added as test-only dependencies? | **Decided** (D-26): yes; agents choose imports and record them. | — |

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
| Trained models (`artifacts/models/`, ignored by Git) | Produced by RiverMind’s own training runs; every file’s SHA-256 is in `docs/models.json` | Usable as practice opponents (D-14), verified against the registry. No third-party model is involved. |

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
| Trained six-seat opponent | `web/src/lib/server/bots/multiway.ts`; `artifacts/models/6max-s1-s0-3600m/` | The six-seat champion, served at RiverMind’s tables of 3 to 6. Both champions together hold 1.6 GB in RiverMind’s web service. | Only if the host has room after the heads-up champion (D-14, D-15). | As above. |
| Evaluation harness | `rivermind/bots/match.py` (Python) | Duplicate, seat-rotated matches with 95% intervals, reproducible from a seed whatever the worker count. | Not needed unless FeltPrep trains or ranks opponents. A good design to copy if it ever does. | — |

**What these are evidence for, and what they are not.** RiverMind’s promotion gate asks that a champion beats the heuristic and the calling station with a 95% interval above zero. That shows the champion is a much better opponent than a simple bot. It does not measure distance from equilibrium: the only exploitability figure in RiverMind is on Kuhn poker, where its trainer reaches 0.011 chips a hand (`docs/bots.md`, “Correctness”). The champion also plays an abstraction: 1,000 card buckets a street after the flop, so different hands share one strategy; a fixed set of bet sizes, with other bets mapped onto them at random; and two stack depths. RiverMind’s own design names tiny bets as a known way to probe it and real-time search (its P5.8, unstarted) as the fix.

### 3. Precomputed strategies: not a grading reference

RiverMind’s precomputed strategies are the two champions above. For FeltPrep they may serve as:

- a **practice opponent**, labelled as one (D-14);
- possibly a **source of range assumptions** for heads-up post-flop spots, since the heads-up abstraction is lossless before the flop (169 classes): an input shown to the player with the model’s hash, not an answer. The owner chose ranges written for FeltPrep instead (D-18).

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
3. **Measured exploitability under the threshold** (D-20), computed by FeltPrep’s best-response evaluator for the stated game, not reported by the solver about itself.
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
- [x] **Interface.** A browser test plays seeded hands and asserts that the action panel offers exactly the engine’s legal actions, with the engine’s minimum and maximum raise, including an all-in for less than a full raise and a spot where raising is not allowed. Passed at P3.5a: `practice.e2e.ts` in six browser projects, seeded practice hands checked against the engine at every decision, and the engine-built examples on `/style`.
- [x] **Server.** Any endpoint that accepts an action rejects one the engine does not offer, and a test proves it. Passed at P3.5b: `POST /api/hands` is the only such endpoint; `upload.spec.ts` and `practice.e2e.ts` send a raise past the stack, a check facing a bet and an action after the end, each refused with 422.

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
| B-7 | the solver is not merely self-consistent | at least 10 of those spots, solved by an independent open-source tool (D-21) | each player’s value within 0.5% of the pot | the independent tool |
| B-8 | library spots meet the bar | every turn and flop spot in the library | exploitability under the D-20 threshold, and a second run reproduces every file’s hash | B-2’s evaluator |
| B-9 | grades do not drift | a fixed file of decisions with verdicts derived by hand for B-3 and B-5 spots, from both seats | every verdict and loss matches | derivations in the fixture |
| B-10 | on-demand solving is usable | 95th-percentile time of a reference river solve on the host | under the budget P5.1 sets from measurement (proposal: 5 seconds) | measurement |
| B-11 | each hand’s action values are right, not only the strategy on average | every hand at every graded decision of the B-3 and B-5 spots; for post-flop spots, a sample of hands at each graded decision that includes the hands the range holds least often | agreement with a separately derived value: to 1e-9 for jam-or-fold, where it follows from the equity table and the opponent’s range, and within 0.1% of the pot elsewhere | a closed form; a second, separately written calculation; the independent tool on the B-7 spots |
| B-12 | a verdict near a threshold is not an accident of one solve | each solution solved again with twice the iterations, and a different seed where the solver uses one | no hand’s verdict moves between acceptable and mistake; every hand whose band changes at all is listed; and the change in each hand’s loss is stored as its margin | the second solve |
| B-13 | the explanation of a grade is true | every hand class at every graded decision of the B-5 spots, from both seats, for every action; later, every graded decision of each library spot | each number an explanation states (the opponent’s calling or folding frequency, the hand’s equity when called, the equity a call needs, each action’s value, the loss) equals a separately written calculation from the equity table and the reference’s ranges, to the precision printed; and no explanation contradicts its verdict, checked by a rule on the wording (a mistake is never called “the play”, a mixed hand is never called a mistake) | a second calculation written in the test, separate from the explanation code |

Rules for this gate:

- **Exploitability qualifies the strategy; B-11 and B-12 qualify the grades.** Neither stands in for the other.
- **No row, no claim.** A statement about accuracy anywhere in the product points at a row here. The first release makes only the claims these rows support.
- **The claim is about the stated game.** “Equilibrium for jam-or-fold at 10 big blinds” is supported by B-5. “The best play at 10 big blinds” is not, because a real player may also limp or raise small, and the lesson says so.
- **Results are recorded** in `docs/benchmarks.md` with the commit, the machine and the command, and each solution’s manifest carries its own exploitability.
- **A failing benchmark blocks grading,** not study: the spot stays visible, labelled “unverified”.

### Gate C · Mobile practice flow

A player can complete the loop on a phone. M1 (P3.7) passes every item except the two that name a later step: on-demand solving, which does not exist until P5.4, and the real-phone pass (P7.2).

- [x] **Journey.** One browser test goes lesson → study → drill → practice hand → a mistake drilled from the table → review → back to the lesson, on seeded deals, against the production build.
- [x] **Sizes and engines.** It passes at 375 × 812 and 360 × 640 with touch, in Chromium, Firefox and WebKit, and at a desktop size.
- [x] **No sideways scrolling** on any page of the journey at either phone size.
- [x] **Controls in reach.** While a decision is pending, every action control is fully inside the viewport without scrolling, with the board and the player’s cards visible at the same time.
- [x] **Targets.** Every action control is at least 44 × 44 CSS pixels (proposal), with at least 8 pixels between neighbouring actions.
- [x] **Nothing moves under a finger.** Action controls have the same positions before and after the turn arrives, and after feedback appears.
- [x] **Fast feedback.** A grade from a precomputed spot appears within 200 ms of the tap in Chromium with the processor throttled four times (proposal).
- [x] **Mistake to drill** (D-25). Wherever a graded mistake or inaccuracy is shown (drill feedback, the end of a practice hand, review), its cost and explanation are visible without another tap, and one tap on “Drill this spot” starts a drill whose first deal is that decision: the same depth, seat and hole cards. From the end of a hand that is at most one tap (proposal).
- [x] **Mistake to drill is quick** (D-25). From the tap on “Drill this spot” to that first deal accepting an answer takes at most 1 second in Chromium with the processor throttled four times (proposal), and one more tap after the drill returns the player to the table at their next hand.
- [ ] **Slow work shows itself** (from P5.4; not part of M1). An on-demand solve shows progress, can be cancelled, and leaves the rest of the page usable while it runs.
- [x] **Resume.** Reloading mid-drill and mid-hand returns to the same decision.
- [x] **Accessibility.** No axe-core WCAG 2.2 AA violation on any page of the journey, in both themes, and the journey can be completed with a keyboard.
- [x] **A real phone.** Before the first release, one pass of the journey on a physical phone is recorded, with the device and browser named. Simulators do not satisfy this item.

Results at P3.7 (`web/e2e/journey.e2e.ts`, with `mistake.e2e.ts`, `review.e2e.ts`, `drill.e2e.ts` and `practice.e2e.ts`): the journey passes in Chromium, Firefox and WebKit at 1440 × 900, at 375 × 812 with touch and at 360 × 640; no page of it scrolls sideways; at every decision the four controls are inside the viewport, at least 44 × 44 and 8 pixels apart, with the cards (and at the table the board) fully visible, and they do not move when feedback or the result appears; in Chromium at 4× throttling a grade appeared 46 to 52 ms after the tap and the drill of a mistake accepted an answer 80 to 166 ms after it; reloads mid-drill and mid-hand return to the same decision. Accessibility (P3.7, `a11y.e2e.ts`): axe-core 4.14.1 finds no WCAG 2.2 AA violation on any page of the journey in either theme in all six projects, in each state a player meets (deciding, a raise being sized, feedback, a hand’s result, a drill of one spot, a review), and the keyboard alone opens the lesson, folds, drills the mistake, answers, moves on and sizes a raise (Escape closes the sheet). Real phone: the owner’s iPhone pass of 2026-11-27 (D-28).

---

## Phase overview

- [x] **Phase 1 · Foundation.** A running app on the settled stack and a verified rules engine. *Outcome: a clean clone builds, tests and serves a page, and plays legal hands in a test.*
- [x] **Phase 2 · Reference math.** Exact equities, a verified solver core and the jam-or-fold solution. *Outcome: FeltPrep can grade one family of decisions, with the evidence recorded.*
- [x] **Phase 3 · The first loop (milestone M1).** One idea taken through lesson, study, drill, practice and review on a phone. *Outcome: a usable trainer for short-stack heads-up play.*
- [ ] **Phase 4 · Production.** The app live on its domain with a repeatable deploy. *Outcome: M1 on `feltprep.com`, tried by a few players.* Host preparation (P4.1, P4.2) needs only P1.1 and the owner, so it may run beside Phases 2 and 3; the first public deploy (P4.3) waits for M1 to pass (P3.7).
- [ ] **Phase 5 · Post-flop solver.** Heads-up subgame solving, a cross-checked spot library and on-demand river solves. *Outcome: study and drills for post-flop spots at 100 big blinds.*
- [ ] **Phase 6 · Full practice and curriculum.** Practice at 100 big blinds, graded review inside library spots, the lesson set and progress. *Outcome: the whole first-release loop.*
- [ ] **Phase 7 · Hardening and the first release.** Accessibility, performance, security, backups and the release checklist. *Outcome: the first release.*

**The first end-to-end milestone is M1, “one spot, end to end”,** the exit of Phase 3: on a phone, a player reads the lesson on jamming or folding heads-up at 10 big blinds, studies the solved chart, drills it with graded feedback, plays full short-stack hands against a practice opponent, takes a mistake from the table straight into a drill of that decision, and reviews a hand whose pre-flop decision is graded against the same chart. The mistake-to-drill path (D-25) is the part of M1 that matters most.

**There is no M1 pilot** (D-23). The plan once had a few players try M1 (P4.5). Whether they can use in a full hand what the lesson and drill taught, and whether review points them at the right drill, says more about FeltPrep’s value than the size of the first spot library, so the pilot’s findings shape Phases 5 and 6.

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

- [x] Gate C’s M1 items pass on the M1 journey: every item except on-demand solving (P5.4) and the real-phone pass (P7.2).
- [x] Gate A’s interface and server items pass.
- [x] Every grade shown in the journey comes from the P2.4 solution, and a decision outside it is shown as “not graded”.
- [x] Every graded mistake in the journey shows its cost and a plain-English reason, and one tap drills that decision (D-25, Gate C’s two mistake-to-drill items, B-13).

- [x] **P3.1 · Design foundation** · Depends on: P1.1, D-12 (for brand artwork; tokens and code-drawn cards are code)
  - [x] An original identity: colour, type and spacing tokens in the Tailwind theme, light and dark, with text at WCAG AA contrast in both.
  - [x] Original playing cards drawn in code (SVG or CSS), legible at phone size and distinguishable without relying on red and black alone.
  - [x] A `/style` page shows the tokens, the cards and each component as it is added.
  - [x] Nothing is taken from RiverMind’s art, palette, fonts or layouts (D-4); fonts are recorded in `docs/provenance.md`.
  - Evidence: the commit that ticks this step. Tokens in `web/src/app.css`; `theme.spec.ts` measures 37 foreground/background pairs (`contrast.ts`) at 4.5:1 for text and 3:1 for graphics in both themes, and fails on a raw colour in any component. `PlayingCard.svelte` draws a four-colour deck with FeltPrep’s own suit shapes and a back; `/style` shows tokens, contrast measured live, type, spacing and all 52 cards, checked at 375 × 812 in both themes in the browser and by `style.e2e.ts` in six projects (no overflow, no CSP violation, no page error). No font file: system faces, recorded in provenance. No brand artwork (Q-12). Full gate: 467 Vitest tests, 36 Playwright tests.

- [x] **P3.2 · Lesson pipeline and the first lesson** · Depends on: P3.1, P2.4, D-12
  - [x] The lesson text’s license, CC BY-SA 4.0 (D-12), is stated in `content/`, recorded in `docs/provenance.md`, and shown on every lesson page with a link to the license.
  - [x] Lessons are Markdown files in `content/lessons/`, prerendered, each with a title, a summary and the IDs of the spots it teaches. A build fails on a lesson that names an unknown spot.
  - [x] The first lesson, “Jam or fold: heads-up at 10 big blinds”, is original writing. It explains why jamming wins, states the game’s assumptions and limits (P2.4’s caveat), and links to its study view and drill.
  - [x] It reads well at 375 pixels wide, checked in a browser.
  - Evidence: the commit that ticks this step. `content/README.md` states the license; `content/lessons/jam-or-fold-10bb.md` is read by FeltPrep’s own Markdown subset (`web/src/lib/lessons/markdown.ts`, rendered as elements, never HTML, so no package and no CSP change) and `lessons.ts`, which refuses an unknown spot, header field or markup; `/learn` and `/learn/[lesson]` are prerendered. Changing the lesson’s spot to `jof-40bb-button` failed `pnpm run build` with `LessonRefused`. Every number in the lesson was read from the 10 bb solution and the equity table. Drill feedback and a practice mistake link to the lesson for their spot; the home page leads to it. `lessons.spec.ts` (8 tests) and `learn.e2e.ts` in six projects (both themes, width, CSP, license link, study and drill links, 404, the links back from feedback); read at 375 × 812 in both themes. Full gate: see P3.4’s line.

- [x] **P3.3 · Study view** · Depends on: P3.1, P2.4
  - [x] A 13 × 13 hand grid shows the reference for the chosen depth and position: each class’s frequency, and its value on selection.
  - [x] The spot’s stated game, the solution’s measured exploitability and a link to the benchmark are visible on the page.
  - [x] The grid is usable by touch at 360 pixels wide and by keyboard, and does not rely on colour alone.
  - Evidence: the commit that ticks this step. `/study/jam-or-fold/[stack]`, prerendered at 2 to 15 big blinds from the solution bundled by `web/src/lib/server/solutions.ts`, whose reader checks every hash in the build (a changed byte in `solution.json` failed `pnpm run build` with `SolutionRefused`); `sliceSolution` grades every hand and action exactly as the whole solution does at all 14 depths (tested). Each cell fills from the bottom by frequency, so the strategy reads from height, not hue; arrow keys move with one tab stop; `#big-blind` links the other seat. `study.e2e.ts` checks the cells against `solution.json`, tap, keyboard, seat, depth links and a 404 outside the game, in six projects; looked at 360 × 640 in both themes. Full gate: 491 Vitest tests, 66 Playwright tests.

- [x] **P3.4 · Drill** · Depends on: P3.3, P2.5
  - [x] A drill deals hands for the spot and asks for the decision, with the practice table’s own action controls.
  - [x] Feedback follows each answer at once: the verdict, the loss in big blinds, the reference’s frequencies, a one-sentence reason and a link to the lesson.
  - [x] A session ends with a summary, and progress is kept in the browser (Q-4) and survives a reload.
  - [x] Deals come from a seed in tests, so every browser test plays known hands.
  - Evidence: the commit that adds `/drill/jam-or-fold/[stack]`. Each deal is a real engine hand stopped at the decision (`web/src/lib/drill/jam-or-fold.ts`), from both engine seats, graded through `locateJamOrFold` and `gradeDecision` as a full hand will be; a limp or smaller raise is “not graded”. `ActionPanel.svelte` (shared with P3.5) shows only what `legalActions` allows, checked over 300 random hands. Session and per-depth progress in local storage (`session.ts`), restored after a reload to the same decision or its feedback; `?seed=` fixes the deals. `drill.e2e.ts` in six projects: a 20-decision session answered from `solution.json` is all acceptable, a clear mistake shows its loss, limp and small raise not graded, reload, and controls at least 44 px, 8 px apart, in the viewport and unmoved by feedback. Full gate: 518 Vitest tests, 96 Playwright tests.
  - Completed with P3.2: the feedback links to the lesson for its spot (“Read the lesson”, where one exists: at 10 big blinds now), checked in `learn.e2e.ts`; since P3.9 the reason is `explain`’s, checked by B-13. Full gate at that commit: 563 Vitest tests, 174 Playwright tests.

- [x] **P3.5 · Short-stack practice table** · Depends on: P3.1, P2.5, P1.5. Split on 2026-11-26 into P3.5a (the table in the browser) and P3.5b (stored hands and the server’s check), because the table and its opponent can be built and verified with no database while storage needs a migration and a guest identity. P3.5 is ticked when both are.
  - [x] **P3.5a · The table in the browser**
    - [x] A heads-up table at a chosen depth from 10 to 15 big blinds plays complete hands on the engine against a labelled practice opponent: the reference strategy inside the jam-or-fold game, and the imported rule-based bot (with its provenance entry) elsewhere.
    - [x] The action panel offers exactly the engine’s legal actions and amounts (Gate A’s interface item).
    - [x] The button alternates, a finished hand shows who won and why, and a reload returns to the same decision.
    - Evidence: the commit that adds `/practice/[stack]`. `web/src/lib/practice/`: `table.ts` replays each hand from the session’s seed and the player’s actions, grading each decision through the drill’s `gradeAction`; `opponent.ts` draws the reference’s frequencies inside the game (within 0.015 of a mixed hand’s frequency over 20,000 draws) and hands over to `heuristic.ts`, imported from RiverMind `233b9c6` (`docs/provenance.md`), elsewhere. Unit tests play 300 hands from both seats with chips conserved and every stored history replaying to the same result. `practice.e2e.ts` in six projects replays the seeded session in Node and checks the panel against `legalActions` at every decision (enabled places, call and all-in amounts, the raise sheet’s minimum and maximum), and the three engine-built examples on `/style` (opening, raising not allowed, all-in for less than a full raise); also the outcome sentence, hidden cards without a showdown, the alternating button and a reload mid-hand. Looked at 375 × 812 in the browser through a limped hand to showdown. Full gate: 529 Vitest tests, 114 Playwright tests.
  - [x] **P3.5b · Stored hands** · Depends on: P3.5a, Q-4
    - [x] Finished hands are stored as versioned hand histories under the guest identity (Q-4), with a Drizzle migration.
    - [x] The endpoint that stores a hand replays it on the engine and rejects any action the engine does not offer, and a test proves it (Gate A’s server item).
    - Evidence: the commit that ticks this step. `POST /api/hands` checks each upload with `checkUpload` (`web/src/lib/practice/upload.ts`), which replays the history on the engine: an illegal action, an unfinished hand or a deal the table does not make gets 422, a malformed one 400, an oversized one 413, all before any database is touched. `web/drizzle/0000_guests_and_practice_hands.sql` adds `app.guests` and `app.practice_hands` (UUID keys, no sequences); `web/src/lib/server/hands.ts` stores each hand once per guest and key. The guest identity is a random 32-byte token in an HTTP-only, SameSite=Lax cookie, Secure over https, stored only as its SHA-256: Q-4’s default asked for a signed cookie, and an unguessable token needs no signing secret, so no server change was needed. Checked: `upload.spec.ts`; `hands.spec.ts` against a scratch PostgreSQL 18 with `TEST_DATABASE_URL` (stored once, duplicates ignored, guests apart, no raw token kept; skipped in CI); the migration applied twice; `practice.e2e.ts` posts tampered hands to the built server in six projects; and the production build with a database stored hands played in the browser (201, cookie set, rows replay). Not verified: storage on the host, which needs the deploy’s migration. Full gate: 535 Vitest tests, 120 Playwright tests.

- [x] **P3.6 · Hand review** · Depends on: P3.5, P3.9
  - [x] A finished hand can be stepped through from the table, showing only what the player could see until the showdown.
  - [x] Each of the player’s decisions is marked graded or not graded. A graded one shows its verdict, its cost and P3.9’s explanation, with P3.9’s “Drill this spot” for that decision and a link to the lesson for its spot.
  - Evidence: the commit that ticks this step. `/practice/[stack]/review?hand=N`, prerendered at 10 to 15 big blinds, reads the practice session from local storage; `reviewSteps` (`web/src/lib/practice/review.ts`) replays the stored history and grades each of the player’s actions again through `gradeAction`, so the verdicts equal the table’s (tested over 80 hands from both seats). “Review this hand” at the end of a hand closes it and opens the review, which starts on the first inaccuracy or mistake; the opponent’s cards stay face down until the last step of a showdown. `review.e2e.ts` in six projects: review from the table, the mistake’s band, cost, reason, drill and lesson in view, hidden cards until the showdown with five board cards, the drill opening on the same cards, the table at the next hand, an empty review and a 404. Looked at 375 × 812 in both themes. Full gate: 565 Vitest tests, 198 Playwright tests.

- [x] **P3.8 · The owner’s grading bands** · Depends on: P2.5, D-20. Added 2026-11-26: the owner set stricter bands than the default the solution was built with.
  - [x] The grading settings in `web/src/lib/solver/grading.ts` are D-20’s (acceptable loss 0.5% of the pot, inaccuracy up to 3%; the 5% frequency and `minReach` unchanged), and `grading.spec.ts` checks a hand just inside and just outside each new boundary.
  - [x] The jam-or-fold solution is rebuilt with `pnpm run jof:build`, so its manifest records the new bands and its registry hash changes; B-12’s list of hands whose band moves between solves and their margins are re-recorded, and no hand moves between acceptable and mistake.
  - [x] B-9’s fixture verdicts are re-derived by hand under the new bands, with each changed verdict’s derivation in its comment, and pass.
  - [x] `docs/grading.md` and `docs/benchmarks.md` describe the new bands, and the drill and practice table show them: a decision that is now an inaccuracy or a mistake is checked in a browser test and on the live site after the deploy.
  - Evidence: `7686e28` (the grader and its tests) and the commit that records this, whose manifest names `7686e28`. `jof:build` on a clean tree: the solution’s bytes are unchanged (SHA-256 `95db8be4…`), the manifest records 0.005 and 0.03, the registry hash is now `51b65c74…`; B-12 under D-20 has one band change (3 bb, big blind folding 62s: inaccuracy then mistake at the 3% boundary) and none between acceptable and mistake. Under the new bands 68 decisions move from acceptable to inaccuracy and 299 from inaccuracy to mistake. B-9: every verdict stands; the 72o bound is now 0.0075 bb. `drill.e2e.ts` grades folding Q7o (Inaccuracy) and jamming Q5o (Mistake) at 10 bb, each between the old and new boundaries, in six projects. Full gate: 535 Vitest tests, 132 Playwright tests.
  Live: `1042709` deployed itself once CI passed; on feltprep.com, `/drill/jam-or-fold/10?seed=9&seat=button` deals Q7o, and folding it shows “Inaccuracy” (it was acceptable under the old bands).

- [x] **P3.9 · From a mistake straight to its drill** · Depends on: P3.4, P3.5, P3.8. Added 2026-11-26 for D-25: the path after a mistake is the product’s spine, and today it stops short (the table defers grades to review, the drill’s reason gives values without saying why, and a drill cannot start on a chosen decision).
  - [x] **Why, in plain English.** One function, plain TypeScript beside `grading.ts`, turns a verdict and its spot into at most two short sentences a newcomer can follow, every number in them taken from the reference: for a jam, how often the opponent calls, the hand’s equity when called and what the jam wins when they fold; for a fold, what folding keeps against what jamming would have won; for a call or fold facing a jam, the equity the call needs against the hand’s equity against the jamming range. A mixed hand says the reference mixes and why that is fine; a hand not graded says why. Terms such as equity are explained the first time they appear in a session. B-13 passes and is recorded in `docs/benchmarks.md`.
  - [x] **One wording everywhere.** Drill feedback, the end of a practice hand and review (P3.6) show the same explanation from the same function, and nothing else invents a reason.
  - [x] **The cost at the table.** When a practice hand ends, each of the player’s graded decisions shows its verdict and its cost in big blinds in the result panel at once, not only in review; a mistake or an inaccuracy also shows its explanation and a “Drill this spot” control. An ungraded decision says “not graded” and why.
  - [x] **Drill this spot.** The control opens the drill at that depth and seat with that exact decision (same hole cards) as its first deal, then a short targeted set (proposal: 10 deals, half from hand classes next to it in the grid whose best action differs, half at random), seeded so a test plays known deals. The link carries only the spot, the seat and the cards, never anything about the player.
  - [x] **Back to the table.** The targeted drill’s summary says whether the player now gets that spot right and returns to the practice table at their next hand in one tap; its answers count in that depth’s progress.
  - [x] Gate C’s two mistake-to-drill items pass in all six browser projects, and the path is looked at on a phone size in both themes.
  - Evidence: the commit that ticks this step. `explain` in `web/src/lib/solver/explain.ts` writes every reason, from the verdict and three facts per class computed from the equity table (checked against the hash the solution’s manifest records) and the solution’s frequencies; the drill’s old `reason` is gone. B-13 passed on all 9,464 explanations (`explain.spec.ts`, [`docs/benchmarks.md`](docs/benchmarks.md)), and a planted error failed it. The practice table’s result shows each graded decision’s band and cost, and for an inaccuracy or mistake the explanation and “Drill this spot”, which closes the hand and opens `/drill/jam-or-fold/<stack>?seat=…&cards=…&from=practice`: deal 0 is that decision, then nearest classes whose best action differs alternating with random hands (`targetedPlan`), 10 in all; the summary says whether the spot is now right and leads back to the table at the next hand. The drill offers the same from its own feedback. `mistake.e2e.ts` in six projects: cost and reason at once, the button in view and 44 px tall, one tap to the same cards, 99 ms to an enabled first deal in Chromium at 4× throttling (budget 1 s), back to hand 2 in one tap, reloads, and “not graded” with its reason after a limp. Looked at 375 × 812 in both themes. Full gate: 555 Vitest tests, 150 Playwright tests. Review (P3.6) is still to call `explain` and offer the drill; Gate C’s two items are ticked with the journey at P3.7.

- [x] **P3.7 · M1 journey** · Depends on: P3.2 to P3.6, P3.8, P3.9
  - [x] The Gate C journey test exists and passes in all six browser projects and at 360 × 640.
  - [x] Every Gate C item that applies at M1 passes, with results in the evidence line: all but on-demand solving (P5.4) and the real-phone pass (P7.2).
  - [x] The README’s status says what a visitor can now do.
  - Evidence: the commit that adds `web/e2e/journey.e2e.ts`: lesson, study, drill, a seeded practice hand, its mistake drilled in one tap, back to the table, review and back to the lesson, in six projects and again at 360 × 640 (12 runs); Gate C’s results are recorded under the gate. The practice table gained a “Review” link in its header. Full gate: 565 Vitest tests, 210 Playwright tests. CI’s first run failed at 360 × 640: with Linux fonts the “choose size” sublabel wrapped and the buttons shrank by 6 px once disabled, so each action place now has a fixed 64 px height, checked by forcing the wrap at 300 px wide.
  - Accessibility, after D-26 allowed axe-core: the commit that adds `web/e2e/a11y.e2e.ts`. It found three real problems, now fixed: the study grid’s cells were named differently from their visible text (now named by text inside the button), the board had a label but no role (now a group), and in WebKit focus stayed on a disabled action button after a decision (the panel now lets it go). The raise sheet also closes with Escape. Full gate: 565 Vitest tests, 228 Playwright tests.

## Phase 4 · Production

**Goal.** M1 live on its domain, deployed the way the host’s other sites are.

**Entry.** P1.1 is done, for host preparation (P4.1 and P4.2). The first public deploy (P4.3) also waits for M1 (P3.7), so the domain’s first release is the milestone that passed its gates. Changes to what FeltPrep owns on the host are the agent’s to make (D-13); public DNS, Cloudflare and the host’s shared pieces stay owner gates.

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
- [ ] **P4.3 · First deploy** · Depends on: P4.2, P3.7 · **Owner gate:** going public (dropping `noindex`); D-13 covers the deploy itself — the M1 release serves on the domain; the live smoke test and the redirect checks pass. A rehearsal deploy before M1 is the owner’s call and does not tick this step.
- [ ] **P4.4 · Backups and upkeep** · Depends on: P4.3 — a nightly database dump with rotation, and the deploy recorded in **Now**.
- [ ] ~~**P4.5 · M1 pilot**~~ · **Dropped by the owner** on 2026-11-26 (D-23). Its ID is kept so that older entries still resolve.

## Phase 5 · Post-flop solver

**Goal.** Heads-up post-flop spots a player can study and drill, held to Gate B.

**Entry.** Phase 2 is complete.

**Exit criteria**

- [ ] B-6, B-7, B-8 and B-10 pass and are recorded, and B-11 and B-12 pass for every post-flop spot that grades.
- [ ] The spot library is in the registry, and every spot meets the grading gate.
- [ ] Study and drill work for a post-flop spot on a phone: Gate C on an extended journey, now including its on-demand item.

- [x] **P5.1 · Solver design and measurements** · Depends on: P2.3 — `docs/solver.md`: trees built by playing bet sizes through the engine, per-hand strategies with exact card removal, the CFR variant, and measured time and memory for a reference river, turn and flop solve on this Mac and on the host. Sets the library’s size and B-10’s budget, and whether D-19’s Rust/WebAssembly core is needed. Criteria written 2026-11-27, when Phase 5 opened:
  - [x] `docs/solver.md` states the design: a post-flop spot (board, pot, stacks, both ranges as weighted two-card combinations, the bet and raise sizes per street, as fractions of the pot), the tree, the card removal, the showdown evaluation, the CFR variant and its stopping rule, and how values for grading are computed (B-11).
  - [x] **Trees through the engine.** A builder turns a spot into a game whose every action and amount is one the engine offers at that point (a size the engine would refuse is clamped to its minimum or all-in, and duplicates merged), checked by replaying every path of a reference tree on the engine.
  - [x] **Exact card removal.** Each player’s types are the combinations of their range that do not touch the board; a pair of combinations sharing a card has zero weight, and a test checks the prior against a separate enumeration.
  - [x] **A reference river spot** is stated in `docs/solver.md` (100 big blinds effective, a single-raised pot, ranges written for FeltPrep, two bet sizes and one raise) and solved with the CFR+ core; time and peak memory to reach 1% and 0.5% of the pot in exploitability are recorded on this Mac. The host’s measurement moved to P5.1b (2026-11-27), since it waits on the owner.
  - [x] **Turn and flop.** Public chance cards are added to the game model, checked against a small game solved by hand, and a reference turn and a reference flop spot are solved, or their cost measured on enough of the tree to extrapolate, with the method stated.
  - [x] **Decisions recorded** from the measurements: B-10’s budget, the library’s size and flops (P5.5), and whether the Rust/WebAssembly core of D-19 is needed.
  - Evidence (first part): the commit that adds `docs/solver.md`. `buildRiver` (`web/src/lib/solver/postflop.ts`) sets up the spot on the engine and offers only the engine’s actions at the stated sizes; `postflop.spec.ts` replays every path of a reference tree on the engine, checks clamping and merging, the prior against a separate count with card removal and weights, and fold and showdown payoffs against the engine’s chips. Showdowns share one win matrix scaled per terminal (`Terminal.scale` in `game.ts`); `jof:build -- --check` still gives identical bytes. The reference river (693 × 503 combinations, 24 decisions) reached 1% of the pot in 6.1 s and 0.5% in 9.7 s on one core of this Mac, peak 182 MB (`node scripts/postflop-measure.ts`). Full gate: 572 Vitest tests, 228 Playwright tests.
  - Evidence (second part): `7c92f0c`. Folds and showdowns now cost one pass over each range with a per-card correction for card removal, checked against the plain sum over pairs (`removal.spec.ts`) and against the whole river game written with a matrix of who wins (`postflop.spec.ts`); chance nodes deal the turn and river, checked against a turn counted by hand (34 rivers to 10), separate enumerations of every runout on a turn and a flop, and an all-in on the turn. The reference river now reaches 1% in 0.3 s and 0.5% in 0.4 s at the same iteration counts as before; the reference turn 1% in 196 s and 0.5% in 308 s, peak 1.06 GB; the reference flop needs 111 GB of solver state, and a flop with one bet size and all-in (6.2 GB) costs 12 s an iteration. `jof:build -- --check` gives identical bytes. Full gate: 589 Vitest tests, 228 Playwright tests.
  - Evidence (third part): the commit that ticks P5.1. The reference flop as stated was counted, not solved: 2.9 million decisions, 111 GB of solver state. The flop solved instead has one bet size and all-in, at most two a street (170,528 decisions, 6.2 GB): 1% of the pot after 400 iterations, 72 minutes on one core, 10 to 12 GB; 0.5% extrapolated from its own curve to about 710 iterations, 2.1 hours. Decisions in `docs/solver.md`: B-10’s budget stays at 5 s; no Rust core now (the flop is bound by memory, not by the language); a library of 12 flops of that shape, solved from the flop to the river. Full gate as in the second part; only documents changed.
- [x] **P5.1b · The river on the host** · Depends on: P5.1, the owner’s Tailscale sign-in check for SSH — `node scripts/postflop-measure.ts` run on the host from a scratch export of `main`, with `nice -n 19`, and its times to 1% and 0.5% and peak memory recorded in `docs/solver.md` beside this Mac’s. Split from P5.1 on 2026-11-27 because SSH now asks for a check only the owner can pass; P5.4 measures B-10 on the host as well.
  - Evidence: the commit that ticks P5.1b. On the host (Ryzen 7 5800H VM, 8 cores, 15 GB, load 0.2), from a scratch export of `beec55c` under `/tmp`, removed afterwards: 1% of the pot in 0.4 s, 0.5% in 0.7 s, peak 111 MB, the same in two runs; about 1.6 times this Mac’s time, with identical exploitability at every check. Recorded in `docs/solver.md`.
- [ ] **P5.2 · River solver** · Depends on: P5.1 — B-3 on the full solver, B-6, and B-11 and B-12 on the reference river spots.
- [ ] **P5.3 · Independent cross-check** · Depends on: P5.2, D-21 — the tool’s license read and recorded, a harness that converts a spot both ways, and B-7.
- [ ] **P5.4 · On-demand river solving** · Depends on: P5.2 — a server endpoint with limits, cancellation and a cache keyed by the spot’s hash; B-10; and Gate C’s on-demand item, in a browser test at phone size.
- [ ] **P5.5 · Turn and flop solving and the spot library** · Depends on: P5.2, D-18 — offline solves for the library’s flops with manifests and registry entries; range assumptions recorded with their source; B-8, B-11 and B-12. The library’s size and choice of flops cite P5.1’s measurements; there is no pilot to cite (D-23).
- [ ] **P5.6 · Study and drill for post-flop spots** · Depends on: P5.5 — the study view for a spot with a board and a range grid per action, drills that start on a library spot (including “Drill this spot” from a post-flop mistake, D-25), and the journey extended.

## Phase 6 · Full practice and curriculum

**Goal.** The whole first-release loop.

**Entry.** Phase 5 is complete.

**Exit criteria**

- [ ] The curriculum in the first-release scope exists, and every lesson reaches a study view and a drill.
- [ ] A practice hand at 100 big blinds is graded wherever it stays inside a library spot’s tree and is marked “not graded” elsewhere.
- [ ] A graded mistake in review leads to its lesson and drill.

- [ ] **P6.1 · Trained practice opponent** · Depends on: D-14, P3.5 — RiverMind’s heads-up champion loaded from a bundle checked against its registry hashes, labelled as a practice opponent with its published evaluation linked, memory measured on the host, and a test that its output never reaches the grading path.
- [ ] **P6.2 · Practice at 100 big blinds** · Depends on: P6.1 or the rule-based opponent — free play of complete hands, and spot play that starts a hand on a library spot.
- [ ] **P6.3 · Graded review inside library spots** · Depends on: P5.5, P6.2 — the review follows a hand through a library spot’s tree street by street and stops grading, with the reason shown, when the hand leaves it. Each graded post-flop mistake shows its cost and an explanation from that node’s values, with B-13 extended to the library spots, and one tap drills that node (D-25).
- [ ] **P6.4 · Curriculum** · Depends on: P5.6 — the lesson set, each original, each tied to spots, in a recommended order.
- [ ] **P6.5 · Progress and weak spots** · Depends on: P6.3 — results per spot over time, drills resurfaced by need, and mistakes from practice feeding the drill queue.
- [ ] **P6.6 · Six-seat practice** · Depends on: P6.1 — only if P6.1’s measurement leaves room for a six-seat opponent (D-14, D-15); ungraded and labelled so.

## Phase 7 · Hardening and the first release

**Goal.** Everything in the first-release checklist.

- [ ] **P7.1 · Accessibility and performance** — axe-core on every page in both themes, keyboard paths, and page weight and interaction budgets measured on a mid-range phone profile.
- [x] **P7.2 · Real-phone pass** — Gate C’s last item, on a physical phone, recorded. The owner runs it on an iPhone in Safari (D-24).
  - Evidence: the owner tested everything on an iPhone and reported that it works (2026-11-27, D-28), with `43f656a` live. Repeat before the release if the flows change much.
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
- A pre-flop solve at 100 big blinds, which would replace the range assumptions of D-18.
- On-demand turn and flop solves, node locking and custom bet-size trees.
- Tournaments: antes, changing stack depths and ICM.
- Hand-history import, so a player can review hands played elsewhere.
- Accounts and progress that sync across devices (D-16).
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

### 2026-11-27 · P5.1 · Chance cards, linear showdowns, river to flop measured

- **Completed:** linear-time folds and showdowns (`removal.ts`), chance cards for turn and flop, a one-player CFR+ pass (`7c92f0c`); flop measured, decisions recorded, P5.1 ticked and P5.1b split off (the commit that ticks P5.1).
- **Verified:** full gate (589 Vitest, 228 Playwright); `jof:build -- --check` identical; river 1% in 0.3 s (was 6.1 s), turn 196 s, small flop 72 min; `7c92f0c` live on `/healthz`. P5.1b then done on the host after the owner passed the Tailscale check: river 1% in 0.4 s.
- **Open decisions:** none. D-19: no Rust core now; the owner asked about rewriting the server in Rust, answered in chat (no gain; the flop is memory-bound).
- **Next ready task:** P5.2: build B-3’s polarized river game through `buildRiver` and compare with the closed form.
- **Plan changes:** P5.1b split from P5.1 for the host measurement, then done the same day.

### 2026-11-27 · Decisions, P3.7, P7.2 · M1 complete

- **Completed:** D-26 (agents choose imports), D-27 (heavy compute allowed), D-28 (the owner’s iPhone pass; stay unshared); axe-core added and `a11y.e2e.ts`, which found and led to fixes for three accessibility faults; Gate C, P3.7, P7.2 and Phase 3 ticked (the commit that adds `a11y.e2e.ts`).
- **Verified:** full gate; axe in both themes on every journey page in six projects; the keyboard path, WebKit included.
- **Open decisions:** none.
- **Next ready task:** P5.1: draft `docs/solver.md` and time a reference river solve with the CFR+ core in `web/src/lib/solver/cfr.ts`.

### 2026-11-26 · P3.6, P3.7 · Hand review; the M1 journey

- **Completed:** review of a finished hand from the table (`27c62a0`); `journey.e2e.ts`, the whole M1 journey, with Gate C’s measurable items ticked (the commit that adds it).
- **Verified:** full gate; the journey in six projects and at 360 × 640; 46–52 ms to a grade and 80–166 ms to a drilled mistake in Chromium at 4× throttling; review looked at on a phone in both themes. Not verified: accessibility (Q-14), a real phone (P7.2).
- **Open decisions:** Q-14 raised (axe-core is MPL-2.0); default: not added, P3.7 stays open.
- **Next ready task:** P5.1: write `docs/solver.md` and time a reference river solve with the existing CFR+ core.

### 2026-11-26 · P3.2, P3.4 · The first lesson; the drill complete

- **Completed:** the lesson pipeline (a strict Markdown subset, no new package), `/learn` and the lesson “Jam or fold: heads-up at 10 big blinds” under CC BY-SA 4.0; links to it from drill feedback, practice mistakes and the home page, which completes P3.4 (the commit that ticks P3.2).
- **Verified:** full gate; an unknown spot fails the build; every number in the lesson read from the solution; read on a phone in both themes.
- **Open decisions:** none.
- **Next ready task:** P3.6: a `/review` page that replays the last `FinishedHand` from the practice session in local storage.

### 2026-11-26 · P3.8, P3.9 · The owner’s bands; from a mistake straight to its drill

- **Completed:** D-20’s bands in the grader (`7686e28`) and the rebuilt manifest (`1042709`); `explain` with B-13, grades with cost and reason at the end of a practice hand, and “Drill this spot” into a 10-deal drill of that decision with a way back (the commit that ticks P3.9).
- **Verified:** full gate before each push (555 Vitest, 150 Playwright at the end); `jof:build` on a clean tree, bytes unchanged; B-9, B-12, B-13 recorded; P3.8 checked on feltprep.com; the path looked at on a phone in both themes, 99 ms from tap to deal at 4× throttling. Not verified: review, which does not exist yet.
- **Open decisions:** none.
- **Next ready task:** P3.2: create `content/lessons/` with its CC BY-SA notice and a Markdown loader that fails the build on an unknown spot.

### 2026-11-26 · Decisions · Every open question answered; the mistake-to-drill path made the spine

- **Completed:** Q-3 to Q-13 settled as D-12 to D-22, plus D-23 (no M1 pilot; P4.5 dropped) and D-24 (iPhone for P7.2; the `feltprep.app` redirect stays). AGENTS.md, the README and `docs/provenance.md` follow.
- **Verified:** full gate; no code changed; IDs checked by search.
- **Open decisions:** none left. D-12 unblocks P3.2; D-13 lets agents run hand deploys; D-20’s stricter bands are not yet applied.
- **Next ready task:** P3.8: set D-20’s bands in `grading.ts` and rebuild the solution with `pnpm run jof:build`; then P3.9.
- **Plan changes:** P3.8 added; D-25 (from the owner’s review of the idea) adds P3.9 (cost, plain-English reason and one-tap drill of a mistake), B-13 (explanations are true) and two Gate C items; P3.6 and P3.7 depend on P3.9; P3.2 gains a license criterion; P4.5 dropped; P6.6 depends on P6.1’s measurement.

### 2026-11-26 · P3.1, P3.3, P3.4, P3.5 · Study, drill and practice on a phone

- **Completed:** theme and cards (`cd8293a`), study view (`7f5e000`), drill (`c0b1394`), practice table with RiverMind’s heuristic imported (`4e59ed9`), stored hands (the commit that ticks P3.5b). Gate A complete.
- **Verified:** full gate before each commit (535 Vitest, 120 Playwright at the end); every page looked at on a phone size in both themes; DB tests against a scratch PostgreSQL 18; a damaged solution fails the build. Not verified: storage on the host until the migration deploys.
- **Open decisions:** Q-4 default used, with an unsigned random token instead of a signed cookie (no secret needed). Q-12 still holds P3.2 and P3.4’s lesson link.
- **Next ready task:** P3.6: a review page that replays a `FinishedHand` from local storage.
- **Plan changes:** P3.5 split into P3.5a and P3.5b.

### 2026-11-26 · P2.1 to P2.5 · Reference math; Phase 2 complete

- **Completed:** the grading contract and reader (`9f46c7a`); exact equities and the pre-flop class table (`8726459`); CFR+ and exact best response (`812e4c2`); the jam-or-fold solution (`ced11f4`); grading, the full-hand locator and B-9, with the solution now graded (the commit that ticks P2.5).
- **Verified:** full gate before each commit (455 Vitest and 24 Playwright tests at P2.5); B-1 to B-5, B-9, B-11, B-12 in `docs/benchmarks.md`; both builds rebuilt byte-identical. Not verified: CI on the last commit at the time of writing; nothing is visible in the app yet. `ced11f4`’s message miscounts B-5 (“4,712 of 4,718”); the record is 4,706 of 4,712.
- **Open decisions:** Q-13 raised (the published chart’s terms; default: keep it out of Git). Q-7’s bands and `minReach` 0.01 used as defaults.
- **Next ready task:** P3.1: theme tokens and code-drawn cards on a `/style` page.
