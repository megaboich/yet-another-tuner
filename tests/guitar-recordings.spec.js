import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { GUITAR_RECORDING_FIXTURES, GUITAR_SEQUENCE_FIXTURE } from './fixtures/guitar-recordings.js';

for (const fixture of GUITAR_RECORDING_FIXTURES) {
	test(`detects recorded string ${fixture.stringNumber} as ${fixture.note}`, async ({ page }) => {
		const recordingPath = fileURLToPath(new URL(`./fixtures/guitar-recordings/${fixture.file}`, import.meta.url));
		await page.route('**/test-guitar-recording.m4a', route => route.fulfill({
			contentType: 'audio/mp4',
			path: recordingPath,
		}));
		await page.addInitScript(() => {
			Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
				configurable: true,
				value: async () => {
					const context = new AudioContext();
					const response = await fetch('/test-guitar-recording.m4a');
					const buffer = await context.decodeAudioData(await response.arrayBuffer());
					const source = context.createBufferSource();
					const destination = context.createMediaStreamDestination();
					source.buffer = buffer;
					source.connect(destination);
					source.start();
					await context.resume();
					return destination.stream;
				},
			});
		});
		await page.goto('./');
		await page.getByRole('button', { name: /Start listening/ }).click();

		await expect(page.locator('#note-name')).toHaveText(fixture.note, { timeout: 10_000 });
	});
}

test('tracks the full six-string sequence without note flicker', async ({ page }) => {
	const recordingPath = fileURLToPath(new URL(`./fixtures/guitar-recordings/${GUITAR_SEQUENCE_FIXTURE.file}`, import.meta.url));
	await page.route('**/test-guitar-sequence.m4a', route => route.fulfill({
		contentType: 'audio/mp4',
		path: recordingPath,
	}));
	await page.addInitScript(() => {
		Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
			configurable: true,
			value: async () => {
				const context = new AudioContext();
				const response = await fetch('/test-guitar-sequence.m4a');
				const buffer = await context.decodeAudioData(await response.arrayBuffer());
				const source = context.createBufferSource();
				const destination = context.createMediaStreamDestination();
				source.buffer = buffer;
				source.connect(destination);
				/** @type {Window & { __sequenceEnded?: boolean }} */
				const testWindow = window;
				testWindow.__sequenceEnded = false;
				source.addEventListener('ended', () => {
					testWindow.__sequenceEnded = true;
				});
				source.start();
				await context.resume();
				return destination.stream;
			},
		});
	});
	await page.goto('./');
	await page.evaluate(() => {
		/** @type {Window & { __noteSequence?: string[] }} */
		const testWindow = window;
		testWindow.__noteSequence = [];
		const noteName = document.querySelector('#note-name');
		if (!noteName) return;
		new MutationObserver(() => {
			const note = noteName.textContent ?? '';
			const sequence = testWindow.__noteSequence ?? [];
			if (note !== '—' && sequence.at(-1) !== note) sequence.push(note);
		}).observe(noteName, { childList: true, subtree: true });
	});
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect.poll(() => page.evaluate(() => {
		/** @type {Window & { __sequenceEnded?: boolean }} */
		const testWindow = window;
		return testWindow.__sequenceEnded;
	}), { timeout: 25_000 }).toBe(true);
	const displayedNotes = await page.evaluate(() => {
		/** @type {Window & { __noteSequence?: string[] }} */
		const testWindow = window;
		return testWindow.__noteSequence ?? [];
	});

	expect(displayedNotes).toEqual(GUITAR_SEQUENCE_FIXTURE.expectedNotes);
});
