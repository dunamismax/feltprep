# The post-flop solver

The design of FeltPrep’s heads-up post-flop solver (Phase 5) and the measurements that size it. [BUILD.md](../BUILD.md#phase-5--post-flop-solver) holds the steps and their criteria; [grading.md](grading.md) the contract every solution meets; [benchmarks.md](benchmarks.md) the results of Gate B.

## A post-flop spot

A spot states everything the reference depends on, and the app shows all of it with every solved spot (grading-gate item 1):

- **The board:** three, four or five cards.
- **The pot and the stacks** at the start of the street, in chips (the big blind is 100 chips).
- **Both ranges,** as weighted two-card combinations: player 0 is out of position (the big blind) and acts first, player 1 is the button. Ranges are written for FeltPrep and shown as assumptions (D-18).
- **The bet sizes** as fractions of the pot, the raise sizes as fractions of the pot after calling, and the most bets and raises a street allows. All-in is always offered. The same sizes apply on every street for now; sizes per street are a small change to the builder when the library needs them.
- **No rake.**

## Trees through the engine

`buildSpot` in [`web/src/lib/solver/postflop.ts`](../web/src/lib/solver/postflop.ts) never computes a legal amount itself. It sets up a hand on the engine that reaches the spot (the button raises to half the pot before the flop, the big blind calls, both check to the stated street), and at every decision asks the engine’s `legalActions` what may be done:

- fold where folding is allowed, check or call;
- each stated size, clamped into the engine’s minimum and maximum (a bet smaller than the minimum becomes the minimum bet, a size larger than the stack becomes all-in), with repeats merged;
- all-in, while the street has had fewer bets and raises than the spot allows.

Each child is the engine’s own next state, so the tree ends where the engine ends a hand, and a test replays every path of a reference tree on the engine (`postflop.spec.ts`), on the river and on the turn.

## Chance cards

When the engine closes a street before the river, the builder puts a chance node there with one child per card not on the board, and replays the betting on an engine whose deck holds that card, so every state below it shows the board as dealt. When both players are all in before the river, chance nodes deal the rest of the board and each runout ends in a showdown.

A card held by one of a player’s combinations is not dealt while that combination is in the hand, so below a chance card the solver sets the reach of every combination holding it to zero, for both players, and gives those combinations no value there. For a pair of hands, each of the cards neither holds is equally likely: one over 52 minus the board minus four. That weight is the same for every pair that can be dealt, so card removal stays exact with one prior for the whole tree, and no joint distribution per runout is needed. Tests check a turn checked down against a count done by hand (a straight against a set, 34 rivers to 10), every hand’s value on a turn and on a flop against a separate enumeration of every runout and opposing hand, and an all-in on the turn against the outs counted by hand.

## Card removal

Each player’s types are the combinations of their range that do not touch the board. The prior over pairs of types is the product of their weights, zero for two combinations that share a card, normalised to one; the game records the weights and cards (`CardDeal` in `game.ts`) as well as the prior. Nothing is bucketed: every combination has its own strategy (grading-gate item 2). Suit isomorphism, which would merge combinations that are equivalent on a given board, is allowed by the gate and is a later speed-up, not used yet.

## Payoffs

Payoffs are player 0’s, in chips, counted from the start of the spot minus half the pot already in it, so the game is zero-sum: a showdown won is worth +(pot/2 + c), lost −(pot/2 + c), tied 0, where c is what each player put in since the start of the spot; a fold after putting in c is worth −(pot/2 + c) to the folder.

**Linear-time terminals** ([`removal.ts`](../web/src/lib/solver/removal.ts)). A fold or showdown needs, for each of my combinations, a sum over the opponent’s combinations that share no card with it. Summing over every pair costs the product of the range sizes (349,000 pairs on the reference river) at every terminal. Instead: the sum over all of the opponent’s combinations, minus those holding my first card, minus those holding my second, plus the one holding both (the same two cards, subtracted twice), which costs one pass over each range and a table of 52 per-card sums. A showdown does the same over the combinations weaker than mine and those stronger, after sorting both ranges by hand strength once per board; the same two cards always tie, so no correction is needed there. Every showdown on one five-card board shares that board’s ranks and order (`ShowdownTable`), so memory grows with the number of boards, not with the number of showdowns. `removal.spec.ts` checks both sums against the plain sum over pairs on random ranges with shared cards, weights, dead combinations and board cards in the ranges, and `postflop.spec.ts` checks a whole river game, its best responses and every action value, against the same game written with a matrix of who wins.

## The solver

CFR+ with alternating updates and linearly weighted averaging, the same core that solved jam-or-fold (`cfr.ts`, B-1 to B-3). Each half of an iteration computes only the updating player’s values, which halves the terminal work; its sums run in the same order as the two-player pass, so the jam-or-fold solution rebuilds to identical bytes. Values for grading are computed exactly from the finished strategies by the same evaluator that measures exploitability (B-11), never taken from running averages. A solve stops when its measured exploitability is under the threshold of D-20: 1% of the starting pot for an on-demand river spot, 0.5% for a library spot.

## Measurements

`node scripts/postflop-measure.ts` (from `web/`) builds a reference spot and solves it, checking exploitability every `--every` iterations; `--street` picks the river, turn or flop spot, `--bets`, `--raises` and `--max-bets` replace the sizes, and `--count` sizes a tree without solving it. Checks are made every 50 iterations, so a threshold may have been reached up to 49 iterations before the count shown. Times are solving only, without the checks.

All three reference spots are for measuring only; none is a library spot. They share one line and one pair of ranges:

- **Boards:** the flop K♠ 9♦ 5♣, the turn adds 2♥, the river 7♠. **Pot** 500 chips (5 big blinds, a single-raised pot) and **stacks** 9,750 chips (97.5 big blinds) each at the start of each spot.
- **Ranges,** with classes ranked by their all-in equity against a random hand from the exact pre-flop table: the button holds the strongest 45% of combinations, the big blind the band from 6% to 70%. That is 523 and 740 combinations on the flop, 518 and 721 on the turn, 503 and 693 on the river.
- **Sizes,** on every street: bets of a third and three quarters of the pot, raises of the pot, all-in, at most three bets and raises a street.

**Machine:** the development Mac (Apple M5, 10 cores, 32 GB; Node 26.13.1), one core per solve, with a load average of 5 to 9 from other work. **Not yet measured on the host** (P5.1b): SSH to it now asks for a Tailscale sign-in check that only the owner can complete.

### The river

Measured on 2026-11-27 at the commit that records P5.1’s second part, with the linear-time terminals:

| Exploitability, % of the pot | Iterations | Time solving |
| --- | --- | --- |
| 5.5 | 50 | 0.1 s |
| 1.0 (D-20, on-demand river) | 250 | 0.3 s |
| 0.5 (D-20, library spot) | 400 | 0.4 s |
| 0.25 | 700 | 0.7 s |
| 0.026 | 3,000 | 3.2 s |

24 decisions, 23 showdowns and 22 folds; peak memory 179 MB for the whole process, nearly all of it Node itself. The exploitability at every check is the same as the first measurement’s, made with a matrix of who wins at every showdown, which then took 6.1 s to 1% and 9.7 s to 0.5% (24 ms an iteration against about 1.1 ms now).

### The turn

| Exploitability, % of the pot | Iterations | Time solving |
| --- | --- | --- |
| 11.3 | 50 | 27 s |
| 1.0 (D-20, on-demand) | 350 | 196 s |
| 0.5 (D-20, library spot) | 550 | 308 s |
| 0.25 | 800 | 450 s |
| 0.17 | 1,000 | 561 s |

10,968 decisions, 23 chance nodes (the river cards, and runouts after an all-in), 10,800 showdowns on 48 boards and 9,718 folds: 18.8 million type-and-action cells, 431 MB of solver state as 64-bit floats, peak memory 1.06 GB. An iteration takes about 0.56 s, 30 ns a cell, the same rate per cell as the river: the cost grows with the tree, not with anything else.

### The flop

**At the reference sizes the flop cannot be solved here.** `--count` builds the whole tree in 5.8 s (1.25 GB): 2.9 million decisions, 11,048 chance nodes, 2.9 million showdowns on all 1,176 boards and 2.4 million folds, which is 4.9 billion cells, 111 GB of solver state as 64-bit floats.

Trees with fewer sizes, counted the same way (all-in is always offered as well):

| Bets | Raises | Bets and raises a street | Decisions | Solver state, 64-bit |
| --- | --- | --- | --- | --- |
| ⅓ and ¾ pot | pot | 3 | 2,908,860 | 111 GB |
| ½ pot | pot | 3 | 733,152 | 27 GB |
| ⅓ and ¾ pot | none | 2 | 708,552 | 27 GB |
| ½ pot | pot | 2 | 496,380 | 18 GB |
| ½ pot | none | 2 | 170,528 | 6.2 GB |
| ½ pot | none | 1 | 127,896 | 4.3 GB |

**A real flop solve,** on the fifth row: the same board, ranges and stacks, a bet of half the pot or all-in, and after a bet only fold, call or all-in. 170,528 decisions, 1,232 chance nodes, 185,808 showdowns on 1,176 boards; 269 million cells.

| Exploitability, % of the pot | Iterations | Time solving |
| --- | --- | --- |
| 9.4 | 50 | 594 s |
| 3.8 | 100 | 1,236 s |
| 1.8 | 200 | 2,313 s |
| 1.2 | 300 | 3,338 s |
| 0.89 (under D-20’s 1%) | 400 | 4,329 s |

The run stopped at 400 iterations, reaching 1% between the checks at 350 (1.04%) and 400 (0.89%); peak memory 10.2 GB by the script’s own sampling, 12.1 GB maximum resident by `/usr/bin/time`. It ran beside other work, including one full gate, at a load average of 5 to 9.

**To 0.5%, extrapolated:** from 250 to 400 iterations the exploitability fell almost exactly as one over the iteration count (1.445% to 0.892% over a ratio of 1.6), so 0.5% needs about 400 × 0.892 / 0.5 ≈ 710 iterations, about 2.1 hours on one core at the measured 10.8 s an iteration. The turn fell faster than that between 1% and 0.5%, so the estimate is on the safe side.

An iteration takes about 12 s, 45 ns a cell, against 26 ns on the turn; taking the solver’s scratch arrays from a reusable arena instead of allocating them cut the turn’s time by 10% and left the flop’s unchanged. At 6 GB the flop streams its whole state through memory twice an iteration, so memory traffic, not arithmetic or garbage collection, sets its speed.

## Decisions from the measurements

- **B-10’s budget stays at the proposed 5 seconds** for the 95th percentile of an on-demand river solve to 1% of the pot on the host. The reference river takes 0.3 s on one core of this Mac, so the budget leaves room for a slower host and for ranges about twice as large on each side. P5.4 measures it on the host.
- **The Rust/WebAssembly core of D-19 is not needed now.** On-demand river solves are 15 times inside the budget in TypeScript, and turn and flop solves are offline (D-27). The flop is bound by memory, which a faster language does not reduce; what does is storing regrets and sums as 32-bit floats, dropping the stored current strategy, and suit isomorphism on boards that allow it, all of which TypeScript can do. Revisit if P5.5’s library, built with those, cannot be solved overnight on this Mac.
- **The library: 12 flops, each solved as one tree from the flop to the river,** with one bet size a street plus all-in and at most two bets a street, the shape measured above. Each flop takes about two hours to 0.5% on one core and 10 to 12 GB, so two solve at once on this Mac at 64 bits, and about four once regrets and sums are stored as 32-bit floats: the whole library in one night (D-27). Twelve is the floor the first-release scope proposes; more flops wait until the library’s build time is measured at P5.5. The turn and river of each line are subtrees of its flop solve, so they need no solves of their own. Which 12 flops, chosen to cover distinct textures, and which bet size on each street, are set at P5.5 and cite these numbers.
