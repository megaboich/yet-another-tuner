import { describe, expect, test, vi } from 'vitest';

import { createTunerSessionController } from '../src/tuner-session-controller.js';

describe('tuner session controller', () => {
	test('promotes a started session and stops it once', async () => {
		const stop = vi.fn();
		const controller = createTunerSessionController(async () => ({ deviceId: 'mic', stop }));

		await expect(controller.start({ onError() {}, onSample() {} }, {})).resolves.toMatchObject({ deviceId: 'mic' });
		expect(controller.active?.deviceId).toBe('mic');
		await controller.stop();
		expect(stop).toHaveBeenCalledOnce();
		expect(controller.running).toBe(false);
	});

	test('stops a session that resolves after cancellation', async () => {
		/** @type {(session: { deviceId: string, stop(): Promise<void> }) => void} */
		let resolveSession = () => {};
		const stop = vi.fn();
		const startSession = () => new Promise(resolve => {
			resolveSession = resolve;
		});
		const controller = createTunerSessionController(startSession);

		const pending = controller.start({ onError() {}, onSample() {} }, {});
		await controller.stop();
		resolveSession({ deviceId: 'late-mic', stop });

		await expect(pending).resolves.toBeNull();
		expect(stop).toHaveBeenCalledOnce();
		expect(controller.active).toBeNull();
	});
});
