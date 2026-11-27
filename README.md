# FeltPrep

**One place to learn, study and practice No-Limit Texas Hold’em.** FeltPrep is a mobile-friendly web app for players who want to improve on their own: learn why a decision works, drill that decision in realistic spots, then apply it in full practice hands.

| | |
| --- | --- |
| **Status** | Early development. The foundation and the reference math are done: the rules engine is verified, and the first solved game (jamming or folding heads-up at 2 to 15 big blinds) has passed every check FeltPrep requires before it may grade a decision ([benchmarks](docs/benchmarks.md)). On feltprep.com a player can now study that solved game hand by hand, drill it with graded feedback, and play complete short-stack hands against a practice opponent. When a decision at the table is a mistake, the player sees what it cost and why, in plain English, and one tap starts a drill of that same decision. The first lesson, on jamming or folding at 10 big blinds, leads into all of it, and a finished hand can be reviewed decision by decision. That whole journey, from the lesson to a mistake drilled and reviewed, is tested at phone and desktop sizes in three browser engines, checked for accessibility, and tried on a real iPhone: the first milestone is complete. Solving spots after the flop has begun: the river solver now meets FeltPrep’s checks on 20 reference spots ([B-6, B-11 and B-12](docs/benchmarks.md#b-6--river-solutions-are-near-equilibrium)), and an independent cross-check, solving on demand and a library of flops come next. Nothing after the flop is graded yet. |
| **Plan and progress** | [BUILD.md](BUILD.md), starting at **Now** |
| **How work is done** | [AGENTS.md](AGENTS.md) |
| **Home** | [feltprep.com](https://feltprep.com) shows the work in progress: every change to `main` that passes its checks goes live there within minutes. `feltprep.app` redirects to it. |

## Who it is for

FeltPrep is for one player preparing alone: someone who knows the rules of hold’em and wants to stop guessing. That covers a newer player learning what a good decision looks like, and a regular player who wants to find and fix the spots where they lose chips.

It is a training tool. There is no real-money play, there are no other people at the table, and the chips in a practice hand are worth nothing.

## What a player will be able to do

Everything in this section is planned, not built. [BUILD.md](BUILD.md#the-first-release) says what belongs in the first release and what is still undecided.

- **Learn.** Read a short lesson that explains one decision and the reasoning behind it, in plain language, on a phone.
- **Study.** Open the solved version of that same spot: which hands take which action, how often, and what each action is worth.
- **Drill.** Answer that decision again and again with different cards, and see at once whether the answer was right, how much it cost when it was not, and why.
- **Practice.** Play complete hands at a table against practice opponents, with the same controls a real table has.
- **Review.** Step back through a finished hand and see which decisions were good, which were mistakes, and which lesson and drill cover each mistake.

## How the pieces fit together

The four parts are one loop around a shared unit, the **spot**: a precisely described situation such as “heads-up, 10 big blinds, you are on the button and first to act”.

```text
  Lesson ──────────► Solver study ──────────► Focused drill ──────────► Full-hand practice
  why it works       what the answer is       make it automatic         use it under real conditions
     ▲                                                                            │
     └───────────── review sends each mistake back to its lesson and drill ◄──────┘
```

- A **lesson** teaches one idea and names the spots that show it.
- **Solver study** shows the reference answer for a spot, with the assumptions it rests on.
- A **drill** deals that spot over and over and grades each answer against the same reference.
- **Full-hand practice** puts the decision back into a whole hand, where the player also has to notice that the spot has come up.
- **Review** grades the decisions in a finished hand and links each mistake back to its lesson and drill, which closes the loop.

One reference answer serves the study view, the drill and the review of a spot, so the three never disagree.

## What FeltPrep promises

- **Feedback is honest about what it knows.** A decision is graded only against a reference that has passed FeltPrep’s published checks. Everything else is labelled “not graded” instead of being given a confident-looking verdict.
- **Every accuracy claim names its benchmark.** The checks, the thresholds and the results are in [BUILD.md](BUILD.md#verification-gates).
- **Assumptions are shown.** A solved spot states the stacks, the bet sizes and the ranges it was solved for.
- **Practice opponents are labelled as what they are.** A practice bot is an opponent to play against, not a source of correct answers.
- **It works on a phone.** The lesson, the drill and the practice table are designed for a phone first and tested at phone sizes.

## How it will be built

SvelteKit 3 with Svelte 5 and strict TypeScript, styled with Tailwind CSS 4, on Node through `adapter-node`, with PostgreSQL 18 and Drizzle ORM, behind Caddy on the owner’s own server. This is the stack of the owner’s two reference projects, [RiverMind Poker](https://github.com/dunamismax/rivermind-poker) and [C From The Ground Up](https://github.com/dunamismax/c-from-the-ground-up).

FeltPrep reuses RiverMind’s tested no-limit rules engine and hand evaluator, imported at a pinned commit and checked against RiverMind’s own reference, and plans to reuse some of its practice opponents. Each import is checked for its license and origin first; [BUILD.md](BUILD.md#rivermind-reuse-assessment) has the assessment. FeltPrep’s interface, branding and artwork are its own.

## Working on the project

The app lives in `web/`. It needs Node 26.13.1 and pnpm 12.18.0, and no database to build, test or serve.

```bash
cd web
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm run dev
```

The full gate that every commit passes, and every other command, are in [AGENTS.md](AGENTS.md#7-commands). [BUILD.md](BUILD.md) names the next task, and AGENTS.md explains how a session starts, verifies its work and hands off.

## License

FeltPrep’s code is free software under the [GNU Affero General Public License](LICENSE), version 3 or later. Anyone may use, study, change and share it, and anyone who runs a changed version as a service must offer its source to the people who use it.

The license covers the code. Lesson text, once published, is under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/): anyone may share and adapt it, with credit, under the same terms. The FeltPrep name, logo and artwork are reserved and are not covered by either license. [docs/provenance.md](docs/provenance.md) records everything that came from another project, with its license.
