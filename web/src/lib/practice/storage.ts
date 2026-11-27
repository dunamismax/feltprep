// The practice session in browser storage (Q-4's default), checked on the way
// in: a value that does not parse, has another version or holds a depth the
// table does not offer is ignored.

import type { KeyValueStore } from '../drill/session.ts';
import { PRACTICE_STACKS, type PracticeSession } from './table.ts';

export const PRACTICE_KEY = 'feltprep.practice.short-stack.v1';

export function loadPractice(store: KeyValueStore): PracticeSession | null {
	let s: Partial<PracticeSession> | null;
	try {
		const text = store.getItem(PRACTICE_KEY);
		s = text === null ? null : (JSON.parse(text) as Partial<PracticeSession>);
	} catch {
		return null;
	}
	if (
		!s ||
		s.version !== 1 ||
		!PRACTICE_STACKS.includes(s.stack as number) ||
		typeof s.seed !== 'number' ||
		(s.player !== 0 && s.player !== 1) ||
		typeof s.hand !== 'number' ||
		!Array.isArray(s.actions) ||
		!Array.isArray(s.finished) ||
		typeof s.net !== 'number' ||
		typeof s.played !== 'number'
	) {
		return null;
	}
	return s as PracticeSession;
}

export function savePractice(store: KeyValueStore, session: PracticeSession): void {
	try {
		store.setItem(PRACTICE_KEY, JSON.stringify(session));
	} catch {
		// Storage full or blocked: play goes on, it just will not resume.
	}
}
