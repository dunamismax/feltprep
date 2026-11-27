<script lang="ts">
	// A lesson's body (P3.2), rendered from the parsed Markdown subset as
	// elements, never as HTML, so lesson text cannot inject markup or styles.
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import type { Block, Inline } from './markdown.ts';

	let { blocks }: { blocks: readonly Block[] } = $props();

	/** A site path from a lesson ("/drill/jam-or-fold/10?seat=button") through resolve(). */
	const internal = (href: string) => resolve(href.slice(1) as Path);
</script>

{#snippet inline(children: readonly Inline[])}
	{#each children as c, i (i)}
		{#if c.kind === 'text'}{c.text}{:else if c.kind === 'strong'}<strong class="font-semibold">
				{@render inline(c.children)}
			</strong>{:else if c.kind === 'em'}<em>
				{@render inline(c.children)}
			</em>{:else if c.kind === 'code'}<code
				class="rounded bg-neutral-soft px-1 font-mono text-[0.95em]"
			>
				{c.text}
			</code>{:else if c.href.startsWith('/')}<a
				href={internal(c.href)}
				class="font-semibold text-accent underline underline-offset-2"
			>
				{@render inline(c.children)}
			</a>{:else}<a
				href={c.href}
				rel="external noopener"
				class="text-accent underline underline-offset-2"
			>
				{@render inline(c.children)}
			</a>{/if}
	{/each}
{/snippet}

<div class="flex flex-col gap-4 text-[1.0625rem] leading-relaxed">
	{#each blocks as b, i (i)}
		{#if b.kind === 'heading' && b.level === 2}
			<h2 class="mt-4 text-xl font-semibold tracking-tight">{@render inline(b.children)}</h2>
		{:else if b.kind === 'heading'}
			<h3 class="mt-2 text-lg font-semibold">{@render inline(b.children)}</h3>
		{:else if b.kind === 'paragraph'}
			<p>{@render inline(b.children)}</p>
		{:else if b.kind === 'note'}
			<p class="rounded-panel border border-line-strong bg-raised px-4 py-3 text-base">
				{@render inline(b.children)}
			</p>
		{:else if b.kind === 'list' && b.ordered}
			<ol class="flex list-decimal flex-col gap-2 pl-6">
				{#each b.items as item, k (k)}<li>{@render inline(item)}</li>{/each}
			</ol>
		{:else if b.kind === 'list'}
			<ul class="flex list-disc flex-col gap-2 pl-6">
				{#each b.items as item, k (k)}<li>{@render inline(item)}</li>{/each}
			</ul>
		{/if}
	{/each}
</div>
