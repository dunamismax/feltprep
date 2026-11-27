<script lang="ts">
	// The study view (P3.3): the reference strategy for one depth of the
	// jam-or-fold game, both seats, with the stated game and how the solution
	// was checked beside it.
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import StrategyGrid from '#lib/study/StrategyGrid.svelte';
	import {
		actionShare,
		bb,
		className,
		gridRows,
		percent,
		scientific
	} from '#lib/study/strategy.ts';
	import type { Seat } from '#lib/spots/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const SEAT_NAME: Record<Seat, string> = { button: 'Button', 'big-blind': 'Big blind' };
	const SEAT_CHOICE: Record<Seat, string> = {
		button: 'jam or fold',
		'big-blind': 'call or fold'
	};
	const SEAT_TITLE: Record<Seat, string> = {
		button: 'Button: jam or fold',
		'big-blind': 'Big blind: call or fold'
	};

	let seat = $state<Seat>('button');
	let selected = $state('AKo');

	onMount(() => {
		if (location.hash === '#big-blind') seat = 'big-blind';
	});

	const game = $derived(data.solution.manifest.games[0]);
	const measured = $derived(data.solution.manifest.exploitability[0]);
	const spot = $derived(data.solution.manifest.spots.find((s) => s.actor === seat)!);
	const table = $derived(data.solution.solution.decisions.find((d) => d.spot === spot.id)!);
	const rows = $derived(gridRows(table));
	const actIndex = $derived(spot.actions.findIndex((a) => a !== 'fold'));
	const act = $derived(spot.actions[actIndex]);
	const share = $derived(actionShare(rows, actIndex));
	const chosen = $derived(rows.find((r) => r.name === selected) ?? rows[0]);
	const best = $derived(chosen.values.indexOf(Math.max(...chosen.values)));

	function pick(next: Seat) {
		seat = next;
		history.replaceState(history.state, '', next === 'big-blind' ? '#big-blind' : '#button');
	}
</script>

