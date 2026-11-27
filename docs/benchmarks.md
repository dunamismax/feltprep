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
