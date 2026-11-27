// SHA-256 through the Web Crypto API, which browsers and Node both provide as
// `globalThis.crypto`, so the reader checks hashes in either place.

/** Lower-case hexadecimal SHA-256 of `bytes`. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** UTF-8 bytes of a string. */
export function utf8(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}
