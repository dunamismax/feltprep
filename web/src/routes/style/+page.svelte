<script lang="ts">
	// The style page (P3.1): every token, the cards and each component as it is
	// added, in whichever theme the system asks for. The contrast table is
	// measured here in the browser from the live custom properties.
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import PlayingCard from '#lib/ui/PlayingCard.svelte';
	import { CONTRAST_PAIRS, contrast } from '#lib/ui/contrast.ts';
	import { RANKS } from '#lib/engine/cards.ts';

	// Class names are written out in full so Tailwind generates each one.
	const groups: { title: string; swatches: { name: string; cls: string }[] }[] = [
		{
			title: 'Surfaces and lines',
			swatches: [
				{ name: 'surface', cls: 'bg-surface' },
				{ name: 'raised', cls: 'bg-raised' },
				{ name: 'sunken', cls: 'bg-sunken' },
				{ name: 'line', cls: 'bg-line' },
				{ name: 'line-strong', cls: 'bg-line-strong' }
			]
		},
		{
			title: 'Text and accent',
			swatches: [
				{ name: 'ink', cls: 'bg-ink' },
				{ name: 'muted', cls: 'bg-muted' },
				{ name: 'accent', cls: 'bg-accent' },
				{ name: 'accent-strong', cls: 'bg-accent-strong' },
				{ name: 'on-accent', cls: 'bg-on-accent' },
				{ name: 'focus', cls: 'bg-focus' }
			]
		},
		{
			title: 'Table and cards',
			swatches: [
				{ name: 'felt', cls: 'bg-felt' },
				{ name: 'felt-edge', cls: 'bg-felt-edge' },
				{ name: 'on-felt', cls: 'bg-on-felt' },
				{ name: 'card', cls: 'bg-card' },
				{ name: 'card-edge', cls: 'bg-card-edge' },
				{ name: 'card-back', cls: 'bg-card-back' },
				{ name: 'card-back-mark', cls: 'bg-card-back-mark' }
			]
		},
		{
			title: 'Suits',
			swatches: [
				{ name: 'suit-club', cls: 'bg-suit-club' },
				{ name: 'suit-diamond', cls: 'bg-suit-diamond' },
				{ name: 'suit-heart', cls: 'bg-suit-heart' },
				{ name: 'suit-spade', cls: 'bg-suit-spade' }
			]
		},
		{
			title: 'Verdicts and strategy',
			swatches: [
				{ name: 'good', cls: 'bg-good' },
				{ name: 'good-soft', cls: 'bg-good-soft' },
				{ name: 'warn', cls: 'bg-warn' },
				{ name: 'warn-soft', cls: 'bg-warn-soft' },
				{ name: 'bad', cls: 'bg-bad' },
				{ name: 'bad-soft', cls: 'bg-bad-soft' },
				{ name: 'neutral-soft', cls: 'bg-neutral-soft' },
				{ name: 'act', cls: 'bg-act' },
				{ name: 'act-soft', cls: 'bg-act-soft' },
				{ name: 'fold', cls: 'bg-fold' }
			]
		}
	];

	const steps = [
		{ px: 4, cls: 'h-1' },
		{ px: 8, cls: 'h-2' },
		{ px: 12, cls: 'h-3' },
		{ px: 16, cls: 'h-4' },
		{ px: 24, cls: 'h-6' },
		{ px: 32, cls: 'h-8' },
		{ px: 44, cls: 'h-target' }
	];

	const ranks = [...RANKS].reverse();
	const suitsOrder = ['s', 'h', 'd', 'c'];

	let measured = $state<{ fg: string; bg: string; min: number; ratio: number }[]>([]);

	onMount(() => {
		const scheme = window.matchMedia('(prefers-color-scheme: dark)');
		const measure = () => {
			const styles = getComputedStyle(document.documentElement);
			const token = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();
			measured = CONTRAST_PAIRS.map((p) => ({
				...p,
				ratio: contrast(token(p.fg), token(p.bg))
			}));
		};
		measure();
		scheme.addEventListener('change', measure);
		return () => scheme.removeEventListener('change', measure);
	});

	const failing = $derived(measured.filter((m) => m.ratio < m.min).length);
</script>

