<script lang="ts">
	// The 13 × 13 hand grid (P3.3). Each cell fills from the bottom in
	// proportion to how often the reference takes the action, so the strategy
	// reads from the height of the fill as well as its colour. Arrow keys move
	// between cells (one tab stop for the whole grid), and Enter, Space or a tap
	// selects a cell.
	import { percent, type HandRow } from './strategy.ts';

	let {
		rows,
		action,
		actionIndex,
		selected = $bindable(),
		label
	}: {
		rows: readonly HandRow[];
		/** The action the fill shows, such as "jam" or "call". */
		action: string;
		actionIndex: number;
		selected: string;
		label: string;
	} = $props();

	const uid = $props.id();
	let active = $state(0);
	const buttons: HTMLButtonElement[] = [];

	const grid = $derived(
		Array.from({ length: 13 }, (_, r) =>
			rows.slice(r * 13, r * 13 + 13).map((h, c) => ({ h, i: r * 13 + c }))
		)
	);

	function move(event: KeyboardEvent, i: number) {
		const r = Math.floor(i / 13);
		const c = i % 13;
		const next: Record<string, number> = {
			ArrowUp: r > 0 ? i - 13 : i,
			ArrowDown: r < 12 ? i + 13 : i,
			ArrowLeft: c > 0 ? i - 1 : i,
			ArrowRight: c < 12 ? i + 1 : i,
			Home: r * 13,
			End: r * 13 + 12
		};
		if (!(event.key in next)) return;
		event.preventDefault();
		active = next[event.key];
		buttons[active]?.focus();
	}

	function choose(i: number) {
		active = i;
		selected = rows[i].name;
	}
</script>

<div
	role="grid"
	aria-label={label}
	class="grid w-full grid-cols-13 gap-px rounded-md bg-line p-px select-none"
>
	{#each grid as cells, r (r)}
		<div role="row" class="contents">
			{#each cells as { h, i } (h.name)}
				{@const f = h.frequencies[actionIndex]}
				<div role="gridcell" class="contents">
					<button
						bind:this={buttons[i]}
						type="button"
						tabindex={i === active ? 0 : -1}
						aria-label="{h.name}: {action} {percent(f)}"
						aria-pressed={selected === h.name}
						data-hand={h.name}
						data-frequency={f}
						class="relative aspect-square w-full overflow-hidden {selected === h.name
							? 'z-10 outline-3 outline-offset-0 outline-ink'
							: ''}"
						onclick={() => choose(i)}
						onkeydown={(e) => move(e, i)}
					>
						<svg viewBox="0 0 100 100" class="absolute inset-0 size-full" aria-hidden="true">
							<clipPath id="{uid}-{i}">
								<rect x="0" y={100 * (1 - f)} width="100" height={100 * f} />
							</clipPath>
							<rect width="100" height="100" class="fill-fold" />
							<rect x="0" y={100 * (1 - f)} width="100" height={100 * f} class="fill-act" />
							<text
								x="50"
								y="54"
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-ink font-sans font-semibold"
								font-size={h.name.length === 2 ? 40 : 34}
							>
								{h.name}
							</text>
							<text
								x="50"
								y="54"
								text-anchor="middle"
								dominant-baseline="middle"
								clip-path="url(#{uid}-{i})"
								class="fill-on-accent font-sans font-semibold"
								font-size={h.name.length === 2 ? 40 : 34}
							>
								{h.name}
							</text>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/each}
</div>
