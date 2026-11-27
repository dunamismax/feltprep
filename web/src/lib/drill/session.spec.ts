import { describe, expect, it } from 'vitest';
import {
	PROGRESS_KEY,
	SESSION_KEY,
	addToProgress,
	advance,
	current,
	isFinished,
	loadProgress,
	loadSession,
	newSession,
	newTargetedSession,
	dealOf,
	record,
	saveSession,
	summarize,
	type Answer,
	type KeyValueStore
} from './session.ts';

function memory(): KeyValueStore & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k)
	};
}

const answer = (index: number, over: Partial<Answer> = {}): Answer => ({
	index,
	seat: 'button',
	hand: 'AA',
	action: { kind: 'raise', amount: 1000 },
	taken: 'jam',
	graded: true,
	band: 'acceptable',
	reason: null,
	loss: 0,
	best: 'jam',
	...over
});

describe('a drill session', () => {
	it('moves from a decision to its feedback and on to the next', () => {
		let s = newSession(10, 'both', 123);
		expect(current(s)).toBe(0);
		s = record(s, answer(0));
		expect(current(s)).toBe(0);
		expect(s.reviewing).toBe(true);
		expect(() => record(s, answer(1))).toThrow(RangeError);
		s = advance(s);
		expect(current(s)).toBe(1);
	});

	it('finishes after its length once the last feedback is dismissed', () => {
		let s = { ...newSession(10, 'button', 1), length: 2 };
		s = advance(record(s, answer(0)));
		s = record(s, answer(1));
		expect(isFinished(s)).toBe(false);
		expect(isFinished(advance(s))).toBe(true);
	});

	it('survives a round trip through storage, as after a reload', () => {
		const store = memory();
		const s = record(newSession(12, 'big-blind', 99), answer(0, { seat: 'big-blind' }));
		saveSession(store, s);
		expect(loadSession(store)).toEqual(s);
	});

	it('keeps a drill of one spot, its plan and where it came from', () => {
		const store = memory();
		const plan: (readonly [number, number] | null)[] = [[45, 12], null, [40, 3], null];
		const s = newTargetedSession(12, 'big-blind', 5, plan, 'practice');
		expect(s).toMatchObject({ length: 4, mode: 'big-blind', from: 'practice' });
		saveSession(store, s);
		expect(loadSession(store)).toEqual(s);
		expect([...dealOf(s, 0).state.holeCards[dealOf(s, 0).player]!].sort()).toEqual([12, 45]);
		expect(dealOf(s, 1).seat).toBe('big-blind');
		for (const bad of [
			{ ...s, plan: plan.slice(1) },
			{ ...s, mode: 'both' },
			{ ...s, plan: [[45, 45], null, null, null] },
			{ ...s, plan: [[45, 52], null, null, null] },
			{ ...s, from: 'elsewhere' }
		]) {
			store.data.set(SESSION_KEY, JSON.stringify(bad));
			expect(loadSession(store)).toBeNull();
		}
	});

	it('ignores stored data it cannot trust', () => {
		const store = memory();
		for (const bad of [
			'not json',
			'{"version":2}',
			JSON.stringify({ ...newSession(10, 'both', 1), mode: 'cutoff' }),
			JSON.stringify({ ...newSession(10, 'both', 1), answers: [answer(1)] })
		]) {
			store.data.set(SESSION_KEY, bad);
			expect(loadSession(store)).toBeNull();
		}
	});
});

describe('summaries and progress', () => {
	const answers = [
		answer(0),
		answer(1, { band: 'mistake', loss: 1.5 }),
		answer(2, { band: 'inaccuracy', loss: 0.04 }),
		answer(3, { graded: false, band: null, reason: 'action-outside-game', loss: 0 })
	];

	it('count each band and the big blinds given up', () => {
		expect(summarize(answers)).toEqual({
			decisions: 4,
			graded: 3,
			acceptable: 1,
			inaccuracies: 1,
			mistakes: 1,
			loss: 1.54
		});
	});

	it('add up per depth across sessions', () => {
		const store = memory();
		const session = { ...newSession(10, 'both', 1), answers };
		addToProgress(store, session);
		const p = addToProgress(store, session);
		expect(p.byStack['10']).toMatchObject({ sessions: 2, decisions: 8, mistakes: 2 });
		expect(loadProgress(store)).toEqual(p);
		store.data.set(PROGRESS_KEY, '{');
		expect(loadProgress(store)).toEqual({ version: 1, byStack: {} });
	});
});
