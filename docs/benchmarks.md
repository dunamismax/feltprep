# Benchmark results

The record of every Gate B benchmark run ([BUILD.md](../BUILD.md#gate-b--trustworthy-feedback-on-reference-spots)): what was checked, against what, the result, the commit, the machine and the command. Expected values always come from outside the code under test. Newest results first within each row; a benchmark that fails blocks grading, not study.

**Machine** unless stated otherwise: the development Mac, Apple M5, 10 cores, 32 GB, Node 26.13.1.

## B-4 · Equities are exact

**Passed** at the commit that ticks P2.2 (2026-11-26), in the full gate (`pnpm run test`, `web/src/lib/solver/preflop-table.spec.ts` and `equity.spec.ts`).

- **Against a published exact table.** FeltPrep’s pre-flop class table (`solutions/equity/preflop-classes.json`) agrees exactly, as rational numbers, with every win, loss and tie fraction of all 14,365 class pairs in Geoffrey Irving and Eugene d’Eon’s `exact.txt` ([`girving/poker`](https://github.com/girving/poker) at `06fa71d`, BSD 3-Clause; [provenance](provenance.md)), computed by their own enumerator. Their printed decimals, such as AA against KK winning 0.817147, are reproduced to their printed precision.
- **Against a separately written enumerator.** For AA–KK, AKs–QQ, AKo–AKs, 72o–AA, T9s–22 and KQo–JTo, every pair of combinations was enumerated over all 1,712,304 boards by `equity.ts`’s direct enumerator (one pair per suit relabelling, weighted by its count); the counts equal the table’s.
- **Symmetry.** For every ordered class pair, the two sides’ wins and losses mirror each other, ties are equal and the equities sum to one.
- **Hand-worked cases.** On the turn 2c 7d 9h Ks, AsAd wins 40 and loses 4 of the 44 rivers against QhJh (only a ten makes the straight); a royal flush on the board ties.
- **Reproducibility.** `pnpm run equity:build -- --check` rebuilt the table with identical bytes (SHA-256 `c3ca25d5…a34790ad`). The build visits 134,459 boards (one per suit relabelling of the 2,598,960) and took 37.0 seconds and 150 MB on one core.
