<script lang="ts">
	// Hand review (P3.6): step through a finished practice hand as the player
	// saw it, with each of their decisions marked graded or not graded. A
	// graded one shows its verdict, cost and explanation (P3.9's `explain`),
	// "Drill this spot" and the lesson for its spot. `?hand=` picks the hand.
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import TableView from '#lib/table/TableView.svelte';
	import { targetQuery, type Holes } from '#lib/drill/jam-or-fold.ts';
	import { explain } from '#lib/solver/explain.ts';
	import { loadPractice } from '#lib/practice/storage.ts';
	import { actionWords, reviewSteps } from '#lib/practice/review.ts';
	import { BIG_BLIND, outcome, type FinishedHand } from '#lib/practice/table.ts';
	import type { Street } from '#lib/engine/state.ts';
	import type { Band, Seat } from '#lib/spots/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const BAND_NAME: Record<Band, string> = {
		acceptable: 'Acceptable',
		inaccuracy: 'Inaccuracy',
		mistake: 'Mistake'
	};
	const BAND_CLASS: Record<Band | 'none', string> = {
		acceptable: 'border-good bg-good-soft',
		inaccuracy: 'border-warn bg-warn-soft',
		mistake: 'border-bad bg-bad-soft',
		none: 'border-line-strong bg-neutral-soft'
	};
	const BAND_TEXT: Record<Band, string> = {
		acceptable: 'text-good',
		inaccuracy: 'text-warn',
		mistake: 'text-bad'
	};
	const STREET: Record<Street, string> = { 0: 'Before the flop', 1: 'Flop', 2: 'Turn', 3: 'River' };

	let hands = $state<readonly FinishedHand[]>([]);
	let chosen = $state<number | null>(null);
	let step = $state(0);
	let loaded = $state(false);

	onMount(() => {
		let store: Storage | null;
		try {
			store = window.localStorage;
		} catch {
			store = null;
		}
		const session = store ? loadPractice(store) : null;
		if (session && session.stack === data.stack) {
			hands = session.finished;
			const wanted = Number(new URLSearchParams(location.search).get('hand'));
			const found = hands.find((h) => h.number === wanted);
			chosen = found ? found.number : (hands[hands.length - 1]?.number ?? null);
			step = firstToFix();
		}
		loaded = true;
	});

	const hand = $derived(hands.find((h) => h.number === chosen) ?? null);
	const steps = $derived.by(() => {
		if (!hand) return [];
		try {
			return reviewSteps(data.solution, hand);
		} catch {
			return [];
		}
	});
	const current = $derived(steps[Math.min(step, steps.length - 1)] ?? null);
	const last = $derived(steps.length - 1);
	const holes = $derived(
		hand && steps[0] ? (steps[0].state.holeCards[hand.player] as Holes) : null
	);
	const recent = $derived([...hands].reverse().slice(0, 12));

	interface DecisionLine {
		readonly step: number;
		readonly text: string;
		readonly band: Band | null;
	}
	// The player's decisions in this hand, each a step to jump to.
	const decisions = $derived.by((): DecisionLine[] =>
		steps.flatMap((s, i): DecisionLine[] =>
			s.actor === hand?.player && s.record
				? [
						{
							step: i,
							text: `${STREET[s.state.street]}: you ${actionWords(s.record, BIG_BLIND)}`,
							band: s.verdict?.graded ? s.verdict.band : null
						}
					]
				: []
		)
	);
	// The verdict on screen, with its explanation and links.
	const verdictView = $derived.by(() => {
		const v = current?.verdict;
		if (!v) return null;
		if (!v.graded) return { graded: false as const, detail: v.detail };
		const seat: Seat = v.spot.endsWith('-button') ? 'button' : 'big-blind';
		return {
			graded: true as const,
			band: v.band,
			loss: v.loss,
			text: explain(v, data.facts).text,
			query: v.band !== 'acceptable' && holes ? targetQuery(seat, holes, 'practice') : null,
			lesson: data.lessons[seat]
		};
	});

	/** A review opens on the first inaccuracy or mistake, so its cost shows without a tap (D-25). */
	function firstToFix(): number {
		const i = steps.findIndex((s) => s.verdict?.graded && s.verdict.band !== 'acceptable');
		return Math.max(0, i);
	}

	function pick(n: number) {
		chosen = n;
		step = firstToFix();
	}
	const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)} bb`;
</script>

<svelte:head>
	<title>Review · {data.stack} big blinds · FeltPrep</title>
	<meta name="description" content="Step through a finished practice hand, decision by decision." />
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-3 pt-4 pb-8 sm:px-6">
	<header class="flex flex-col gap-1 px-1">
		<div class="flex items-center justify-between gap-2 text-sm">
			<a href={resolve('/')} class="text-accent underline underline-offset-2">FeltPrep</a>
			<a
				href={resolve('/practice/[stack]', { stack: String(data.stack) })}
				class="text-accent underline underline-offset-2"
				data-testid="back-to-table"
			>
				Back to the table
			</a>
		</div>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">Review</p>
		<h1 class="text-2xl font-semibold tracking-tight">
			{hand ? `Hand ${hand.number + 1}` : 'Hand review'} at {data.stack} big blinds
		</h1>
	</header>

	{#if loaded && !hand}
		<p class="px-1" data-testid="no-hands">
			No finished hands at {data.stack} big blinds in this browser yet. Play a few at the
			<a
				href={resolve('/practice/[stack]', { stack: String(data.stack) })}
				class="text-accent underline"
			>
				practice table
			</a>, then come back.
		</p>
	{:else if hand && current}
		<TableView
			state={current.state}
			player={hand.player}
			reveal={step === last && (current.state.result?.showdown ?? false)}
			opponentName="Practice opponent"
		/>

		<div class="flex items-center justify-between gap-2">
			<button
				type="button"
				class="min-h-target min-w-target rounded-md border border-line-strong bg-raised px-4 font-semibold disabled:opacity-50"
				disabled={step === 0}
				onclick={() => (step = Math.max(0, step - 1))}
			>
				Back
			</button>
			<p class="text-center text-sm text-muted" data-testid="step-line">
				Step {step + 1} of {steps.length}
			</p>
			<button
				type="button"
				class="min-h-target min-w-target rounded-md bg-accent px-4 font-semibold text-on-accent disabled:opacity-50"
				disabled={step === last}
				onclick={() => (step = Math.min(last, step + 1))}
			>
				Next
			</button>
		</div>

		<section aria-live="polite" class="flex flex-col gap-2 px-1" data-testid="step">
			{#if current.record}
				<p data-testid="step-action">
					{STREET[current.state.street]}:
					{current.actor === hand.player ? 'you' : 'the practice opponent'}
					{actionWords(current.record, BIG_BLIND)}.
				</p>
			{:else}
				<p class="font-semibold" data-testid="step-action">{outcome(current.state, hand.player)}</p>
			{/if}
			{#if verdictView?.graded}
				<div
					class="flex flex-col gap-1.5 rounded-panel border p-3 {BAND_CLASS[verdictView.band]}"
					data-testid="review-verdict"
				>
					<div class="flex items-start justify-between gap-3">
						<p class="text-sm">
							<span class="font-semibold {BAND_TEXT[verdictView.band]}" data-testid="review-band">
								{BAND_NAME[verdictView.band]}
							</span>{#if verdictView.loss > 0.005}, giving up
								<strong class="font-mono" data-testid="review-cost">
									{verdictView.loss.toFixed(2)} bb
								</strong>{:else}, at no cost{/if}.
						</p>
						{#if verdictView.query}
							<a
								href={resolve(`drill/jam-or-fold/${data.stack}${verdictView.query}`)}
								class="flex min-h-target shrink-0 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-on-accent"
								data-testid="review-drill"
							>
								Drill this spot
							</a>
						{/if}
					</div>
					<p class="text-sm" data-testid="review-reason">{verdictView.text}</p>
					{#if verdictView.lesson}
						<a
							href={resolve('/learn/[lesson]', { lesson: verdictView.lesson.id })}
							class="self-start text-sm font-semibold text-accent underline"
							data-testid="review-lesson"
						>
							Read the lesson
						</a>
					{/if}
				</div>
			{:else if verdictView}
				<p
					class="rounded-panel border p-3 text-sm {BAND_CLASS.none}"
					data-testid="review-not-graded"
				>
					<span class="font-semibold">Not graded.</span>
					{verdictView.detail}
				</p>
			{/if}
		</section>

		<section aria-labelledby="decisions" class="flex flex-col gap-2 px-1">
			<h2 id="decisions" class="font-semibold">Your decisions</h2>
			<ul class="flex flex-col divide-y divide-line rounded-panel border border-line bg-raised">
				{#each decisions as d (d.step)}
					<li>
						<button
							type="button"
							class="flex min-h-target w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
							aria-current={step === d.step ? 'step' : undefined}
							onclick={() => (step = d.step)}
							data-testid="decision-jump"
						>
							<span>{d.text}</span>
							<span class="shrink-0 font-semibold {d.band ? BAND_TEXT[d.band] : 'text-muted'}">
								{d.band ? BAND_NAME[d.band] : 'Not graded'}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		{#if recent.length > 1}
			<section aria-labelledby="other-hands" class="flex flex-col gap-2 px-1">
				<h2 id="other-hands" class="font-semibold">Other hands</h2>
				<ul class="flex flex-wrap gap-2">
					{#each recent as h (h.number)}
						<li>
							<button
								type="button"
								class="min-h-target rounded-md border px-3 text-sm {h.number === chosen
									? 'border-accent bg-accent text-on-accent'
									: 'border-line-strong bg-raised'}"
								aria-pressed={h.number === chosen}
								onclick={() => pick(h.number)}
							>
								Hand {h.number + 1} · {signed(h.net)}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		<p class="px-1 text-sm text-muted">
			Each step shows only what you could see then; the opponent’s cards appear only at a showdown.
		</p>
	{/if}
</main>
