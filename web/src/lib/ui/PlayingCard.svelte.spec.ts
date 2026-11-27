import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PlayingCard from './PlayingCard.svelte';

describe('PlayingCard', () => {
	it('is one image named for its card', async () => {
		await render(PlayingCard, { card: 'Kh' });
		const img = page.getByRole('img', { name: 'King of hearts' });
		await expect.element(img).toBeInTheDocument();
		await expect.element(img).toHaveAttribute('data-card', 'Kh');
	});

	it('draws the back when hidden, without naming the card', async () => {
		await render(PlayingCard, { card: 'As', hidden: true });
		await expect.element(page.getByRole('img', { name: 'Face-down card' })).toBeInTheDocument();
		await expect.element(page.getByRole('img', { name: 'Ace of spades' })).not.toBeInTheDocument();
	});

	it('is at least 36 pixels wide at its smallest size', async () => {
		await render(PlayingCard, { card: '7c', size: 'sm' });
		const box = page.getByRole('img', { name: 'Seven of clubs' }).element().getBoundingClientRect();
		expect(box.width).toBeGreaterThanOrEqual(36);
		expect(box.height / box.width).toBeCloseTo(1.4, 1);
	});
});
