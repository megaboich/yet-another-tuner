/** @import { ReferenceTone } from './types.js' */

/**
 * Start an audible sine-wave reference tone from a trusted user action.
 * @param {number} frequency
 * @param {number} volume Value from 0 to 1.
 * @returns {Promise<ReferenceTone>}
 */
export async function startReferenceTone(frequency, volume) {
	const context = new AudioContext();
	const oscillator = context.createOscillator();
	const gain = context.createGain();
	oscillator.type = 'sine';
	oscillator.frequency.value = frequency;
	gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.18;
	oscillator.connect(gain).connect(context.destination);
	oscillator.start();
	await context.resume();

	let stopped = false;
	return {
		async stop() {
			if (stopped) return;
			stopped = true;
			oscillator.stop();
			oscillator.disconnect();
			gain.disconnect();
			await context.close();
		},
	};
}
