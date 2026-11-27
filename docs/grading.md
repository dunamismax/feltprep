# Spots, solutions and grading

The contract every solution and every grade in FeltPrep follows. A lesson, a study view, a drill and a review all read the same solution through it, so they cannot disagree. The rules it serves are in [AGENTS.md section 9](../AGENTS.md#9-feedback-and-solver-claims) and the [grading gate](../BUILD.md#evidence-required-before-grading-a-decision) in BUILD.md. The TypeScript types are in [`web/src/lib/spots/types.ts`](../web/src/lib/spots/types.ts) and the reader in [`reader.ts`](../web/src/lib/spots/reader.ts).

**Units.** Amounts are in big blinds. A **value** is the expected result of the whole hand for the player named, measured against that player’s stack before the hand began, so a posted blind is a cost: folding the small blind is worth −0.5.

## The stated game

A solution is the equilibrium of a **stated game**, not of poker in general. The game records every field of grading-gate item 1, and the app shows them with the solution (`GameStatement`):

| Field                    | Meaning                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `format`                 | Heads-up no-limit hold’em, the only graded format in the first release (Q-3).                    |
| `blinds`, `ante`, `rake` | The stakes in big blinds. No ante and no rake in the first release.                              |
| `effectiveStack`         | The smaller stack in big blinds, before the blinds are posted.                                   |
| `board`, `pot`           | The board and pot when the game starts: empty and 1.5 big blinds before the flop.                |
| `ranges`                 | Each seat’s starting range, as every hand or as weighted hand classes, with its source in words. |
| `betting`                | The actions allowed on each street, such as “button: jam or fold”.                               |
| `caveat`                 | Where the simplification stops matching real play. The study view and the lesson show it.        |

The two seats are `button`, which posts the small blind, and `big-blind`.

## A spot

A **spot** (`Spot`) is one decision inside a stated game: the game it belongs to, the seat to act, the actions before it (such as `button:jam`), the pot at the decision and the actions the reference chooses between. A spot’s identifier is stable: lessons, drills and stored reviews refer to it.

## A solution artifact

A solution is a JSON file in format 1 (`SolutionFile`): `"format": 1`, `"kind": "solution"`, the solution’s identifier and one **decision table** per spot. A table runs parallel to its list of hands, which are hand classes such as `AKs` before the flop and two-card combinations such as `AsKd` after it. For each hand it holds:

- **`reach`**: how much of the hand the actor’s range holds at the decision, from 0 to 1, relative to the hand’s chance of being dealt. It is 1 for every hand at a first decision, and the product of the actor’s own earlier action frequencies after that.
- **`frequencies`**: the reference’s frequency of each action. Each row sums to one.
- **`values`**: the value of each action for the actor, when both players follow the reference afterwards. They are **computed exactly from the finished strategies** by FeltPrep’s best-response evaluator. A solver’s running averages or sampled estimates are never stored here.
- **`margins`**: how far the hand’s loss for each action moved between the solve and a second, longer one (B-12), in big blinds: the largest change over the hand’s actions.

Only exact suit isomorphism may merge hands (grading-gate item 2): every combination of a class plays the same strategy and has the same values, because the game treats the suits alike. Card buckets that group different ranks are not allowed.

## The manifest

Each solution has a manifest in format 1 (`Manifest`), `manifest.json` beside the solution:

- the identifier and title, the stated games and the spots;
- `files`: every file of the solution with its SHA-256 and size, and which one is the solution file;
- `inputs`: what the build read, such as the pre-flop equity table, with its path and SHA-256;
- `build`: the command, the commit whose code ran, the solver settings and the seed (null for a solver that draws no random numbers);
- `exploitability`: for each game, the value measured by FeltPrep’s best-response evaluator and its threshold (Q-7). Exploitability is half the sum of both best responders’ gains (half the “NashConv”): what a best responder wins per hand on average, playing each seat once. Its unit is big blinds per hand;
- `grading`: the band thresholds and the minimum reach the grades use (below).

A rebuild from the same inputs and settings must produce the same solution bytes (gate item 7). The manifest records the commit, so it changes when the code moves on; the solution files’ hashes do not.

## The registry

`solutions/registry.json` (format 1, `Registry`) lists every solution FeltPrep may read. Each entry gives the identifier, the manifest’s path below `solutions/` and its SHA-256, a status, and a record of the nine grading-gate items with the benchmark rows they rest on. Only an entry with status `graded` and all nine items met may grade a decision. An `unverified` entry may be shown as study material, labelled as unverified.

## Loading a solution

`loadSolution(registry, id, read)` reads through a function the caller supplies (`fetch` in the browser, the file system in Node) and refuses the solution, with a `SolutionRefused` error naming the reason, when:

| Reason                  | When                                                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-solution`      | The registry has no entry with that identifier.                                                                                                                                                                                           |
| `registry-inconsistent` | The entry says `graded` but a gate item is not met.                                                                                                                                                                                       |
| `manifest-hash`         | The manifest’s SHA-256 differs from the registry’s.                                                                                                                                                                                       |
| `file-hash`             | A file’s SHA-256 or size differs from the manifest’s.                                                                                                                                                                                     |
| `file-missing`          | A listed file cannot be read.                                                                                                                                                                                                             |
| `unsupported-format`    | The registry, the manifest or the solution file has a format other than 1.                                                                                                                                                                |
| `id-mismatch`           | The manifest or solution file belongs to another solution.                                                                                                                                                                                |
| `malformed`             | Anything else is wrong: a path leaving `solutions/`, an unknown spot, a table whose rows do not match its hands or actions, a frequency row that does not sum to one (within 1e-9), a reach outside 0 to 1, a value that is not a number. |

A loaded solution says whether it `grades`. Nothing else in the app reads solution files.

## A verdict

Grading turns a spot, a hand and the action taken into a `Verdict`.

**When a decision is graded.** A registered, graded solution covers the spot; the action is one of the spot’s actions; and the actor’s range holds the hand at least `minReach` there. Otherwise the verdict is **not graded**, with a reason and a sentence for the player:

| Reason                 | Meaning                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `no-reference`         | No registered solution covers this decision.                                                                            |
| `unverified-reference` | A solution covers it but has not passed the grading gate.                                                               |
| `outside-game`         | The decision is not in the stated game: another stack depth, position or prior action.                                  |
| `action-outside-game`  | The action is not one the game allows, such as a limp in the jam-or-fold game.                                          |
| `outside-range`        | The range holds this hand less than `minReach` at this decision, so the reference has nothing reliable to say about it. |

**What a graded verdict holds.** The action taken; the reference’s frequencies and values for that hand; the best action; the **loss**, the best action’s value minus the taken action’s value (never negative); the loss as a fraction of the pot at the decision; the hand’s margin; and the band.

**The band** (Q-7’s default, recorded in each manifest’s `grading`):

1. **Acceptable** if the reference takes the action at least `acceptableFrequency` (5%) of the time with that hand.
2. Otherwise the loss is first reduced by the hand’s margin, so a loss within the margin of a boundary gets the kinder band. Then it is **acceptable** up to `acceptableLoss` (1%) of the pot, an **inaccuracy** up to `inaccuracyLoss` (5%), and a **mistake** above.
3. A loss smaller than the solution’s measured exploitability for that game is never a mistake: it is shown as an inaccuracy at worst.

A mixed action is therefore never a mistake, and neither is a near-indifferent one.

**Where a grade’s numbers come from.** Every number in a verdict is read from the solution file: the values computed exactly from the finished strategies, the margin measured by B-12, the reach and the frequencies. Grading computes only the loss and the band. **`minReach`** is 0.01 by default: a hand the range holds less than 1% as often as it is dealt is not graded at that decision. This is a proposal, recorded in every manifest so that a change is visible.
