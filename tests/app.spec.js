import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { SYNTHETIC_GUITAR_FIXTURES } from './fixtures/synthetic-tones.js';

test('is installable and loads offline after the first visit', async ({ context, page }) => {
	await page.goto('./');
	const manifest = await page.locator('link[rel="manifest"]').evaluate(async link => {
		const response = await fetch(/** @type {HTMLLinkElement} */ (link).href);
		return response.json();
	});
	expect(manifest).toMatchObject({
		display: 'standalone',
		name: 'Yet Another Tuner',
		start_url: './',
	});
	expect(manifest.icons).toEqual(expect.arrayContaining([
		expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
		expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
	]));

	await page.evaluate(() => navigator.serviceWorker.ready);
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('button', { name: /Start listening/ })).toBeVisible();
});

test('starts the production tuner from a project subpath', async ({ page }) => {
	/** @type {string[]} */
	const failedResponses = [];
	/** @type {string[]} */
	const consoleErrors = [];

	page.on('response', response => {
		if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
	});
	page.on('console', message => {
		if (message.type() === 'error') consoleErrors.push(message.text());
	});

	await page.goto('./');
	await expect(page.getByRole('button', { name: /Start listening/ })).toBeVisible();
	await page.getByRole('button', { name: /Start listening/ }).click();

	await expect(page.locator('#tuning-screen')).toBeVisible();
	await expect(page.getByRole('group', { name: 'Select a guitar string' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();
	await expect(page.locator('body')).toHaveAttribute('data-app-state', 'no-signal');
	await expect.poll(() => consoleErrors, { timeout: 5_000 }).toEqual([]);

	expect(failedResponses).toEqual([]);

	await page.getByRole('button', { name: 'Stop microphone' }).click();
	await expect(page.getByRole('button', { name: /Start listening/ })).toBeVisible();
	await expect(page.locator('body')).toHaveAttribute('data-app-state', 'stopped');
});

test('shows a retry path when microphone permission is denied', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
			configurable: true,
			value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
		});
	});
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();

	await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
	await expect(page.locator('#tuner-status')).toContainText('Microphone access was denied');
});

test('detects a synthetic A2 tone through the audio worklet', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
			configurable: true,
			value: async () => {
				const context = new AudioContext();
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				const destination = context.createMediaStreamDestination();
				oscillator.frequency.value = 110;
				gain.gain.value = 0.1;
				oscillator.connect(gain).connect(destination);
				oscillator.start();
				await context.resume();
				return destination.stream;
			},
		});
	});
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();

	await expect(page.locator('#note-name')).toHaveText('A2', { timeout: 10_000 });
	await expect(page.locator('#note-frequency')).toContainText('110.');
	await expect(page.locator('#cents-value')).toContainText('cents');
	await expect(page.locator('#tuning-direction')).not.toHaveText('Waiting');
});

test('detects the six-string synthetic fixture set', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
			configurable: true,
			value: async () => {
				const context = new AudioContext();
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				const destination = context.createMediaStreamDestination();
				gain.gain.value = 0.1;
				oscillator.connect(gain).connect(destination);
				oscillator.start();
				await context.resume();
				/** @type {Window & { __testOscillator?: OscillatorNode }} */
				const testWindow = window;
				testWindow.__testOscillator = oscillator;
				return destination.stream;
			},
		});
	});
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();

	for (const fixture of SYNTHETIC_GUITAR_FIXTURES) {
		await page.evaluate(frequency => {
			/** @type {Window & { __testOscillator?: OscillatorNode }} */
			const testWindow = window;
			testWindow.__testOscillator?.frequency.setValueAtTime(frequency, 0);
		}, fixture.frequency);
		await expect(page.locator('#note-name')).toHaveText(fixture.note, { timeout: 4_000 });
	}
});

test('supports keyboard string selection and auto mode', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();
	const lowE = page.getByRole('button', { name: /String 6, E2/ });
	await lowE.focus();
	await page.keyboard.press('Enter');

	await expect(lowE).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
	await page.getByRole('button', { name: 'Auto' }).click();
	await expect(lowE).toHaveAttribute('aria-pressed', 'false');
});

test('fits the tuner at 320 pixels without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBe(0);
});

test('keeps the pitch graph visible in a mobile active view', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();

	const chartBottom = await page.locator('.tuning-chart').evaluate(chart => chart.getBoundingClientRect().bottom);
	expect(chartBottom).toBeLessThanOrEqual(844);
});

test('has no automated accessibility violations before and after start', async ({ page }) => {
	await page.goto('./');
	let results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();
	results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});

