<script lang="ts">
	// A heads-up table seen from the player's seat (P3.5): the opponent above,
	// the board and pot in the middle, the player's cards below. The board keeps
	// five places from the start, so nothing shifts when cards arrive. The
	// opponent's cards stay face down unless `reveal` is set.
	import PlayingCard from '../ui/PlayingCard.svelte';
	import { potTotal, type HandState } from '../engine/state.ts';
	import { inBigBlinds } from './actions.ts';

	let {
		state,
		player,
		reveal = false,
		opponentName = 'Opponent'
	}: { state: HandState; player: number; reveal?: boolean; opponentName?: string } = $props();

	const other = $derived(1 - player);
	const bb = (chips: number) => `${inBigBlinds(chips, state.config.bigBlind)} bb`;
	const role = (seat: number) => (seat === state.button ? 'Button' : 'Big blind');
	const sorted = (seat: number) => [...(state.holeCards[seat] ?? [])].sort((a, b) => b - a);

	/** The seat's last action on the current street, in words. */
	function last(seat: number): string {
		if (state.folded[seat]) return 'Folded';
		const mine = state.actions.filter((a) => a.seat === seat && a.street === state.street);
		const a = mine[mine.length - 1];
		if (!a) return state.streetBets[seat] > 0 ? `In ${bb(state.streetBets[seat])}` : '';
		if (a.allIn) return `All-in ${bb(a.to)}`;
		if (a.kind === 'raise') return `Raised to ${bb(a.to)}`;
		if (a.kind === 'bet') return `Bet ${bb(a.to)}`;
		if (a.kind === 'call') return `Called ${bb(a.to)}`;
		return 'Checked';
	}
</script>

<section aria-label="Table" class="felt flex flex-col gap-3 rounded-panel bg-felt p-3 text-on-felt">
	<div class="flex items-center justify-between gap-3">
		<div class="flex flex-col text-sm">
			<span class="font-semibold">{opponentName} · {role(other)}</span>
			<span data-testid="opponent-stack">{bb(state.stacks[other])} behind</span>
			<span data-testid="opponent-last">{last(other)}</span>
		</div>
		<div class="flex gap-1" data-testid="opponent-cards">
			{#each sorted(other) as c (c)}
				<PlayingCard card={c} hidden={!reveal} size="sm" />
			{/each}
		</div>
	</div>

	<div class="flex flex-col items-center gap-1">
		<div class="flex gap-1" data-testid="board" role="group" aria-label="Board">
			{#each [0, 1, 2, 3, 4] as i (i)}
				{#if state.board[i] !== undefined}
					<PlayingCard card={state.board[i]} size="sm" />
				{:else}
					<span
						class="inline-block aspect-[5/7] w-9 rounded-card border border-dashed border-on-felt/40"
						aria-hidden="true"
					></span>
				{/if}
			{/each}
		</div>
		<p class="font-mono text-sm" data-testid="pot">Pot {bb(potTotal(state))}</p>
	</div>

	<div class="flex items-center justify-between gap-3">
		<div class="flex gap-1.5" data-testid="hole-cards">
			{#each sorted(player) as c (c)}
				<PlayingCard card={c} size="lg" />
			{/each}
		</div>
		<div class="flex flex-col text-right text-sm">
			<span class="font-semibold">You · {role(player)}</span>
			<span data-testid="player-stack">{bb(state.stacks[player])} behind</span>
			<span>{last(player)}</span>
		</div>
	</div>
</section>
