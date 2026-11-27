<script lang="ts">
	// One suit symbol, drawn in a 100 × 100 box. FeltPrep's own shapes, so the
	// pips look the same on every device instead of depending on a font.
	import type { SuitName } from './cards.ts';

	let {
		suit,
		x = 0,
		y = 0,
		size = 100
	}: { suit: SuitName; x?: number; y?: number; size?: number } = $props();
	const scale = $derived(size / 100);
</script>

<g transform="translate({x} {y}) scale({scale})">
	{#if suit === 'diamond'}
		<path d="M50 3 C60 20 74 36 90 50 C74 64 60 80 50 97 C40 80 26 64 10 50 C26 36 40 20 50 3 Z" />
	{:else if suit === 'heart'}
		<path
			d="M50 94 C24 72 5 55 5 33 C5 17 17 6 31 6 C40 6 46 11 50 19 C54 11 60 6 69 6 C83 6 95 17 95 33 C95 55 76 72 50 94 Z"
		/>
	{:else if suit === 'spade'}
		<path
			d="M50 4 C74 26 95 42 95 62 C95 75 85 83 73 83 C65 83 58 79 54 72 C55 83 59 90 67 96 L33 96 C41 90 45 83 46 72 C42 79 35 83 27 83 C15 83 5 75 5 62 C5 42 26 26 50 4 Z"
		/>
	{:else}
		<circle cx="50" cy="27" r="21" />
		<circle cx="26" cy="60" r="21" />
		<circle cx="74" cy="60" r="21" />
		<path d="M44 44 L56 44 C56 70 60 86 68 96 L32 96 C40 86 44 70 44 44 Z" />
	{/if}
</g>
