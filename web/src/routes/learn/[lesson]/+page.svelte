<script lang="ts">
	// One lesson (P3.2): the text, then its spots' study view, drill and
	// practice table, and the lesson text's license (D-12).
	import { resolve } from '$app/paths';
	import LessonBody from '#lib/lessons/LessonBody.svelte';
	import { LESSON_LICENSE } from '#lib/lessons/lessons.ts';
	import { PRACTICE_STACKS } from '#lib/practice/table.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	interface SpotLinks {
		readonly id: string;
		readonly name: string;
		readonly stack: string;
		readonly seat: 'button' | 'big-blind';
	}

	// The jam-or-fold spots a lesson names, each with its study view and drill.
	const spots = $derived(
		data.lesson.spots.flatMap((id): SpotLinks[] => {
			const m = /^jof-(\d+)bb-(button|big-blind)$/.exec(id);
			if (!m) return [];
			const stack = m[1];
			const seat = m[2] === 'button' ? 'button' : 'big-blind';
			return [
				{
					id,
					name: `${seat === 'button' ? 'On the button' : 'In the big blind'}, ${stack} big blinds`,
					stack,
					seat
				}
			];
		})
	);
	const practiceStack = $derived.by(() => {
		const depths = data.lesson.spots
			.map((id) => Number(/^jof-(\d+)bb-/.exec(id)?.[1]))
			.filter((d) => PRACTICE_STACKS.includes(d));
		return depths.length ? depths[0] : null;
	});
</script>

<svelte:head>
	<title>{data.lesson.title} · FeltPrep</title>
	<meta name="description" content={data.lesson.summary} />
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-4 pb-10 sm:px-6">
	<header class="flex flex-col gap-1">
		<div class="flex items-center justify-between gap-2 text-sm">
			<a href={resolve('/')} class="text-accent underline underline-offset-2">FeltPrep</a>
			<a href={resolve('/learn')} class="text-accent underline underline-offset-2">Lessons</a>
		</div>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">
			Lesson {data.lesson.order}
		</p>
		<h1 class="text-2xl font-semibold tracking-tight">{data.lesson.title}</h1>
		<p class="text-lg text-muted" data-testid="summary">{data.lesson.summary}</p>
	</header>

	<article data-testid="lesson">
		<LessonBody blocks={data.lesson.body} />
	</article>

	<section aria-labelledby="practise" class="flex flex-col gap-3" data-testid="lesson-spots">
		<h2 id="practise" class="text-xl font-semibold tracking-tight">Study it, then drill it</h2>
		{#each spots as s (s.id)}
			<div class="flex flex-col gap-2 rounded-panel border border-line-strong bg-raised px-4 py-3">
				<p class="font-semibold">{s.name}</p>
				<div class="grid grid-cols-2 gap-2">
					<a
						href={s.seat === 'button'
							? resolve('/study/jam-or-fold/[stack]#button', { stack: s.stack })
							: resolve('/study/jam-or-fold/[stack]#big-blind', { stack: s.stack })}
						class="flex min-h-target items-center justify-center rounded-md border border-accent px-3 font-semibold text-accent"
					>
						Study
					</a>
					<a
						href={resolve(`drill/jam-or-fold/${s.stack}?seat=${s.seat}`)}
						class="flex min-h-target items-center justify-center rounded-md bg-accent px-3 font-semibold text-on-accent"
					>
						Drill
					</a>
				</div>
			</div>
		{/each}
		{#if practiceStack}
			<a
				href={resolve('/practice/[stack]', { stack: String(practiceStack) })}
				class="flex min-h-target items-center justify-center rounded-md border border-line-strong bg-raised px-3 font-semibold text-accent"
			>
				Play full hands at {practiceStack} big blinds
			</a>
		{/if}
		{#if data.next}
			<a
				href={resolve('/learn/[lesson]', { lesson: data.next.id })}
				class="text-accent underline underline-offset-2"
			>
				Next lesson: {data.next.title}
			</a>
		{/if}
	</section>

	<footer class="border-t border-line pt-4 text-sm text-muted" data-testid="lesson-license">
		The text of this lesson is licensed under
		<a href={LESSON_LICENSE.url} rel="external license" class="text-accent underline">
			{LESSON_LICENSE.name}
		</a>
		({LESSON_LICENSE.id}): you may share and adapt it, with credit to FeltPrep, under the same
		terms. The FeltPrep name and artwork are not covered by it.
	</footer>
</main>
