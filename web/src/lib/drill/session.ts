// A drill session and the player's progress, kept in the browser (Q-4's
// default: no sign-in). Everything is plain JSON under versioned keys, read
// through a Storage-like object so tests can pass their own. A stored value
// that does not parse or has another version is ignored, never trusted.

import type { ActionKind } from '../engine/state.ts';
import type { Band, NotGradedReason, Seat } from '../spots/types.ts';
import { SEAT_MODES, SESSION_LENGTH, type SeatMode } from './jam-or-fold.ts';

export interface KeyValueStore {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/** One answered decision, with what the feedback showed. */
export interface Answer {
	readonly index: number;
	readonly seat: Seat;
	readonly hand: string;
	/** The engine action taken, so the feedback can be shown again after a reload. */
	readonly action: { readonly kind: ActionKind; readonly amount: number | null };
	/** What the player did, as the panel named it: "fold", "jam", "call", "limp", "raise to 2.5". */
	readonly taken: string;
	readonly graded: boolean;
	readonly band: Band | null;
	readonly reason: NotGradedReason | null;
	/** Big blinds given up against the best action; 0 when not graded. */
	readonly loss: number;
	readonly best: string | null;
}

export interface DrillSession {
	readonly version: 1;
	readonly stack: number;
	readonly mode: SeatMode;
	readonly seed: number;
	readonly length: number;
	/** Answers so far, in order; the decision on screen is `answers.length` unless feedback shows. */
	readonly answers: readonly Answer[];
	/** True while the last answer's feedback is on screen. */
	readonly reviewing: boolean;
}

export const SESSION_KEY = 'feltprep.drill.jam-or-fold.session.v1';
export const PROGRESS_KEY = 'feltprep.drill.jam-or-fold.progress.v1';

export function newSession(stack: number, mode: SeatMode, seed: number): DrillSession {
	return { version: 1, stack, mode, seed, length: SESSION_LENGTH, answers: [], reviewing: false };
}

/** The index of the decision on screen. */
export function current(session: DrillSession): number {
	return session.reviewing ? session.answers.length - 1 : session.answers.length;
}

export function isFinished(session: DrillSession): boolean {
	return session.answers.length >= session.length && !session.reviewing;
}

export function record(session: DrillSession, answer: Answer): DrillSession {
	if (session.reviewing || answer.index !== session.answers.length) {
		throw new RangeError('that decision was already answered');
	}
	return { ...session, answers: [...session.answers, answer], reviewing: true };
}

export function advance(session: DrillSession): DrillSession {
	return { ...session, reviewing: false };
}

function readJson(store: KeyValueStore, key: string): unknown {
	try {
		const text = store.getItem(key);
		return text === null ? null : (JSON.parse(text) as unknown);
	} catch {
		return null;
	}
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
	try {
		store.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or blocked: the drill still works, it just will not resume.
	}
}

export function loadSession(store: KeyValueStore): DrillSession | null {
	const s = readJson(store, SESSION_KEY) as Partial<DrillSession> | null;
	if (
		!s ||
		s.version !== 1 ||
		typeof s.stack !== 'number' ||
		typeof s.seed !== 'number' ||
		typeof s.length !== 'number' ||
		!SEAT_MODES.includes(s.mode as SeatMode) ||
		!Array.isArray(s.answers) ||
		typeof s.reviewing !== 'boolean' ||
		s.answers.some((a: Answer, i: number) => a?.index !== i)
	) {
		return null;
	}
	return s as DrillSession;
}

export function saveSession(store: KeyValueStore, session: DrillSession): void {
	writeJson(store, SESSION_KEY, session);
}

export interface Summary {
	readonly decisions: number;
	readonly graded: number;
	readonly acceptable: number;
	readonly inaccuracies: number;
	readonly mistakes: number;
	/** Total big blinds given up on graded decisions. */
	readonly loss: number;
}

export function summarize(answers: readonly Answer[]): Summary {
	const graded = answers.filter((a) => a.graded);
	return {
		decisions: answers.length,
		graded: graded.length,
		acceptable: graded.filter((a) => a.band === 'acceptable').length,
		inaccuracies: graded.filter((a) => a.band === 'inaccuracy').length,
		mistakes: graded.filter((a) => a.band === 'mistake').length,
		loss: graded.reduce((sum, a) => sum + a.loss, 0)
	};
}

/** Totals per depth over every finished session. */
export interface Progress {
	readonly version: 1;
	readonly byStack: Readonly<Record<string, Summary & { readonly sessions: number }>>;
}

const EMPTY: Progress = { version: 1, byStack: {} };

export function loadProgress(store: KeyValueStore): Progress {
	const p = readJson(store, PROGRESS_KEY) as Partial<Progress> | null;
	if (!p || p.version !== 1 || typeof p.byStack !== 'object' || p.byStack === null) return EMPTY;
	return p as Progress;
}

/** Add a finished session's summary to the stored progress and return the new totals. */
export function addToProgress(store: KeyValueStore, session: DrillSession): Progress {
	const progress = loadProgress(store);
	const s = summarize(session.answers);
	const key = String(session.stack);
	const was = progress.byStack[key];
	const next: Progress = {
		version: 1,
		byStack: {
			...progress.byStack,
			[key]: {
				sessions: (was?.sessions ?? 0) + 1,
				decisions: (was?.decisions ?? 0) + s.decisions,
				graded: (was?.graded ?? 0) + s.graded,
				acceptable: (was?.acceptable ?? 0) + s.acceptable,
				inaccuracies: (was?.inaccuracies ?? 0) + s.inaccuracies,
				mistakes: (was?.mistakes ?? 0) + s.mistakes,
				loss: (was?.loss ?? 0) + s.loss
			}
		}
	};
	writeJson(store, PROGRESS_KEY, next);
	return next;
}
