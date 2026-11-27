import { describe, expect, it } from 'vitest';
import { historyOf, historyToDict, type JsonObject } from '../engine/history.ts';
import { seededRandom } from '../engine/random.ts';
import { Action, apply, handConfig, startHand } from '../engine/state.ts';
import { jamOrFoldAt } from '../server/solutions.ts';
import { newPracticeSession, nextHand, takeAction } from './table.ts';
import { checkUpload, uploadOf, type HandUpload } from './upload.ts';

const solution = await jamOrFoldAt(10);

/** A real finished hand from the table: the button jams and the big blind decides. */
function finished(): HandUpload {
	// Seed 0: the player is on the button for hand 0.
	let session = newPracticeSession(10, 0);
	session = takeAction(solution, session, Action.raiseTo(1000));
	session = nextHand(solution, session);
	return uploadOf(session, session.finished[0]);
}

const withActions = (upload: HandUpload, actions: JsonObject[]): HandUpload => ({
	...upload,
	history: { ...upload.history, actions }
});

describe('checkUpload', () => {
	it('accepts a hand the table played, with the player’s result', () => {
		const upload = finished();
		expect(upload.key).toBe('0:0');
		const result = checkUpload(JSON.parse(JSON.stringify(upload)));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.hand.history).toEqual(upload.history);
		// The table's own result for the hand, in big blinds, as chips.
		let session = newPracticeSession(10, 0);
		session = nextHand(solution, takeAction(solution, session, Action.raiseTo(1000)));
		expect(result.hand.netChips).toBe(Math.round(session.finished[0].net * 100));
		expect(Math.abs(result.hand.netChips) === 100 || Math.abs(result.hand.netChips) === 1000).toBe(
			true
		);
	});

	it('refuses an action the engine does not offer', () => {
		const upload = finished();
		// A jam to more than the stack, then a call.
		const actions: JsonObject[] = [{ action: 'raise', amount: 1500 }, { action: 'call' }];
		expect(checkUpload(withActions(upload, actions))).toMatchObject({ ok: false, status: 422 });
		// A check facing the big blind.
		expect(checkUpload(withActions(upload, [{ action: 'check' }]))).toMatchObject({
			ok: false,
			status: 422
		});
		// An action after the hand ended.
		const done = upload.history.actions as JsonObject[];
		expect(checkUpload(withActions(upload, [...done, { action: 'fold' }]))).toMatchObject({
			ok: false,
			status: 422
		});
	});

	it('refuses a hand that has not finished', () => {
		expect(checkUpload(withActions(finished(), []))).toMatchObject({
			ok: false,
			status: 422,
			error: 'the hand has not finished'
		});
	});

	it('refuses a hand the short-stack table does not deal', () => {
		const deep = startHand(handConfig(50, 100), [10_000, 10_000], 0, { rng: seededRandom(1) });
		const history = historyToDict(historyOf(apply(deep, Action.fold())));
		const upload = { ...finished(), history };
		expect(checkUpload(upload)).toMatchObject({ ok: false, status: 422 });
	});

	it('refuses what is not an upload', () => {
		for (const body of [
			null,
			[],
			'hand',
			{ ...finished(), format: 2 },
			{ ...finished(), key: 'has spaces' },
			{ ...finished(), stack: 9 },
			{ ...finished(), player: 2 },
			{ ...finished(), history: { format: 1, kind: 'hand_state' } },
			{ ...finished(), history: { ...finished().history, deck: ['As', 'As'] } }
		]) {
			expect(checkUpload(body)).toMatchObject({ ok: false, status: 400 });
		}
	});
});
