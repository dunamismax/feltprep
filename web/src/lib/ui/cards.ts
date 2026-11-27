// Names and colours for drawing playing cards (P3.1). Plain data, so the card
// components and their tests share one source. Suits get four colours and
// four shapes, so a card never depends on telling red from black.

import { RANKS, RANK_NAMES, card as parseCard, rank, suit } from '../engine/cards.ts';

/** Suits in the engine's order: 0 clubs, 1 diamonds, 2 hearts, 3 spades. */
export type SuitName = 'club' | 'diamond' | 'heart' | 'spade';
export const SUIT_NAMES: readonly SuitName[] = ['club', 'diamond', 'heart', 'spade'];

/** Tailwind classes for each suit's colour, written out so the build sees them. */
export const SUIT_FILL: Readonly<Record<SuitName, string>> = {
	club: 'fill-suit-club',
	diamond: 'fill-suit-diamond',
	heart: 'fill-suit-heart',
	spade: 'fill-suit-spade'
};

export interface CardFace {
	/** The rank as printed: "A", "K", …, "10", …, "2". */
	readonly rank: string;
	readonly suit: SuitName;
	/** The name a screen reader says, such as "Ace of spades". */
	readonly label: string;
}

/** What to draw for a card given as an engine integer or text such as "As". */
export function cardFace(c: number | string): CardFace {
	const n = typeof c === 'number' ? c : parseCard(c);
	if (!Number.isInteger(n) || n < 0 || n > 51) throw new RangeError(`not a card: ${c}`);
	const r = rank(n);
	const s = SUIT_NAMES[suit(n)];
	const printed = RANKS[r] === 'T' ? '10' : RANKS[r];
	return { rank: printed, suit: s, label: `${RANK_NAMES[r]} of ${s}s` };
}
