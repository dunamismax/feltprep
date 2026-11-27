<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>FeltPrep</title>
	<meta
		name="description"
		content="Learn, study and practice No-Limit Texas Hold'em. FeltPrep is in development."
	/>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5 py-12">
	<h1 class="text-4xl font-semibold tracking-tight">FeltPrep</h1>
	<p class="text-lg leading-relaxed">
		One place to learn, study and practice No-Limit Texas Hold’em: learn why a decision works, drill
		it in realistic spots, then apply it in full practice hands.
	</p>
	<p class="rounded-panel border border-line bg-raised px-4 py-3 text-muted">
		FeltPrep is in development. The first solved spot has a lesson, and can be studied, drilled,
		played in full hands and reviewed now.
	</p>
	<a
		href={resolve('/learn/[lesson]', { lesson: 'jam-or-fold-10bb' })}
		class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
	>
		<span class="text-sm font-semibold tracking-wide text-muted uppercase">Learn</span>
		<span class="text-lg font-semibold text-accent">Jam or fold: heads-up at 10 big blinds</span>
		<span class="text-sm text-muted">
			Why short stacks move all-in so often, and how to answer.
		</span>
	</a>
	<a
		href={resolve('/study/jam-or-fold/[stack]', { stack: '10' })}
		class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
	>
		<span class="text-sm font-semibold tracking-wide text-muted uppercase">Study</span>
		<span class="text-lg font-semibold text-accent">Jam or fold, heads-up, 2 to 15 big blinds</span>
		<span class="text-sm text-muted">The solved strategy for both seats, hand by hand.</span>
	</a>
	<a
		href={resolve('/drill/jam-or-fold/[stack]', { stack: '10' })}
		class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
	>
		<span class="text-sm font-semibold tracking-wide text-muted uppercase">Drill</span>
		<span class="text-lg font-semibold text-accent">Jam or fold, graded</span>
		<span class="text-sm text-muted">
			Twenty decisions at a time, each graded against the solved game at once.
		</span>
	</a>
	<a
		href={resolve('/practice/[stack]', { stack: '12' })}
		class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
	>
		<span class="text-sm font-semibold tracking-wide text-muted uppercase">Practice</span>
		<span class="text-lg font-semibold text-accent">Heads-up, 10 to 15 big blinds</span>
		<span class="text-sm text-muted">Complete hands against a practice opponent.</span>
	</a>
	<p class="text-sm text-muted">
		Free software under the GNU AGPL.
		<a
			class="text-accent underline underline-offset-2"
			href="https://github.com/dunamismax/feltprep"
		>
			Source code
		</a>
	</p>
</main>