<svelte:head>
	<title>Style · FeltPrep</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
	<header class="flex flex-col gap-2">
		<a href={resolve('/')} class="text-sm text-accent underline underline-offset-2">FeltPrep</a>
		<h1 class="text-3xl font-semibold tracking-tight">Style</h1>
		<p class="max-w-prose text-muted">
			FeltPrep’s tokens, cards and components, in the theme your system asks for. Switch your system
			between light and dark to see the other.
		</p>
	</header>

	<section aria-labelledby="colour" class="flex flex-col gap-6">
		<h2 id="colour" class="text-xl font-semibold">Colour</h2>
		{#each groups as group (group.title)}
			<div class="flex flex-col gap-3">
				<h3 class="text-sm font-semibold tracking-wide text-muted uppercase">{group.title}</h3>
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
					{#each group.swatches as swatch (swatch.name)}
						<li class="flex items-center gap-3 rounded-panel border border-line bg-raised p-2">
							<span class="size-10 shrink-0 rounded-md border border-line {swatch.cls}"></span>
							<code class="font-mono text-xs break-all">{swatch.name}</code>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>

	<section aria-labelledby="contrast" class="flex flex-col gap-3">
		<h2 id="contrast" class="text-xl font-semibold">Contrast</h2>
		<p class="max-w-prose text-muted">
			Every foreground drawn on every background it is used on, measured now in this browser: 4.5:1
			for text and 3:1 for graphics (WCAG 2.2 AA).
			{#if measured.length}
				<strong class={failing ? 'text-bad' : 'text-good'} data-testid="contrast-summary">
					{failing ? `${failing} below AA` : `All ${measured.length} pass`}
				</strong>
			{/if}
		</p>
		<div class="overflow-x-auto rounded-panel border border-line">
			<table class="w-full text-sm">
				<thead class="bg-sunken text-left">
					<tr>
						<th class="px-3 py-2 font-semibold">Foreground</th>
						<th class="px-3 py-2 font-semibold">Background</th>
						<th class="px-3 py-2 text-right font-semibold">Ratio</th>
					</tr>
				</thead>
				<tbody>
					{#each measured as m (`${m.fg}/${m.bg}`)}
						<tr class="border-t border-line">
							<td class="px-3 py-1.5 font-mono text-xs">{m.fg}</td>
							<td class="px-3 py-1.5 font-mono text-xs">{m.bg}</td>
							<td
								class="px-3 py-1.5 text-right font-mono text-xs whitespace-nowrap tabular-nums {m.ratio <
								m.min
									? 'text-bad'
									: ''}"
							>
								{m.ratio.toFixed(2)} / {m.min}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section aria-labelledby="type" class="flex flex-col gap-3">
		<h2 id="type" class="text-xl font-semibold">Type and spacing</h2>
		<p class="max-w-prose text-muted">
			The system’s own sans-serif and monospace faces, so no font file is shipped. Spacing steps are
			multiples of 4 pixels; an action control is at least 44 pixels square.
		</p>
		<div class="flex flex-col gap-2 rounded-panel border border-line bg-raised p-4">
			<p class="text-3xl font-semibold tracking-tight">Jam or fold at 10 big blinds</p>
			<p class="text-xl font-semibold">A heading for a section</p>
			<p class="text-base">Body text reads at 16 pixels on a phone.</p>
			<p class="text-sm text-muted">Secondary text, such as a stated assumption.</p>
			<p class="font-mono text-sm tabular-nums">EV +0.412 bb · 61.3% · 9.5 bb</p>
		</div>
		<div class="flex items-end gap-3" aria-hidden="true">
			{#each steps as step (step.px)}
				<div class="flex flex-col items-center gap-1">
					<span class="block w-4 bg-accent {step.cls}"></span>
					<span class="font-mono text-xs text-muted">{step.px}</span>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="cards" class="flex flex-col gap-4">
		<h2 id="cards" class="text-xl font-semibold">Cards</h2>
		<p class="max-w-prose text-muted">
			Drawn in code. Each suit has its own colour and shape: spades dark, hearts red, diamonds blue,
			clubs green.
		</p>
		<div class="felt flex flex-wrap items-center gap-3 rounded-panel bg-felt p-4">
			<PlayingCard card="As" size="lg" />
			<PlayingCard card="Kh" size="lg" />
			<PlayingCard card="Td" size="lg" />
			<PlayingCard card="7c" size="lg" />
			<PlayingCard hidden size="lg" />
			<PlayingCard card="Qs" size="md" />
			<PlayingCard card="2h" size="sm" />
		</div>
		<div class="flex flex-col gap-2" data-testid="deck">
			{#each suitsOrder as s (s)}
				<div class="flex flex-wrap gap-1">
					{#each ranks as r (r)}
						<PlayingCard card={r + s} size="sm" />
					{/each}
				</div>
			{/each}
		</div>
	</section>
</main>
