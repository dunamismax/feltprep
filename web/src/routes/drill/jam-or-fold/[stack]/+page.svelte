<script lang="ts">
	// The jam-or-fold drill (P3.4). Deals, grades and progress all run in the
	// browser: the session lives in local storage, so a reload returns to the
	// same decision, and `?seed=` fixes the deals for tests.
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import PlayingCard from '#lib/ui/PlayingCard.svelte';
	import ActionPanel from '#lib/table/ActionPanel.svelte';
	import {
		BIG_BLIND,
		SEAT_MODES,
		dealDrill,
		judge,
		reason,
		type SeatMode
	} from '#lib/drill/jam-or-fold.ts';
	import {
		addToProgress,
		advance,
		current,
		isFinished,
		loadProgress,
		loadSession,
		newSession,
		record,
		saveSession,
		summarize,
		type DrillSession,
		type KeyValueStore,
		type Progress
	} from '#lib/drill/session.ts';
	import { cryptoRandom } from '#lib/engine/random.ts';
	import { legalActions, potTotal, type Action } from '#lib/engine/state.ts';
	import { describeAction, inBigBlinds } from '#lib/table/actions.ts';
	import { percent } from '#lib/study/strategy.ts';
	import type { Band } from '#lib/spots/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MODE_NAME: Record<SeatMode, string> = {
		both: 'Both seats',
		button: 'Button',
		'big-blind': 'Big blind'
	};
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
	const BAND_TEXT: Record<Band | 'none', string> = {
		acceptable: 'text-good',
		inaccuracy: 'text-warn',
		mistake: 'text-bad',
		none: 'text-ink'
	};

	let store: KeyValueStore | null = null;
	let session = $state<DrillSession | null>(null);
	let progress = $state<Progress | null>(null);

	function persist() {
		if (store && session) saveSession(store, session);
	}

	function start(mode: SeatMode, seed: number | null) {
		session = newSession(data.stack, mode, seed ?? cryptoRandom.below(2 ** 32));
		persist();
	}

	onMount(() => {
		try {
			store = window.localStorage;
		} catch {
			store = null;
		}
		const params = new URLSearchParams(location.search);
		const seedText = params.get('seed');
		const wantSeed = seedText && /^\d{1,10}$/.test(seedText) ? Number(seedText) >>> 0 : null;
		const seatText = params.get('seat');
		const wantMode = SEAT_MODES.find((m) => m === seatText) ?? null;
		const saved = store ? loadSession(store) : null;
		if (
			saved &&
			saved.stack === data.stack &&
			(wantSeed === null || saved.seed === wantSeed) &&
			(wantMode === null || saved.mode === wantMode)
		) {
			session = saved;
		} else {
			start(wantMode ?? saved?.mode ?? 'both', wantSeed);
		}
		progress = store ? loadProgress(store) : null;
	});

	const finished = $derived(session !== null && isFinished(session));
	const index = $derived(session ? current(session) : 0);
	const deal = $derived(
		session && !finished ? dealDrill(session.seed, index, session.stack, session.mode) : null
	);
	const legal = $derived(deal ? legalActions(deal.state) : null);
	const answered = $derived(
		session?.reviewing ? session.answers[session.answers.length - 1] : null
	);
	const verdict = $derived(answered && deal ? judge(data.solution, deal, answered.action) : null);
	const band = $derived<Band | 'none'>(verdict?.graded ? verdict.band : 'none');
	const summary = $derived(session ? summarize(session.answers) : null);
	const totals = $derived(progress?.byStack[String(data.stack)] ?? null);

	const opponent = $derived(deal ? 1 - deal.player : 0);
	const PAST: Record<string, string> = {
		fold: 'folded',
		jam: 'jammed',
		call: 'called',
		limp: 'limped',
		check: 'checked'
	};
	const past = (taken: string) =>
		PAST[taken] ?? taken.replace(/^raise/, 'raised').replace(/^bet/, 'bet');
	const bb = (chips: number) => `${inBigBlinds(chips, BIG_BLIND)} bb`;

	function act(action: Action) {
		if (!session || !deal || session.reviewing) return;
		const v = judge(data.solution, deal, action);
		const limp = action.kind === 'call' && deal.seat === 'button';
		session = record(session, {
			index,
			seat: deal.seat,
			hand: deal.hand,
			action: { kind: action.kind, amount: action.amount },
			taken: v.graded ? v.action : limp ? 'limp' : describeAction(action, BIG_BLIND),
			graded: v.graded,
			band: v.graded ? v.band : null,
			reason: v.graded ? null : v.reason,
			loss: v.graded ? v.loss : 0,
			best: v.graded ? v.best : null
		});
		persist();
	}

	function next() {
		if (!session) return;
		session = advance(session);
		if (isFinished(session) && store) progress = addToProgress(store, session);
		persist();
	}

	function studyLink(seat: string) {
		return resolve(
			seat === 'big-blind'
				? '/study/jam-or-fold/[stack]#big-blind'
				: '/study/jam-or-fold/[stack]#button',
			{ stack: String(data.stack) }
		);
	}
