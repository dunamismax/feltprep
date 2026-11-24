import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('home page', () => {
	it('names FeltPrep and says it is in development', async () => {
		await render(Page);
		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('FeltPrep');
		await expect.element(page.getByText(/in development/)).toBeInTheDocument();
	});
});