test('stops and offers retry when the microphone disconnects', async ({ page }) => {
	await page.addInitScript(() => {
		const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
			configurable: true,
			/**
			 * @param {MediaStreamConstraints} constraints
			 */
			value: async constraints => {
				const stream = await getUserMedia(constraints);
				/** @type {Window & { __testTrack?: MediaStreamTrack }} */
				const testWindow = window;
				[testWindow.__testTrack] = stream.getAudioTracks();
				return stream;
			},
		});
	});
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();
	await page.evaluate(() => {
		/** @type {Window & { __testTrack?: MediaStreamTrack }} */
		const testWindow = window;
		testWindow.__testTrack?.dispatchEvent(new Event('ended'));
	});

	await expect(page.locator('body')).toHaveAttribute('data-app-state', 'error');
	await expect(page.locator('#tuner-status')).toContainText('disconnected');
});

test('persists tuning, calibration, theme, and orientation settings', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Tuning').selectOption('drop-d');
	await page.locator('#reference-input').fill('442');
	await page.getByLabel('Capo position').selectOption('2');
	await page.getByLabel('Theme').selectOption('light');
	await page.getByLabel('String orientation').selectOption('left');
	await page.getByRole('button', { name: 'Done' }).click();

	await expect.poll(() => page.url()).toContain('#t=drop-d&a=442&c=2');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('html')).toHaveAttribute('data-handedness', 'left');
	await page.reload();
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByLabel('Tuning')).toHaveValue('drop-d');
	await expect(page.locator('#reference-input')).toHaveValue('442');
	await expect(page.getByLabel('Capo position')).toHaveValue('2');
});

test('updates generated targets and can reset settings', async ({ page }) => {
	await page.goto('./#t=drop-d&a=432&c=1');
	await expect(page.locator('.welcome-panel .eyebrow')).toContainText('Drop D');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: /String 6, D♯2/ })).toBeVisible();
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByRole('button', { name: 'Reset settings' }).click();

	await expect(page.getByLabel('Tuning')).toHaveValue('standard');
	await expect(page.locator('#reference-input')).toHaveValue('440');
	await expect(page).not.toHaveURL(/#/);
});

test('stops the microphone when the page moves to the background', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});

	await expect(page.locator('body')).toHaveAttribute('data-app-state', 'stopped');
	await expect(page.locator('#tuner-status')).toContainText('background');
});

test('keeps visual and keyboard string order aligned when left-handed', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('String orientation').selectOption('left');
	await page.getByRole('button', { name: 'Done' }).click();
	await page.getByRole('button', { name: /Start listening/ }).click();

	const labels = await page.locator('#vis-headstock button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
	expect(labels[0]).toContain('String 1');
	expect(labels[5]).toContain('String 6');
});

test('uses an explicitly selected microphone', async ({ page }) => {
	await page.addInitScript(() => {
		navigator.mediaDevices.enumerateDevices = async () => [
			{ deviceId: 'mic-one', groupId: 'group', kind: 'audioinput', label: 'Studio microphone', toJSON: () => ({}) },
		];
		const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = async constraints => {
			/** @type {Window & { __testConstraints?: MediaStreamConstraints }} */
			const testWindow = window;
			testWindow.__testConstraints = constraints;
			return getUserMedia({ audio: true });
		};
	});
	await page.goto('./');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Microphone').selectOption('mic-one');
	await page.getByRole('button', { name: 'Done' }).click();
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: 'Stop microphone' })).toBeEnabled();

	const deviceId = await page.evaluate(() => {
		/** @type {Window & { __testConstraints?: MediaStreamConstraints }} */
		const testWindow = window;
		const audio = /** @type {MediaTrackConstraints} */ (testWindow.__testConstraints?.audio);
		return /** @type {ConstrainDOMStringParameters} */ (audio.deviceId).exact;
	});
	expect(deviceId).toBe('mic-one');
});

test('creates, persists, and shares a valid custom tuning', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Tuning').selectOption('custom');
	await page.getByLabel('Custom note for string 1').selectOption('65');
	await expect(page.locator('#custom-tuning-error')).toHaveText('');
	await page.getByRole('button', { name: 'Done' }).click();

	await expect.poll(() => page.url()).toContain('t=custom');
	await expect.poll(() => page.url()).toContain('n=65.59.55.50.45.40');
	await page.getByRole('button', { name: /Start listening/ }).click();
	await expect(page.getByRole('button', { name: /String 1, F4/ })).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByLabel('Custom note for string 1')).toHaveValue('65');
});

test('keeps the last valid custom tuning when editor notes are invalid', async ({ page }) => {
	await page.goto('./#t=custom&n=64.59.55.50.45.40');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Custom note for string 2').selectOption('64');

	await expect(page.locator('#custom-tuning-error')).toContainText('unique');
	await expect.poll(() => page.url()).toContain('n=64.59.55.50.45.40');
});

test('starts and stops the reference tone explicitly', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('button', { name: 'Settings' }).click();
	const toneButton = page.getByRole('button', { name: 'Play tone' });
	await toneButton.click();
	await expect(page.getByRole('button', { name: 'Stop tone' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Close settings' }).click();
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('button', { name: 'Play tone' })).toHaveAttribute('aria-pressed', 'false');
});