</script>

<svelte:head>
	<title>Drill: jam or fold at {data.stack} big blinds · FeltPrep</title>
	<meta
		name="description"
		content="Drill the heads-up jam-or-fold decision at {data.stack} big blinds, graded against the solved game."
	/>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-3 pt-4 sm:px-6">
	<header class="flex flex-col gap-1 px-1">
		<div class="flex items-center justify-between gap-2 text-sm">
			<a href={resolve('/')} class="text-accent underline underline-offset-2">FeltPrep</a>
			<a href={studyLink('button')} class="text-accent underline underline-offset-2">Study</a>
		</div>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">Drill</p>
		<h1 class="text-2xl font-semibold tracking-tight">Jam or fold at {data.stack} big blinds</h1>
	</header>

	<div class="flex flex-col gap-2 px-1">
		<div role="group" aria-label="Seat to drill" class="grid grid-cols-3 gap-2">
			{#each SEAT_MODES as mode (mode)}
				<button
					type="button"
					aria-pressed={session?.mode === mode}
					class="min-h-target rounded-md border px-2 text-sm font-semibold {session?.mode === mode
						? 'border-accent bg-accent text-on-accent'
						: 'border-line-strong bg-raised text-ink'}"
					onclick={() => start(mode, null)}
				>
					{MODE_NAME[mode]}
				</button>
			{/each}
		</div>
		<details class="text-sm">
			<summary class="flex min-h-target cursor-pointer items-center text-muted">
				Stack depth: {data.stack} big blinds
			</summary>
			<ul class="flex flex-wrap gap-1.5 pb-2">
				{#each data.stacks as s (s)}
					<li>
						<a
							href={resolve('/drill/jam-or-fold/[stack]', { stack: String(s) })}
							aria-current={s === data.stack ? 'page' : undefined}
							class="flex size-target items-center justify-center rounded-md border font-mono tabular-nums {s ===
							data.stack
								? 'border-accent bg-accent font-semibold text-on-accent'
								: 'border-line-strong bg-raised'}"
						>
							{s}
						</a>
					</li>
				{/each}
			</ul>
		</details>
	</div>

	{#if session && finished && summary}
		<section aria-labelledby="summary" class="flex flex-col gap-4 px-1 pb-8" data-testid="summary">
			<h2 id="summary" class="text-xl font-semibold">Session complete</h2>
			<dl class="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
				<div class="rounded-panel border border-good bg-good-soft p-3">
					<dt class="text-sm text-good">Acceptable</dt>
					<dd class="text-2xl font-semibold tabular-nums" data-testid="count-acceptable">
						{summary.acceptable}
					</dd>
				</div>
				<div class="rounded-panel border border-warn bg-warn-soft p-3">
					<dt class="text-sm text-warn">Inaccuracies</dt>
					<dd class="text-2xl font-semibold tabular-nums" data-testid="count-inaccuracies">
						{summary.inaccuracies}
					</dd>
				</div>
				<div class="rounded-panel border border-bad bg-bad-soft p-3">
					<dt class="text-sm text-bad">Mistakes</dt>
					<dd class="text-2xl font-semibold tabular-nums" data-testid="count-mistakes">
						{summary.mistakes}
					</dd>
				</div>
				<div class="rounded-panel border border-line-strong bg-neutral-soft p-3">
					<dt class="text-sm">Not graded</dt>
					<dd class="text-2xl font-semibold tabular-nums">
						{summary.decisions - summary.graded}
					</dd>
				</div>
			</dl>
			<p>
				Over {summary.decisions} decisions you gave up
				<strong class="font-mono">{summary.loss.toFixed(2)} bb</strong> against the reference.
			</p>
			{#if session.answers.some((a) => a.graded && a.band !== 'acceptable')}
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold">To look at again</h3>
					<ul class="flex flex-col divide-y divide-line rounded-panel border border-line bg-raised">
						{#each session.answers.filter((a) => a.graded && a.band !== 'acceptable') as a (a.index)}
							<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
								<span>
									<strong>{a.hand}</strong>
									{a.seat === 'button' ? 'on the button' : 'in the big blind'}: you {past(a.taken)},
									the reference {a.best}s (−{a.loss.toFixed(2)} bb)
								</span>
								<a href={studyLink(a.seat)} class="shrink-0 text-accent underline">Study</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if totals}
				<p class="text-sm text-muted" data-testid="progress">
					At {data.stack} big blinds so far: {totals.sessions}
					{totals.sessions === 1 ? 'session' : 'sessions'}, {totals.acceptable} of {totals.graded} graded
					decisions acceptable.
				</p>
			{/if}
			<button
				type="button"
				class="min-h-target rounded-md bg-accent px-4 font-semibold text-on-accent"
				onclick={() => start(session?.mode ?? 'both', null)}
			>
				Start a new session
			</button>
		</section>
	{:else}
		<section
			aria-label="Table"
			class="felt flex flex-col gap-3 rounded-panel bg-felt p-3 text-on-felt"
		>
			{#if deal && legal}
				<div class="flex items-center justify-between gap-3">
					<div class="flex flex-col text-sm">
						<span class="font-semibold">
							Opponent · {deal.state.button === opponent ? 'Button' : 'Big blind'}
						</span>
						<span data-testid="opponent-stack">{bb(deal.state.stacks[opponent])} behind</span>
						{#if deal.state.streetBets[opponent] > 0}
							<span>
								{deal.state.stacks[opponent] === 0 ? 'All-in' : 'In'}
								{bb(deal.state.streetBets[opponent])}
							</span>
						{/if}
					</div>
					<div class="flex gap-1">
						<PlayingCard hidden size="sm" />
						<PlayingCard hidden size="sm" />
					</div>
				</div>
				<p class="text-center font-mono text-sm" data-testid="pot">
					Pot {bb(potTotal(deal.state))}
				</p>
				<div class="flex items-center justify-between gap-3">
					<div class="flex gap-1.5" data-testid="hole-cards">
						{#each [...(deal.state.holeCards[deal.player] ?? [])].sort((a, b) => b - a) as c (c)}
							<PlayingCard card={c} size="lg" />
						{/each}
					</div>
					<div class="flex flex-col text-right text-sm">
						<span class="font-semibold">
							You · {deal.seat === 'button' ? 'Button' : 'Big blind'}
						</span>
						<span>{bb(deal.state.stacks[deal.player])} behind</span>
						<span>In {bb(deal.state.streetBets[deal.player])}</span>
					</div>
				</div>
			{:else}
				<p class="py-12 text-center">Dealing…</p>
			{/if}
		</section>

		<section aria-label="Feedback" aria-live="polite" class="flex min-h-56 flex-col gap-2 px-1">
			{#if session && deal}
				<p class="text-sm text-muted" data-testid="progress-line">
					Decision {index + 1} of {session.length}
				</p>
			{/if}
			{#if verdict && answered}
				<div
					class="flex flex-col gap-2 rounded-panel border p-3 {BAND_CLASS[band]}"
					data-testid="feedback"
				>
					<div class="flex items-start justify-between gap-3">
						<p class="text-lg font-semibold {BAND_TEXT[band]}" data-testid="verdict">
							{verdict.graded ? BAND_NAME[verdict.band] : 'Not graded'}
						</p>
						<button
							type="button"
							class="min-h-target shrink-0 rounded-md bg-accent px-4 font-semibold text-on-accent"
							onclick={next}
						>
							{index + 1 >= (session?.length ?? 0) ? 'Finish' : 'Next hand'}
						</button>
					</div>
					{#if verdict.graded}
						<p class="text-sm">
							You {past(answered.taken)}{verdict.loss > 0.005
								? `, giving up ${verdict.loss.toFixed(2)} bb`
								: ''}. The reference
							{Object.entries(verdict.frequencies)
								.map(([a, f]) => `${a}s ${percent(f)}`)
								.join(' and ')}.
						</p>
					{/if}
					<p class="text-sm" data-testid="reason">{reason(verdict)}</p>
					<p class="text-sm">
						<a href={studyLink(answered.seat)} class="font-semibold text-accent underline">
							Study this spot
						</a>
					</p>
				</div>
			{:else if deal}
				<p class="text-lg" data-testid="prompt">
					{#if deal.seat === 'button'}
						You are on the button with {data.stack} big blinds. Jam or fold?
					{:else}
						The button moved all-in for {data.stack} big blinds. Call or fold?
					{/if}
				</p>
				<p class="text-sm text-muted">
					Graded against the solved jam-or-fold game. A limp or a smaller raise leaves that game and
					is not graded.
				</p>
			{/if}
		</section>

		<div class="sticky bottom-0 -mx-3 mt-auto bg-surface px-3 pt-2 pb-3 sm:-mx-6 sm:px-6">
			<ActionPanel
				legal={answered ? null : legal}
				behind={deal ? deal.state.stacks[deal.player] : 0}
				bigBlind={BIG_BLIND}
				onact={act}
			/>
		</div>
	{/if}
</main>
