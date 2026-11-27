<script lang="ts">
	// The lessons, in their recommended order (P3.2).
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Lessons · FeltPrep</title>
	<meta
		name="description"
		content="Short lessons on No-Limit Hold’em decisions, each with its solved spot and a drill."
	/>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
	<header class="flex flex-col gap-1">
		<a href={resolve('/')} class="self-start text-sm text-accent underline underline-offset-2">
			FeltPrep
		</a>
		<p class="text-sm font-semibold tracking-wide text-muted uppercase">Learn</p>
		<h1 class="text-2xl font-semibold tracking-tight">Lessons</h1>
	</header>
	<ol class="flex flex-col gap-3">
		{#each data.lessons as l (l.id)}
			<li>
				<a
					href={resolve('/learn/[lesson]', { lesson: l.id })}
					class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
				>
					<span class="text-sm text-muted">Lesson {l.order}</span>
					<span class="text-lg font-semibold text-accent">{l.title}</span>
					<span class="text-sm text-muted">{l.summary}</span>
				</a>
			</li>
		{/each}
	</ol>
</main>
