// POST /api/hands: store a finished short-stack practice hand for the guest
// (P3.5b). The hand is replayed on the engine first, so an action the engine
// would not have offered is refused with 422 whether or not a database is
// configured (Gate A's server item). Without a database the check still runs
// and the answer is 503: nothing is stored.
import { json } from '@sveltejs/kit';
import { getDb, hasDatabase } from '#lib/server/db/index.ts';
import {
	GUEST_COOKIE,
	GUEST_COOKIE_MAX_AGE,
	isGuestToken,
	newGuestToken,
	storeHand
} from '#lib/server/hands.ts';
import { MAX_UPLOAD, checkUpload } from '#lib/practice/upload.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

const NO_STORE = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD) {
		return json({ error: 'the hand is too large' }, { status: 413, headers: NO_STORE });
	}
	const text = await request.text();
	if (text.length > MAX_UPLOAD) {
		return json({ error: 'the hand is too large' }, { status: 413, headers: NO_STORE });
	}
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return json({ error: 'expected JSON' }, { status: 400, headers: NO_STORE });
	}
	const checked = checkUpload(body);
	if (!checked.ok) {
		return json({ error: checked.error }, { status: checked.status, headers: NO_STORE });
	}
	if (!hasDatabase()) {
		return json(
			{ stored: false, error: 'storage is not configured' },
			{ status: 503, headers: NO_STORE }
		);
	}
	let token = cookies.get(GUEST_COOKIE);
	if (!isGuestToken(token)) token = newGuestToken();
	cookies.set(GUEST_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// Always Secure on the live https site; plain http only in local testing.
		secure: url.protocol === 'https:',
		maxAge: GUEST_COOKIE_MAX_AGE
	});
	const result = await storeHand(getDb(), token, checked.hand);
	return json(
		{ stored: true, duplicate: result === 'duplicate' },
		{ status: result === 'stored' ? 201 : 200, headers: NO_STORE }
	);
};
