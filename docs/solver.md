# The post-flop solver

The design of FeltPrep’s heads-up post-flop solver (Phase 5) and the measurements that size it. [BUILD.md](../BUILD.md#phase-5--post-flop-solver) holds the steps and their criteria; [grading.md](grading.md) the contract every solution meets; [benchmarks.md](benchmarks.md) the results of Gate B.

## A post-flop spot

A spot states everything the reference depends on, and the app shows all of it with every solved spot (grading-gate item 1):

- **The board:** three, four or five cards.
- **The pot and the stacks** at the start of the street, in chips (the big blind is 100 chips).
- **Both ranges,** as weighted two-card combinations: player 0 is out of position (the big blind) and acts first, player 1 is the button. Ranges are written for FeltPrep and shown as assumptions (D-18).
- **The bet sizes** on each street as fractions of the pot, the raise sizes as fractions of the pot after calling, and the most bets and raises a street allows. All-in is always offered.
- **No rake.**

## Trees through the engine

`buildRiver` in [`web/src/lib/solver/postflop.ts`](../web/src/lib/solver/postflop.ts) never computes a legal amount itself. It sets up a hand on the engine that reaches the spot (the button raises to half the pot before the flop, the big blind calls, both check to the stated street), and at every decision asks the engine’s `legalActions` what may be done:

- fold where folding is allowed, check or call;
- each stated size, clamped into the engine’s minimum and maximum (a bet smaller than the minimum becomes the minimum bet, a size larger than the stack becomes all-in), with repeats merged;
- all-in, while the street has had fewer bets and raises than the spot allows.

Each child is the engine’s own next state, so the tree ends where the engine ends a hand, and a test replays every path of a reference tree on the engine (`postflop.spec.ts`).

## Card removal

Each player’s types are the combinations of their range that do not touch the board. The prior over pairs of types is the product of their weights, zero for two combinations that share a card, normalised to one. Nothing is bucketed: every combination has its own strategy (grading-gate item 2). Suit isomorphism, which would merge combinations that are equivalent on a given board, is allowed by the gate and is a later speed-up, not used yet.

## Payoffs

Payoffs are player 0’s, in chips, counted from the start of the street minus half the pot already in it, so the game is zero-sum: a showdown won is worth +(pot/2 + c), lost −(pot/2 + c), tied 0, where c is what each player put in on the street; a fold after putting in c is worth −(pot/2 + c) to the folder. Every showdown in a tree shares one matrix of who wins (+1, 0, −1 per pair of combinations), scaled by its size, so memory grows with the number of combinations, not with the number of showdowns.

## The solver

CFR+ with alternating updates and linearly weighted averaging, the same core that solved jam-or-fold (`cfr.ts`, B-1 to B-3). Values for grading are computed exactly from the finished strategies by the same evaluator that measures exploitability (B-11), never taken from running averages. A solve stops when its measured exploitability is under the threshold of D-20: 1% of the starting pot for an on-demand river spot, 0.5% for a library spot.

## Measurements

### The reference river spot

For measuring only; it is not a library spot.

- **Board** K♠ 9♦ 5♣ 2♥ 7♠; **pot** 500 chips (5 big blinds, a single-raised pot); **stacks** 9,750 chips (97.5 big blinds) each.
- **Ranges,** with classes ranked by their all-in equity against a random hand from the exact pre-flop table: the button holds the strongest 45% of combinations, the big blind the band from 6% to 70%. On this board that is 503 and 693 combinations.
- **Sizes:** bets of a third and three quarters of the pot, raises of the pot, all-in, at most three bets and raises: 24 decisions and 45 terminals.

`node scripts/postflop-measure.ts` builds and solves it, checking exploitability every 50 iterations.

Measured on 2026-11-27 on the development Mac (Apple M5, 10 cores, 32 GB; Node 26.13.1, one core; load average about 5 from other work), at the commit that records P5.1’s first part:

| Exploitability, % of the pot | Iterations | Time solving |
| --- | --- | --- |
| 5.5 | 50 | 1.2 s |
| 1.0 (D-20, on-demand river) | 250 | 6.1 s |
| 0.5 (D-20, library spot) | 400 | 9.7 s |
| 0.25 | 700 | 17.0 s |
| 0.026 | 3,000 | 73.1 s |

Peak memory 182 MB for the whole process. Each iteration costs about 24 ms, nearly all of it in the 45 terminals, each of which visits every pair of combinations (693 × 503 = 349,000 pairs) once per player per iteration. Checks are measured every 50 iterations, so a threshold may have been reached up to 49 iterations earlier.

**What it means.** At this size a river solve to the on-demand threshold takes about 6 seconds on one core of this Mac, just over the 5 seconds proposed for B-10, and the host is slower. The cost is dominated by the showdowns’ all-pairs loop, which a standard technique removes: sort each player’s combinations by hand strength once per board, then compute every combination’s showdown value with one sweep plus a correction for the cards they share, which is linear in the number of combinations instead of quadratic. On this spot that is about 1,200 steps per showdown instead of 349,000, and it also makes turn and flop trees fit in memory (one rank order per runout instead of one matrix). That change comes before any decision about the Rust/WebAssembly core of D-19, and is the next part of this step.

### Turn and flop

Not yet measured: the game model has no public chance cards yet (P5.1’s fifth criterion). The design: a chance node deals each card not on the board; a card held by a player’s combination zeroes that combination’s reach below it, and every outcome is weighted by one over the number of unseen cards, which is the same for every pair of hands that can be dealt. This keeps card removal exact without a joint distribution per runout. A turn tree is about 48 river trees under each turn line, and a flop tree about 2,000 runouts, so turn and flop solves need the linear showdown above, and their measured cost decides the library’s size (P5.5).
