import { describe, expect, it } from 'vitest';
import { FULL_DECK } from '../engine/cards.ts';
import { cardFace } from './cards.ts';

describe('cardFace', () => {
	it('names and colours each card', () => {
		expect(cardFace('As')).toEqual({ rank: 'A', suit: 'spade', label: 'Ace of spades' });
		expect(cardFace('Td')).toEqual({ rank: '10', suit: 'diamond', label: 'Ten of diamonds' });
		expect(cardFace('2c')).toEqual({ rank: '2', suit: 'club', label: 'Two of clubs' });
		expect(cardFace('Qh').label).toBe('Queen of hearts');
	});

	it('gives all 52 cards distinct names', () => {
		const labels = FULL_DECK.map((c) => cardFace(c).label);
		expect(new Set(labels).size).toBe(52);
	});

	it('refuses what is not a card', () => {
		expect(() => cardFace(52)).toThrow(RangeError);
		expect(() => cardFace('Xx')).toThrow(RangeError);
	});
});
