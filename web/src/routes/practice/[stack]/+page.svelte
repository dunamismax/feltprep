<script lang="ts">
	// The short-stack practice table (P3.5): complete heads-up hands against
	// the practice opponent, the button alternating. The session lives in
	// local storage, so a reload returns to the same decision; `?seed=` fixes
	// the deals and the opponent's draws for tests.
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import ActionPanel from '#lib/table/ActionPanel.svelte';
	import TableView from '#lib/table/TableView.svelte';
	import { cryptoRandom } from '#lib/engine/random.ts';
	import { legalActions, type Action, type Street } from '#lib/engine/state.ts';
	import { targetQuery, type Holes } from '#lib/drill/jam-or-fold.ts';
	import { explain } from '#lib/solver/explain.ts';
	import { describeAction } from '#lib/table/actions.ts';
	import type { Band, Seat } from '#lib/spots/types.ts';
	import type { KeyValueStore } from '#lib/drill/session.ts';
	import {
		BIG_BLIND,
		newPracticeSession,
		nextHand,
		outcome,
		playCurrent,
		takeAction,
		type PracticeSession
	} from '#lib/practice/table.ts';
	import { loadPractice, savePractice } from '#lib/practice/storage.ts';
	import { uploadOf } from '#lib/practice/upload.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let store: KeyValueStore | null = null;
	let session = $state<PracticeSession | null>(null);

	function persist() {
		if (store && session) savePractice(store, session);
	}

	function start(seed: number | null) {
		session = newPracticeSession(data.stack, seed ?? cryptoRandom.below(2 ** 32));
		persist();
	}

	onMount(() => {
		try {
			store = window.localStorage;
		} catch {
			store = null;
		}
		const seedText = new URLSearchParams(location.search).get('seed');
		const wantSeed = seedText && /^\d{1,10}$/.test(seedText) ? Number(seedText) >>> 0 : null;
		const saved = store ? loadPractice(store) : null;
		if (saved && saved.stack === data.stack && (wantSeed === null || saved.seed === wantSeed)) {
			try {
				playCurrent(data.solution, saved);
				session = saved;
				return;
			} catch {
				// A stored hand that no longer replays starts a fresh session.
			}
		}
		start(wantSeed);
	});

	const played = $derived(session ? playCurrent(data.solution, session) : null);
	const legal = $derived(played?.waiting ? legalActions(played.state) : null);
	const over = $derived(played !== null && !played.waiting);
	const showdown = $derived(played?.state.result?.showdown ?? false);

	function act(action: Action) {
		if (!session || !legal) return;
		session = takeAction(data.solution, session, action);
		persist();
	}

	function next() {
		if (!session || !over) return;
		session = nextHand(data.solution, session);
		persist();
		upload(session);
	}

	/** Send the hand just finished to be stored; it stays in this browser either way. */
	function upload(s: PracticeSession) {
		const hand = s.finished[s.finished.length - 1];
		if (!hand) return;
		void fetch(resolve('/api/hands'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(uploadOf(s, hand)),
			keepalive: true
		}).catch(() => {});
	}

	const BAND_NAME: Record<Band, string> = {
		acceptable: 'Acceptable',
		inaccuracy: 'Inaccuracy',
		mistake: 'Mistake'
	};
	const BAND_CLASS: Record<Band, string> = {
		acceptable: 'border-good bg-good-soft',
		inaccuracy: 'border-warn bg-warn-soft',
		mistake: 'border-bad bg-bad-soft'
	};
	const BAND_TEXT: Record<Band, string> = {
		acceptable: 'text-good',
		inaccuracy: 'text-warn',
		mistake: 'text-bad'
	};
	const STREET: Record<Street, string> = { 0: 'Before the flop', 1: 'Flop', 2: 'Turn', 3: 'River' };
	const PAST: Record<string, string> = { fold: 'folded', jam: 'jammed', call: 'called' };

	interface GradedLine {
		readonly key: number;
		readonly band: Band;
		readonly street: string;
		readonly taken: string;
		readonly loss: number;
		readonly text: string | null;
		readonly gloss: string | null;
		readonly drill: string | null;
		readonly seat: Seat;
	}

	// The finished hand's decisions (P3.9): every graded one with its verdict
	// and cost; an inaccuracy or a mistake also with its explanation and a link
	// that drills that decision. Built here, not inline in {#each} (AGENTS.md 13).
	const graded = $derived.by((): GradedLine[] => {
		if (!session || !played || !over) return [];
		const holes = played.state.holeCards[session.player] as Holes;
		// Equity is defined in the first explanation the session shows.
		let define = !session.finished.some((h) =>
			h.decisions.some((d) => d.verdict.graded && d.verdict.band !== 'acceptable')
		);
		return played.decisions.flatMap((d, key) => {
			const v = d.verdict;
			if (!v.graded) return [];
			const explained = v.band !== 'acceptable';
			const e = explained ? explain(v, data.facts, define) : null;
			if (explained) define = false;
			const seat: Seat = v.spot.endsWith('-button') ? 'button' : 'big-blind';
			return [
				{
					key,
					band: v.band,
					street: STREET[d.street] ?? '',
					taken: PAST[v.action] ?? v.action,
					loss: v.loss,
					text: e?.text ?? null,
					gloss: e?.gloss ?? null,
					drill: explained ? targetQuery(seat, holes, 'practice') : null,
					seat
				}
			];
		});
	});

	/** The player's decisions that were not graded, one line per reason. */
	const ungraded = $derived.by(() => {
		if (!played || !over) return [];
		const lines: { detail: string; whats: string[] }[] = [];
		for (const d of played.decisions) {
			if (d.verdict.graded) continue;
			const what = `${STREET[d.street] ?? ''}, ${describeAction(d.action, BIG_BLIND)}`;
			const line = lines.find((l) => d.verdict.graded === false && l.detail === d.verdict.detail);
			if (line) line.whats.push(what);
			else lines.push({ detail: d.verdict.detail, whats: [what] });
		}
		return lines.map((l) => ({ detail: l.detail, whats: l.whats.join('; ') }));
	});

	/** "Review this hand": close it, so the table resumes at the next one, then review it. */
	function review(event: MouseEvent) {
		event.preventDefault();
		if (!session || !over) return;
		const n = session.hand;
		session = nextHand(data.solution, session);
		persist();
		upload(session);
		void goto(resolve(`practice/${data.stack}/review?hand=${n}`));
	}

	/** "Drill this spot": close this hand, so the table resumes at the next one, then drill. */
	function drill(event: MouseEvent, query: string) {
		event.preventDefault();
		if (session && over) {
			session = nextHand(data.solution, session);
			persist();
			upload(session);
		}
		void goto(resolve(`drill/jam-or-fold/${data.stack}${query}`));
	}

	const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)} bb`;
</script>

<svelte:head>
	<title>Practice at {data.stack} big blinds · FeltPrep</title>
	<meta
		name="description"
		content="Play complete heads-up hands at {data.stack} big blinds against a practice opponent."
	/>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-3 pt-4 sm:px-6">
	<header class="flex flex-col gap-1 px-1">
		<div class="flex items-center justify-between gap-2 text-sm">
			<a href={resolve('/')} class="text-accent underline underline-offset-2">FeltPrep</a>
			<a
				href={resolve('/drill/jam-or-fold/[stack]', { stack: String(data.stack) })}
				class="text-accent underline underline-offset-2"
			>
				Drill
			</a>
		</div>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">Practice</p>
		<h1 class="text-2xl font-semibold tracking-tight">Heads-up at {data.stack} big blinds</h1>
		<details class="text-sm">
			<summary class="flex min-h-target cursor-pointer items-center text-muted">
				About the opponent, and other depths
			</summary>
			<div class="flex flex-col gap-2 pb-2">
				<p data-testid="opponent-label">
					Your practice opponent plays the solved jam-or-fold strategy when a hand is inside that
					game, and a simple rule-based style everywhere else. It is something to play against, not
					a source of right answers.
				</p>
				<p>
					Each finished hand is kept in this browser and saved on FeltPrep’s own server under a
					random guest cookie, so it can be reviewed later. There is no sign-in, and nothing is
					shared with anyone else.
				</p>
				<ul class="flex flex-wrap gap-1.5">
					{#each data.stacks as s (s)}
						<li>
							<a
								href={resolve('/practice/[stack]', { stack: String(s) })}
								aria-current={s === data.stack ? 'page' : undefined}
								class="flex size-target items-center justify-center rounded-md border font-mono tabular-nums {s ===
								data.stack
									? 'border-accent bg-accent font-semibold text-on-accent'
									: 'border-line-strong bg-raised'}"
							>
								{s}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</details>
	</header>

	{#if session && played}
		<p class="px-1 text-sm text-muted" data-testid="session-line">
			Hand {session.hand + 1}{#if session.played > 0}
				· {signed(session.net)} over {session.played}
				{session.played === 1 ? 'hand' : 'hands'}{/if}
		</p>
		<TableView
			state={played.state}
			player={session.player}
			reveal={over && showdown}
			opponentName="Practice opponent"
		/>
	{:else}
		<p class="py-16 text-center text-muted">Dealing…</p>
	{/if}

	<section aria-label="Result" aria-live="polite" class="flex min-h-32 flex-col gap-2 px-1">
		{#if session && played && over}
			<div
				class="flex flex-col gap-2 rounded-panel border border-line-strong bg-raised p-3"
				data-testid="result"
			>
				<div class="flex items-start justify-between gap-3">
					<p class="font-semibold" data-testid="outcome">
						{outcome(played.state, session.player)}
					</p>
					<button
						type="button"
						class="min-h-target shrink-0 rounded-md bg-accent px-4 font-semibold text-on-accent"
						onclick={next}
					>
						Next hand
					</button>
				</div>
				{#each graded as g (g.key)}
					<div
						class="flex flex-col gap-1.5 rounded-panel border p-2.5 {BAND_CLASS[g.band]}"
						data-testid="graded-decision"
					>
						<div class="flex items-start justify-between gap-3">
							<p class="text-sm">
								<span class="font-semibold {BAND_TEXT[g.band]}" data-testid="decision-verdict">
									{BAND_NAME[g.band]}
								</span>
								· {g.street}, you {g.taken}{#if g.loss > 0.005}, giving up
									<strong class="font-mono" data-testid="decision-cost">
										{g.loss.toFixed(2)} bb
									</strong>{:else}, at no cost{/if}.
							</p>
							{#if g.drill}
								<a
									href={resolve(`drill/jam-or-fold/${data.stack}${g.drill}`)}
									onclick={(e) => g.drill && drill(e, g.drill)}
									class="flex min-h-target shrink-0 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-on-accent"
									data-testid="drill-this-spot"
								>
									Drill this spot
								</a>
							{/if}
						</div>
						{#if g.text}
							<p class="text-sm" data-testid="decision-reason">{g.text}</p>
						{/if}
						{#if g.gloss}
							<p class="text-sm text-muted">{g.gloss}</p>
						{/if}
						{#if g.text && data.lessons[g.seat]}
							<a
								href={resolve('/learn/[lesson]', { lesson: data.lessons[g.seat]?.id ?? '' })}
								class="self-start text-sm font-semibold text-accent underline"
								data-testid="decision-lesson"
							>
								Read the lesson
							</a>
						{/if}
					</div>
				{/each}
				<a
					href={resolve('/practice/[stack]/review', { stack: String(data.stack) })}
					onclick={review}
					class="self-start text-sm font-semibold text-accent underline"
					data-testid="review-hand"
				>
					Review this hand
				</a>
				{#each ungraded as u (u.detail)}
					<p class="text-sm text-muted" data-testid="not-graded">
						Not graded ({u.whats}): {u.detail}
					</p>
				{/each}
			</div>
		{:else if played?.waiting}
			<p class="text-sm text-muted" data-testid="your-turn">Your turn.</p>
		{/if}
	</section>

	<div class="sticky bottom-0 -mx-3 mt-auto bg-surface px-3 pt-2 pb-3 sm:-mx-6 sm:px-6">
		<ActionPanel
			{legal}
			behind={played && session ? played.state.stacks[session.player] : 0}
			bigBlind={BIG_BLIND}
			onact={act}
		/>
	</div>
</main>
