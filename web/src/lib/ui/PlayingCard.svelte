<script lang="ts">
	// A playing card drawn in code (P3.1): a large rank in the corner and a
	// large pip opposite it, so the card reads at phone size, in four suit
	// colours. `hidden` draws the back. The card is one image to assistive
	// technology, named "Ace of spades" or "Face-down card".
	import SuitPip from './SuitPip.svelte';
	import { SUIT_FILL, cardFace } from './cards.ts';

	type Size = 'sm' | 'md' | 'lg';
	let {
		card = null,
		hidden = false,
		size = 'md',
		class: extra = ''
	}: { card?: number | string | null; hidden?: boolean; size?: Size; class?: string } = $props();

	const WIDTH: Record<Size, string> = { sm: 'w-9', md: 'w-14', lg: 'w-20' };
	const face = $derived(hidden || card === null ? null : cardFace(card));
	const label = $derived(face ? face.label : 'Face-down card');
</script>

<svg
	viewBox="0 0 50 70"
	role="img"
	aria-label={label}
	class="inline-block aspect-[5/7] shrink-0 select-none {WIDTH[size]} {extra}"
	data-card={face ? `${face.rank}${face.suit[0]}` : 'back'}
>
	<title>{label}</title>
	{#if face}
		<rect
			x="0.75"
			y="0.75"
			width="48.5"
			height="68.5"
			rx="4.5"
			class="fill-card stroke-card-edge"
			stroke-width="1.5"
		/>
		<g class={SUIT_FILL[face.suit]}>
			<text
				x={face.rank === '10' ? 3 : 5}
				y="25"
				class="font-sans font-bold"
				font-size={face.rank === '10' ? 21 : 25}
				letter-spacing={face.rank === '10' ? -1.5 : 0}
			>
				{face.rank}
			</text>
			<SuitPip suit={face.suit} x={5} y={29} size={11} />
			<SuitPip suit={face.suit} x={21} y={38} size={25} />
		</g>
	{:else}
		<rect
			x="0.75"
			y="0.75"
			width="48.5"
			height="68.5"
			rx="4.5"
			class="fill-card stroke-card-edge"
			stroke-width="1.5"
		/>
		<rect x="4" y="4" width="42" height="62" rx="2.5" class="fill-card-back" />
		<g class="stroke-card-back-mark" stroke-width="1" fill="none" opacity="0.85">
			<rect x="7" y="7" width="36" height="56" rx="1.5" />
			{#each [0, 1, 2, 3, 4, 5] as row (row)}
				<path
					d="M25 {11 + row * 8.8} l6 4.4 l-6 4.4 l-6 -4.4 Z M13 {11 +
						row * 8.8} l6 4.4 l-6 4.4 l-6 -4.4 Z M37 {11 + row * 8.8} l6 4.4 l-6 4.4 l-6 -4.4 Z"
				/>
			{/each}
		</g>
	{/if}
</svg>