<svelte:head>
	<title>Jam or fold at {data.stack} big blinds · Study · FeltPrep</title>
	<meta
		name="description"
		content="The solved jam-or-fold strategy for heads-up play at {data.stack} big blinds, hand by hand."
	/>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6">
	<header class="flex flex-col gap-1 px-1">
		<a href={resolve('/')} class="text-sm text-accent underline underline-offset-2">FeltPrep</a>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">Study</p>
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			Jam or fold at {data.stack} big blinds
		</h1>
		<p>
			<a
				href={resolve('/drill/jam-or-fold/[stack]', { stack: String(data.stack) })}
				class="font-semibold text-accent underline underline-offset-2"
			>
				Drill this spot
			</a>
		</p>
		<p class="text-muted">
			Heads-up, before the flop. The button moves all-in or folds; facing the all-in, the big blind
			calls or folds.
		</p>
	</header>

	<nav aria-label="Stack depth" class="flex flex-col gap-2 px-1">
		<h2 class="text-sm font-semibold text-muted">Effective stack (big blinds)</h2>
		<ul class="flex flex-wrap gap-1.5">
			{#each data.stacks as s (s)}
				<li>
					<a
						href={resolve('/study/jam-or-fold/[stack]', { stack: String(s) })}
						aria-current={s === data.stack ? 'page' : undefined}
						class="flex size-target items-center justify-center rounded-md border font-mono text-sm tabular-nums {s ===
						data.stack
							? 'border-accent bg-accent font-semibold text-on-accent'
							: 'border-line-strong bg-raised text-ink'}"
					>
						{s}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<section aria-labelledby="strategy" class="flex flex-col gap-3">
		<h2 id="strategy" class="sr-only">Strategy</h2>
		<div role="group" aria-label="Seat" class="grid grid-cols-2 gap-2 px-1">
			{#each ['button', 'big-blind'] as const as s (s)}
				<button
					type="button"
					id={s}
					aria-pressed={seat === s}
					class="flex min-h-target flex-col items-center justify-center rounded-md border px-3 py-1 {seat ===
					s
						? 'border-accent bg-accent text-on-accent'
						: 'border-line-strong bg-raised text-ink'}"
					onclick={() => pick(s)}
				>
					<span class="font-semibold">{SEAT_NAME[s]}</span>
					<span class="text-xs">{SEAT_CHOICE[s]}</span>
				</button>
			{/each}
		</div>

		<p class="px-1" data-testid="summary">
			{#if seat === 'button'}
				The button jams <strong>{percent(share)}</strong> of hands.
			{:else}
				Facing the all-in, the big blind calls with <strong>{percent(share)}</strong> of hands.
			{/if}
		</p>

		<StrategyGrid
			{rows}
			action={act}
			actionIndex={actIndex}
			bind:selected
			label="{SEAT_TITLE[seat]} at {data.stack} big blinds: how often each hand {act}s"
		/>

		<p class="flex items-center gap-2 px-1 text-sm text-muted">
			<span class="inline-block size-4 rounded-sm bg-act"></span>
			<span>Filled: {act}. Empty: fold. A part-filled square mixes the two.</span>
		</p>

		<div
			class="flex flex-col gap-2 rounded-panel border border-line bg-raised p-4"
			aria-live="polite"
			data-testid="hand-detail"
		>
			<p class="flex flex-wrap items-baseline justify-between gap-x-3">
				<span class="text-xl font-semibold">{chosen.name}</span>
				<span class="text-sm text-muted">
					{className(chosen.name)} · {chosen.combos} combinations
				</span>
			</p>
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-muted">
						<th class="py-1 font-normal">Action</th>
						<th class="py-1 text-right font-normal">How often</th>
						<th class="py-1 text-right font-normal">Value</th>
					</tr>
				</thead>
				<tbody>
					{#each spot.actions as a, i (a)}
						<tr class="border-t border-line">
							<td class="py-1.5 font-semibold capitalize">
								{a}{#if i === best}<span class="ml-2 text-xs font-normal text-good">best</span>{/if}
							</td>
							<td class="py-1.5 text-right font-mono tabular-nums">
								{percent(chosen.frequencies[i])}
							</td>
							<td class="py-1.5 text-right font-mono tabular-nums">{bb(chosen.values[i])}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="text-xs text-muted">
				Values are what the hand wins on average in big blinds, counted from the stack before the
				blinds, when both players follow the reference afterwards.
			</p>
		</div>
	</section>

	<section aria-labelledby="game" class="flex flex-col gap-2 px-1">
		<h2 id="game" class="text-xl font-semibold">The game this solves</h2>
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
			<dt class="text-muted">Format</dt>
			<dd>{game.format}</dd>
			<dt class="text-muted">Stacks</dt>
			<dd>{game.effectiveStack} big blinds each, before the blinds</dd>
			<dt class="text-muted">Blinds</dt>
			<dd>{game.blinds.small} and {game.blinds.big} big blind; no ante, no rake</dd>
			<dt class="text-muted">Ranges</dt>
			<dd>Both players: {game.ranges.button.source}</dd>
		</dl>
		<ul class="list-disc pl-5 text-sm">
			{#each game.betting as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
		<p class="rounded-panel border border-line bg-sunken p-3 text-sm">{game.caveat}</p>
	</section>

	<section aria-labelledby="checked" class="flex flex-col gap-2 px-1 pb-6">
		<h2 id="checked" class="text-xl font-semibold">How it was checked</h2>
		<p class="text-sm" data-testid="exploitability">
			Measured exploitability: <strong class="font-mono">
				{scientific(measured.value)} big blinds per hand
			</strong>, against a threshold of {measured.threshold}. A player who knew this strategy
			exactly and answered it perfectly would win at most that much per hand.
		</p>
		<p class="text-sm">
			{#if data.solution.grades}
				It has passed every check FeltPrep requires before it may grade a decision.
			{:else}
				It has not passed every check yet, so it is shown for study only and grades nothing.
			{/if}
			Benchmarks: {data.solution.entry.benchmarks.join(', ')}.
			<a
				href="https://github.com/dunamismax/feltprep/blob/main/docs/benchmarks.md#b-5--the-jam-or-fold-charts-are-the-equilibrium-of-the-stated-game"
				class="text-accent underline underline-offset-2"
			>
				Read the B-5 results
			</a>.
		</p>
	</section>
</main>
