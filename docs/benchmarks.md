# Benchmark results

The record of every Gate B benchmark run ([BUILD.md](../BUILD.md#gate-b--trustworthy-feedback-on-reference-spots)): what was checked, against what, the result, the commit, the machine and the command. Expected values always come from outside the code under test. Newest results first within each row; a benchmark that fails blocks grading, not study.

**Machine** unless stated otherwise: the development Mac, Apple M5, 10 cores, 32 GB, Node 26.13.1.

## B-1 · The solver finds equilibria (Kuhn poker)

**Passed** at the commit that ticks P2.3 (2026-11-26): `pnpm run solver:bench`, and in the full gate (`web/src/lib/solver/cfr.spec.ts`).

- 2,000 iterations of alternating CFR+ with linear averaging, in 10 ms: player 0’s value −0.055556 against the known −1/18 (Kuhn’s closed-form solution), and exploitability 4.4 × 10⁻⁵ antes, against thresholds of 0.001 for both. Two runs give identical strategies.

## B-2 · The best-response evaluator is right

**Passed** at the commit that ticks P2.3 (2026-11-26), same commands.

- Six values derived by hand in `cfr.spec.ts`: Kuhn poker where both players only check and call (value 0; each best response gains 1/3), and a three-hand river game with fixed mixed strategies (value 0.3125; best responses 0.5 for the bettor and −0.25 for the caller). Every computed value equals its derivation to within 1e-12 (largest error printed: 0). The evaluator also returns exactly −1/18 and +1/18 at Kuhn’s published equilibrium with α = 0, so nobody gains by deviating from it.

## B-3 · The solver handles ranges and bet sizes

**Passed** at the commit that ticks P2.3 (2026-11-26), same commands.

- A bettor with three nut hands and three air hands against two bluff-catchers, 4,000 CFR+ iterations each. Closed form: bluffs make up B / (P + 2B) of the bets and the caller continues P / (P + B) of the time.

| Pot | Bet | Bluffs, solved | Closed form | Calls, solved | Closed form | Exploitability (of the pot) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.5 | 25.00% | 25.00% | 66.68% | 66.67% | 1.5 × 10⁻⁵ |
| 1 | 1 | 33.35% | 33.33% | 50.02% | 50.00% | 1.5 × 10⁻⁴ |
| 1 | 2 | 40.00% | 40.00% | 33.32% | 33.33% | 3.1 × 10⁻⁵ |
| 3 | 1 | 20.00% | 20.00% | 75.01% | 75.00% | 1.4 × 10⁻⁵ |

Every difference is under the 0.5-point threshold.

## B-4 · Equities are exact

**Passed** at the commit that ticks P2.2 (2026-11-26), in the full gate (`pnpm run test`, `web/src/lib/solver/preflop-table.spec.ts` and `equity.spec.ts`).

- **Against a published exact table.** FeltPrep’s pre-flop class table (`solutions/equity/preflop-classes.json`) agrees exactly, as rational numbers, with every win, loss and tie fraction of all 14,365 class pairs in Geoffrey Irving and Eugene d’Eon’s `exact.txt` ([`girving/poker`](https://github.com/girving/poker) at `06fa71d`, BSD 3-Clause; [provenance](provenance.md)), computed by their own enumerator. Their printed decimals, such as AA against KK winning 0.817147, are reproduced to their printed precision.
- **Against a separately written enumerator.** For AA–KK, AKs–QQ, AKo–AKs, 72o–AA, T9s–22 and KQo–JTo, every pair of combinations was enumerated over all 1,712,304 boards by `equity.ts`’s direct enumerator (one pair per suit relabelling, weighted by its count); the counts equal the table’s.
- **Symmetry.** For every ordered class pair, the two sides’ wins and losses mirror each other, ties are equal and the equities sum to one.
- **Hand-worked cases.** On the turn 2c 7d 9h Ks, AsAd wins 40 and loses 4 of the 44 rivers against QhJh (only a ten makes the straight); a royal flush on the board ties.
- **Reproducibility.** `pnpm run equity:build -- --check` rebuilt the table with identical bytes (SHA-256 `c3ca25d5…a34790ad`). The build visits 134,459 boards (one per suit relabelling of the 2,598,960) and took 37.0 seconds and 150 MB on one core.

## B-5 · The jam-or-fold charts are the equilibrium of the stated game

**Passed** at the commit that ticks P2.4 (2026-11-26), with six differences from the published chart listed below. Commands: `pnpm run jof:build` (exploitability at every depth), the full gate (`web/src/lib/solver/jam-or-fold.spec.ts` re-measures each stored strategy) and `node scripts/jam-or-fold-compare.ts --chart <file>`.

- **Exploitability**, measured by FeltPrep’s best-response evaluator (B-2) on the stored, rounded strategies, after 10,000 CFR+ iterations at each depth. Threshold: 0.001 big blinds per hand.

| Stack (bb) | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exploitability (10⁻⁸ bb a hand) | 2.3 | 7.0 | 1.0 | 5.2 | 2.6 | 6.2 | 7.2 | 2.7 | 2.9 | 4.1 | 1.7 | 2.4 | 2.7 | 4.5 |
| Button’s value (bb a hand) | 0.009549 | 0.051592 | 0.066031 | 0.056201 | 0.038159 | 0.016863 | −0.004137 | −0.025227 | −0.045371 | −0.064661 | −0.082529 | −0.099021 | −0.113821 | −0.127227 |

- **The published chart.** HoldemResources, “HeadsUp Push/Fold Nash Equilibrium”, no ante (<https://www.holdemresources.net/hune>, read 2026-11-26), which says it was computed independently in 2007. For each hand it gives the largest stack at which the hand jams (or calls), with gaps for 63s, 53s and 43s. The page names no license, so the chart is not in the repository (AGENTS.md section 10): the comparison script reads a hand-made copy kept outside it, and the full gate checks five of its values, cited in the test. Comparing every depth and class where FeltPrep’s strategy is pure (it plays the action at least 99% or at most 1% of the time): **4,712 decisions compared, 20 mixed ones left out, 6 differ**, all on the button, all where FeltPrep folds and the chart jams:

| Stack | Hand | FeltPrep’s jam frequency | FeltPrep’s value of jamming minus folding (bb) |
| --- | --- | --- | --- |
| 4 | 53s | 0.00% | −0.0077 |
| 6 | 94s | 0.03% | −0.0039 |
| 6 | 63s | 0.96% | −0.0007 |
| 8 | 84s | 0.02% | −0.0015 |
| 8 | 43s | 0.00% | −0.0028 |
| 9 | 84s | 0.01% | −0.0014 |

  Each is a fold by less than 0.008 big blinds. Under Q-7’s first default (1% of the 1.5 big blind pot) jamming was *acceptable* in all six; under D-20’s 0.5% it is acceptable in five, and jamming 53s at 4 big blinds (0.0077 bb, 0.51% of the pot) is an *inaccuracy* by 0.01 points. They are gaps in FeltPrep’s solution: 84s jams at 7 and 10 big blinds and folds at 8 and 9; 43s jams at 5, 7 and 9 and folds at 8; 94s jams at 5 and folds from 6. The chart describes itself as simplified, with most mixed and gapped detail left out, which accounts for these. A second, independent check agrees: **the chart’s own strategy, measured by FeltPrep’s evaluator, is within 8.6 × 10⁻⁵ big blinds a hand of equilibrium at every depth** (0 at 2 and 12 big blinds), and its game values equal FeltPrep’s to within 10⁻⁴ (−0.04537 against −0.045371 at 10 big blinds). Two separately computed solutions of the same game therefore agree on its value and on every decision that matters by more than 0.008 big blinds.

## B-9 · Grades do not drift

**Passed** at the commit that ticks P2.5 (2026-11-26), and again under D-20’s bands at the commit that ticks P3.8, in the full gate (`web/src/lib/solver/grading-b9.spec.ts`, decisions in `b9-decisions.ts`). Re-derived under D-20, every verdict stands: each loss is 0 or at least the whole pot, except the 72o fold, whose bound is now 0.5% of the pot (0.0075 bb).

- **Jam-or-fold, both seats, both seat numbers.** At 2, 10 and 15 big blinds: the button folding AA (a mistake, losing at least 1.5 big blinds, the whole pot) and jamming it (acceptable, no loss); the big blind folding AA to a jam (a mistake, losing at least 2Se − S + 1) and calling (acceptable, no loss); and the button folding 72o at 15 big blinds (acceptable; the published chart folds it). The bounds use e = 0.77501, AA’s lowest equity against any class (65s), read from the published exact table, not from FeltPrep’s. Each is played as a full hand on the engine with the button in seat 0 and again in seat 1, located by `locateJamOrFold` and graded against the registered solution as the reader loads it: 26 graded decisions, every verdict and loss as derived.
- **The B-3 river game, both seats.** Pot 1, bet 1: the nuts checking is a mistake losing 0.5 (closed form 1.0 against 0.5), the nuts betting has no loss, and air betting or checking and the bluff-catcher calling or folding are acceptable with no loss, all within 0.005.
- **Not graded.** A limp, a raise to 3 big blinds, the big blind after a limp or facing a small raise, a decision after the flop, stacks of 20 or 10.5 big blinds, three players and an ante are each outside the game, with the reason; so are a spot no solution covers, an unverified solution, an action the game lacks, an unknown hand and a hand below the minimum reach.

## B-11 · Each hand’s action values are right

**Passed** at the commit that ticks P2.4 (2026-11-26), in the full gate (`jam-or-fold.spec.ts`).

- At every depth and both seats, all 169 classes and both actions: the values stored in the solution (computed from the game tree by `actionValues`) equal a separately written calculation (`directValues` in `jam-or-fold.ts`, straight from the equity table and the other player’s frequencies, with no game tree) to within 1e-9. 2 × 14 × 169 × 2 = 9,464 values. The rarest hands are included, since every class is checked.

## B-12 · A verdict near a threshold is not an accident of one solve

**Passed** at the commit that ticks P2.4 (2026-11-26): `pnpm run jof:build` solves every depth again with 20,000 iterations (the solver draws no random numbers, so there is no seed to vary).

- **Under D-20’s bands** (0.5% and 3%; re-run at the commit that ticks P3.8, `jof:build` from `7686e28`): no hand’s verdict moves between acceptable and mistake. **One band changes:** at 3 big blinds, the big blind folding 62s to a jam is an inaccuracy after 10,000 iterations and a mistake after 20,000 (its loss sits at the 3% boundary). Its stored margin gives it the kinder band. The solution’s bytes did not change; only the manifest’s `grading` and its commit did.
- Under Q-7’s first defaults (1% and 5%, at P2.4) the one band change was at 7 big blinds, the big blind calling with T4s (inaccuracy, then mistake at the 5% boundary).
- Each hand’s margin (the largest change in its loss over its actions) is stored in the solution. The largest is 0.00175 big blinds, at 3 big blinds; at the other depths it is below 0.0001.
