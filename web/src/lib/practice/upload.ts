// A finished practice hand as the browser sends it to be stored (P3.5b), and
// the server's check of it. The check replays the hand's history on the
// engine, so any action the engine would not have offered is refused (Gate A's
// server item), and it accepts only what the short-stack table deals: two
// seats, blinds of 50 and 100, no ante, equal stacks at a table depth, and a
// hand that has finished. Plain TypeScript, so the browser builds the upload
// with the same types the server checks.

import {
	FormatError,
	historyFromDict,
	historyToDict,
	replay,
	type JsonObject
} from '../engine/history.ts';
import { IllegalActionError, finalStacks } from '../engine/state.ts';
import { BIG_BLIND, PRACTICE_STACKS, SMALL_BLIND, type FinishedHand } from './table.ts';

export const UPLOAD_FORMAT = 1;
/** The largest upload the server reads, in bytes. A short-stack hand is about 1 KB. */
export const MAX_UPLOAD = 32 * 1024;

export interface HandUpload {
	readonly format: 1;
	/** Unique per hand for one guest, such as "<seed>:<hand number>", so a retry stores it once. */
	readonly key: string;
	readonly stack: number;
	readonly player: 0 | 1;
	/** The engine's hand history document (format 1). */
	readonly history: JsonObject;
}

export interface CheckedHand {
	readonly key: string;
	readonly stack: number;
	readonly player: 0 | 1;
	/** The history as the engine writes it, re-serialized from the parsed one. */
	readonly history: JsonObject;
	/** The player's result in chips. */
	readonly netChips: number;
}

export type CheckResult =
	| { readonly ok: true; readonly hand: CheckedHand }
	| { readonly ok: false; readonly status: 400 | 422; readonly error: string };

export function uploadOf(session: { readonly seed: number }, hand: FinishedHand): HandUpload {
	return {
		format: UPLOAD_FORMAT,
		key: `${session.seed}:${hand.number}`,
		stack: hand.stack,
		player: hand.player as 0 | 1,
		history: hand.history
	};
}

const bad = (error: string): CheckResult => ({ ok: false, status: 400, error });
const refused = (error: string): CheckResult => ({ ok: false, status: 422, error });

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Check an upload by replaying it on the engine. */
export function checkUpload(body: unknown): CheckResult {
	if (!isRecord(body)) return bad('expected a JSON object');
	if (body.format !== UPLOAD_FORMAT) return bad(`expected format ${UPLOAD_FORMAT}`);
	const { key, stack, player } = body;
	if (typeof key !== 'string' || !/^[0-9A-Za-z:._-]{1,64}$/.test(key)) return bad('bad key');
	if (typeof stack !== 'number' || !PRACTICE_STACKS.includes(stack)) return bad('bad stack');
	if (player !== 0 && player !== 1) return bad('bad player');

	let history;
	try {
		history = historyFromDict(body.history);
	} catch (error) {
		if (error instanceof FormatError) return bad(`bad history: ${error.message}`);
		throw error;
	}
	const { config, startingStacks } = history;
	if (
		config.smallBlind !== SMALL_BLIND ||
		config.bigBlind !== BIG_BLIND ||
		config.ante !== 0 ||
		startingStacks.length !== 2 ||
		startingStacks.some((s) => s !== stack * BIG_BLIND)
	) {
		return refused('the hand is not one the short-stack table deals');
	}

	let state;
	try {
		state = replay(history);
	} catch (error) {
		if (error instanceof IllegalActionError) {
			return refused(`the engine does not allow an action in this hand: ${error.message}`);
		}
		if (error instanceof RangeError || error instanceof TypeError || error instanceof FormatError) {
			return bad(`the hand does not replay: ${error.message}`);
		}
		throw error;
	}
	if (state.result === null) return refused('the hand has not finished');
	const netChips = (finalStacks(state)[player] ?? 0) - stack * BIG_BLIND;
	return {
		ok: true,
		hand: { key, stack, player, history: historyToDict(history), netChips }
	};
}
