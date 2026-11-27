<script lang="ts">
	// The action panel (P3.4, shared with the practice table). Four places in a
	// fixed grid, each at least 44 pixels square with 8 pixels between: fold,
	// check or call, raise (which opens a sizing sheet laid over the content
	// above the panel, never pushing it), and all-in. Every action comes from
	// the engine's legal actions; a place it does not allow stays in position,
	// disabled. Each place has a fixed height (64 px), so a sublabel that wraps
	// on a narrow phone, or disappears once the place is disabled, never moves it.
	import type { Action, LegalActions } from '../engine/state.ts';
	import { inBigBlinds, places, stepSize } from './actions.ts';

	let {
		legal,
		behind,
		bigBlind,
		disabled = false,
		onact
	}: {
		/** The engine's legal actions for the player, or null when it is not their turn. */
		legal: LegalActions | null;
		/** The player's chips behind. */
		behind: number;
		bigBlind: number;
		disabled?: boolean;
		onact: (action: Action) => void;
	} = $props();

	const NONE: LegalActions = {
		seat: 0,
		canFold: false,
		canCheck: false,
		call: 0,
		raiseKind: null,
		minTo: 0,
		maxTo: 0
	};
	const shown = $derived(places(legal ?? NONE, behind, bigBlind));
	let sizing = $state(false);
	let amount = $state(0);

	function openSizing() {
		if (!legal) return;
		amount = legal.minTo;
		sizing = true;
	}

	function confirm() {
		if (!legal || !legal.raiseKind) return;
		sizing = false;
		onact({ kind: legal.raiseKind, amount });
	}

	function take(action: Action | null) {
		if (action && !disabled) onact(action);
	}

	let panel = $state<HTMLDivElement | null>(null);

	$effect(() => {
		// When the decision is taken the places are disabled. A focused place
		// that is disabled can trap keyboard focus (WebKit), so let it go: the
		// next Tab continues from here into the feedback or result.
		if ((legal && !disabled) || !panel) return;
		const focused = document.activeElement;
		if (focused instanceof HTMLElement && panel.contains(focused)) focused.blur();
	});

	$effect(() => {
		// A new decision closes any open sizing sheet.
		void legal;
		sizing = false;
	});
</script>

<svelte:window
	onkeydown={(e: KeyboardEvent) => {
		if (sizing && e.key === 'Escape') sizing = false;
	}}
/>

<div class="relative" data-testid="action-panel" bind:this={panel}>
	{#if sizing && legal && legal.raiseKind}
		<div
			class="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-3 rounded-panel border border-line-strong bg-raised p-3 shadow-lg"
			role="dialog"
			aria-label="Choose a size"
		>
			<p class="flex items-baseline justify-between">
				<span class="font-semibold capitalize">{legal.raiseKind} to</span>
				<span class="font-mono text-lg tabular-nums" data-testid="raise-amount">
					{inBigBlinds(amount, bigBlind)} bb
				</span>
			</p>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="size-target shrink-0 rounded-md border border-line-strong bg-surface text-xl"
					aria-label="Smaller"
					onclick={() => (amount = stepSize(amount, -1, legal, bigBlind))}
				>
					−
				</button>
				<input
					type="range"
					min={legal.minTo}
					max={legal.maxTo}
					step="1"
					bind:value={amount}
					class="h-target min-w-0 flex-1 accent-accent"
					aria-label="{legal.raiseKind} to, in chips"
				/>
				<button
					type="button"
					class="size-target shrink-0 rounded-md border border-line-strong bg-surface text-xl"
					aria-label="Larger"
					onclick={() => (amount = stepSize(amount, 1, legal, bigBlind))}
				>
					+
				</button>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					class="min-h-target rounded-md border border-line-strong bg-surface font-semibold"
					onclick={() => (sizing = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="min-h-target rounded-md bg-accent font-semibold text-on-accent"
					onclick={confirm}
				>
					<span class="capitalize">{legal.raiseKind}</span>
					{inBigBlinds(amount, bigBlind)} bb
				</button>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-4 gap-2">
		{#each shown as place (place.key)}
			{@const off = disabled || !legal || !place.enabled}
			<button
				type="button"
				data-place={place.key}
				disabled={off}
				aria-expanded={place.key === 'raise' ? sizing : undefined}
				class="flex h-16 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border px-1 py-1 leading-tight font-semibold {off
					? 'border-line bg-sunken text-muted'
					: place.key === 'all-in'
						? 'border-accent bg-accent text-on-accent'
						: 'border-line-strong bg-raised text-ink'}"
				onclick={() => (place.key === 'raise' ? openSizing() : take(place.action))}
			>
				<span>{place.label}</span>
				{#if place.detail && !off}
					<span class="text-xs font-normal">{place.detail}</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
