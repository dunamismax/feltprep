---
id: jam-or-fold-10bb
title: Jam or fold: heads-up at 10 big blinds
summary: Why the button should move all-in with more than half its hands when the stacks are short, and how the big blind should answer.
spots: jof-10bb-button, jof-10bb-big-blind
order: 1
---
## The spot

You are heads-up and each player has 10 big blinds. You are on the button, so you post the small blind, half a big blind, and you act first. Before anyone has looked at a card the pot already holds 1.5 big blinds.

In this lesson you have two choices. You can **fold** and give up your small blind, or you can move all-in, which players call a **jam**. If you jam, the big blind either calls or folds, and a called hand is dealt out to the river with no more betting. That is the whole game, and FeltPrep has solved it (how closely is measured at the end of this lesson).

## Folding is not free

The most useful idea in this lesson is the price of folding. When you fold the button you lose the half big blind you posted: folding is worth −0.50 big blinds, every time.

So a jam does not have to make money to be right. It only has to lose less than 0.50 big blinds on average. Many hands that look too weak to put 10 big blinds in the middle clear that bar easily.

## A jam wins in two ways

- **The big blind folds.** You win its big blind at once, without seeing a flop. Against the solved strategy the big blind calls a 10 big blind jam with only about 37% of its hands, so most of the time this is how a jam ends.
- **The big blind calls and you still win.** Preflop, hands are rarely far apart. Your **equity** is your share of the pot if the rest of the cards are dealt with no more betting, and even a modest hand keeps a real share against the hands that call.

Take **K7o**. Against the solved big blind it is called about 36% of the time, and when it is called it has about 40% equity. When the big blind folds you gain 1 big blind; when it calls you put in 10 to win a 20 big blind pot with 40% equity, which is worth 2 × 10 × 0.40 − 10, about −1.9 big blinds. Weighting the two: 0.64 × 1 + 0.36 × (−1.9) is about −0.05 big blinds.

That is a small loss, but folding loses 0.50. Jamming K7o is worth about 0.45 big blinds more than folding it, so it is a clear jam.

Now take **72o**. It is called about 39% of the time and then has only about 29% equity, so a jam is worth about −0.99 big blinds. That is worse than the −0.50 of folding: fold it.

## The button jams more than half its hands

Put every hand through that comparison and the solved button jams about 58% of all the hands it is dealt at 10 big blinds: every pair, every ace, every king, most suited hands and most connected hands. It folds the weakest unconnected hands, such as Q2o, J4o and 72o. The [study view](/study/jam-or-fold/10#button) shows the whole chart, hand by hand.

## The big blind's answer

When the button jams, the big blind has 1 big blind in already. To call it puts in 9 more to win a pot of 20, so a call needs 9 / 20 = 45% equity against the hands that jam.

Because the button jams so wide, many hands clear that bar. **K7o** has about 48% equity against the jamming range, so it calls. **A2o** has about 50% and calls. **Q5s** has only about 44% and folds, even though it is suited. The solved big blind calls with about 37% of its hands; the [big blind's chart](/study/jam-or-fold/10#big-blind) lists them.

> A call needs (S − 1) / 2S equity when the stacks are S big blinds: 45% at 10 big blinds, 25% at 2 and about 47% at 15.

## What this game leaves out

This is the equilibrium of a simplified game in which the button may only jam or fold and the big blind may only call or fold. Real players can also limp or make a smaller raise. Those options matter more the deeper the stacks, so the chart is a sound guide at the shortest stacks and a looser one towards 15 big blinds; how much the other options are worth is not measured here.

So FeltPrep grades a jam or a fold in this spot against the solved game, and does not grade a limp or a smaller raise: it says so instead. The solution's measured distance from the equilibrium of this game is at most 0.001 big blinds a hand at every depth, which is [benchmark B-5](https://github.com/dunamismax/feltprep/blob/main/docs/benchmarks.md#b-5--the-jam-or-fold-charts-are-the-equilibrium-of-the-stated-game).

## Practise it

1. Look through the [button's chart](/study/jam-or-fold/10#button) and notice which hands fold.
2. [Drill the button](/drill/jam-or-fold/10?seat=button) until the jams feel automatic, then [drill the big blind](/drill/jam-or-fold/10?seat=big-blind).
3. Play [full hands at 10 big blinds](/practice/10). When a decision is a mistake, the table shows what it cost and lets you drill that exact spot.
