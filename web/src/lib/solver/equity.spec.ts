// The direct enumerator (P2.2): board counts, symmetry, hand-worked outcomes,
// and agreement between its three entry points.

import { describe, expect, it } from 'vitest';
import { cards } from '../engine/cards.ts';
import {
	equityOf,
	handVsHand,
	handVsRange,
	rangeVsRange,
	type Hole,
	type WeightedHole
} from './equity.ts';

const hole = (text: string) => cards(text) as unknown as Hole;
const range = (...entries: [string, number][]): WeightedHole[] =>
	entries.map(([text, weight]) => ({ cards: hole(text), weight }));

describe('handVsHand', () => {
	it('deals every remaining board exactly once', () => {
		// 48 choose 5 pre-flop, 45 choose 2 on the flop, 44 on the turn, 1 on the river.
		expect(handVsHand(hole('AhAs'), hole('KdKc')).total).toBe(1_712_304);
		expect(handVsHand(hole('AhAs'), hole('KdKc'), cards('2c 7d 9h')).total).toBe(990);
		expect(handVsHand(hole('AhAs'), hole('KdKc'), cards('2c 7d 9h Ts')).total).toBe(44);
		expect(handVsHand(hole('AhAs'), hole('KdKc'), cards('2c 7d 9h Ts Jc')).total).toBe(1);
	});

	it('is the mirror image when the hands swap', () => {
		const a = handVsHand(hole('Ts9s'), hole('AhKd'));
		const b = handVsHand(hole('AhKd'), hole('Ts9s'));
		expect([a.win, a.tie, a.loss]).toEqual([b.loss, b.tie, b.win]);
		expect(equityOf(a) + equityOf(b)).toBeCloseTo(1, 12);
	});

	it('matches outcomes counted by hand', () => {
		// Turn 2c 7d 9h Ks; AsAd against QhJh. 44 river cards remain. Only a ten
		// (four of them) gives Q-J the straight nine to king; no river ties.
		expect(handVsHand(hole('AsAd'), hole('QhJh'), cards('2c 7d 9h Ks'))).toEqual({
			win: 40,
			tie: 0,
			loss: 4,
			total: 44
		});
		// A royal flush on the board: everybody plays the board.
		expect(handVsHand(hole('2c2d'), hole('3c3d'), cards('As Ks Qs Js Ts'))).toEqual({
			win: 0,
			tie: 1,
			loss: 0,
			total: 1
		});
	});

	it('rejects shared cards and impossible boards', () => {
		expect(() => handVsHand(hole('AhAs'), hole('AhKd'))).toThrow(RangeError);
		expect(() => handVsHand(hole('AhAs'), hole('KdKc'), cards('Ah 2c 3c'))).toThrow(RangeError);
		expect(() => handVsHand(hole('AhAs'), hole('KdKc'), cards('2c 3c'))).toThrow(RangeError);
	});
});

describe('ranges', () => {
	const board = cards('8c 7d 2h Ks');
	const villains = range(['AsKd', 1], ['QhQd', 0.5], ['8h8s', 0.25], ['Kh2c', 1], ['JcTc', 2]);

	it('weighs each range hand by its weight and skips blocked hands', () => {
		const hero = hole('AhKc');
		const expected = { win: 0, tie: 0, loss: 0, total: 0 };
		// None of these shares a card with the hero or the board; Ah9h, added
		// below with a large weight, shares the hero's ace and must not count.
		for (const v of villains) {
			const t = handVsHand(hero, v.cards, board);
			expected.win += v.weight * t.win;
			expected.tie += v.weight * t.tie;
			expected.loss += v.weight * t.loss;
			expected.total += v.weight * t.total;
		}
		const blocked = [...villains, { cards: hole('Ah9h'), weight: 3 }];
		expect(handVsRange(hero, blocked, board)).toEqual(expected);
	});

	it('sums hand against range over the first range', () => {
		const heroes = range(['AhKc', 1], ['9c6c', 0.5], ['7h7s', 2]);
		const total = { win: 0, tie: 0, loss: 0, total: 0 };
		for (const h of heroes) {
			const t = handVsRange(h.cards, villains, board);
			total.win += h.weight * t.win;
			total.tie += h.weight * t.tie;
			total.loss += h.weight * t.loss;
			total.total += h.weight * t.total;
		}
		const both = rangeVsRange(heroes, villains, board);
		expect(both).toEqual(total);
		const back = rangeVsRange(villains, heroes, board);
		expect(back.win).toBeCloseTo(both.loss, 9);
		expect(back.tie).toBeCloseTo(both.tie, 9);
	});

	it('works on the flop and pre-flop against small ranges', () => {
		const flop = cards('Qs 9d 4c');
		const t = handVsRange(hole('AcAd'), range(['KhKd', 1], ['Th8h', 1]), flop);
		expect(t.total).toBe(2 * 990);
		const pre = handVsRange(hole('AcAd'), range(['KhKs', 1]));
		expect(pre).toEqual(handVsHand(hole('AcAd'), hole('KhKs')));
	});
});
