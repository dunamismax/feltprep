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
		FeltPrep is in development. The first solved spot can be studied now; lessons, drills and
		practice hands come next.
	</p>
	<a
		href={resolve('/study/jam-or-fold/[stack]', { stack: '10' })}
		class="flex min-h-target flex-col gap-1 rounded-panel border border-line-strong bg-raised px-4 py-3 hover:border-accent"
	>
		<span class="text-sm font-semibold tracking-wide text-muted uppercase">Study</span>
		<span class="text-lg font-semibold text-accent">Jam or fold, heads-up, 2 to 15 big blinds</span>
		<span class="text-sm text-muted">The solved strategy for both seats, hand by hand.</span>
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
