import { describe, expect, it } from 'vitest';

import { MpmPitchDetector } from '../src/pitch-detector.js';
import { getCentsFromFrequency } from '../src/pitch-math.js';
import { SYNTHETIC_GUITAR_FIXTURES } from './fixtures/synthetic-tones.js';

/**
 * @param {number} frequency
 * @param {number} sampleRate
 * @param {{ amplitude?: number, harmonics?: number[], noise?: number }} [options]
 */
function generateSignal(frequency, sampleRate, options = {}) {
	const amplitude = options.amplitude ?? 0.2;
	const harmonics = options.harmonics ?? [1];
	const noise = options.noise ?? 0;
	const length = Math.round(sampleRate * 0.25);
	const signal = new Float32Array(length);
	let randomState = 123_456_789;
	for (let index = 0; index < length; index += 1) {
		let sample = 0;
		for (let harmonicIndex = 0; harmonicIndex < harmonics.length; harmonicIndex += 1) {
			const harmonic = harmonicIndex + 1;
			sample += harmonics[harmonicIndex] * Math.sin(2 * Math.PI * frequency * harmonic * index / sampleRate);
		}
		randomState = (1_664_525 * randomState + 1_013_904_223) >>> 0;
		sample += noise * (randomState / 0xffff_ffff * 2 - 1);
		signal[index] = sample * amplitude;
	}
	return signal;
}

/**
 * @param {Float32Array} signal
 * @param {number} sampleRate
 */
function detect(signal, sampleRate) {
	const detector = new MpmPitchDetector(sampleRate);
	for (let offset = 0; offset < signal.length; offset += 128) {
		detector.push(signal.subarray(offset, offset + 128));
	}
	return detector;
}

describe('MPM pitch detector', () => {
	for (const sampleRate of [44_100, 48_000]) {
		it(`detects standard guitar tones within 2 cents at ${sampleRate} Hz`, () => {
			for (const fixture of SYNTHETIC_GUITAR_FIXTURES) {
				const detector = detect(generateSignal(fixture.frequency, sampleRate), sampleRate);
				expect(detector.frequency).not.toBeNull();
				expect(Math.abs(getCentsFromFrequency(detector.frequency ?? 1, fixture.frequency))).toBeLessThan(2);
				expect(detector.confidence).toBeGreaterThan(0.9);
			}
		});
	}

	it('tracks detuned guitar tones without snapping to note centers', () => {
		for (const cents of [-40, -20, 20, 40]) {
			const frequency = 110 * 2 ** (cents / 1200);
			const detector = detect(generateSignal(frequency, 48_000), 48_000);
			expect(Math.abs(getCentsFromFrequency(detector.frequency ?? 1, frequency))).toBeLessThan(2);
		}
	});

	it('finds the fundamental in a guitar-like harmonic series', () => {
		const detector = detect(generateSignal(82.41, 48_000, {
			harmonics: [1, 0.7, 0.45, 0.3, 0.2, 0.15],
		}), 48_000);

		expect(Math.abs(getCentsFromFrequency(detector.frequency ?? 1, 82.41))).toBeLessThan(3);
	});

	it('tolerates moderate deterministic noise', () => {
		const detector = detect(generateSignal(196, 48_000, { noise: 0.1 }), 48_000);

		expect(Math.abs(getCentsFromFrequency(detector.frequency ?? 1, 196))).toBeLessThan(3);
	});

	it('rejects strong low-frequency room noise without losing A2', () => {
		const sampleRate = 48_000;
		const signal = generateSignal(110, sampleRate);
		for (let index = 0; index < signal.length; index += 1) {
			signal[index] += 0.08 * Math.sin(2 * Math.PI * 60 * index / sampleRate);
		}
		const detector = detect(signal, sampleRate);

		expect(Math.abs(getCentsFromFrequency(detector.frequency ?? 1, 110))).toBeLessThan(10);
	});

	it('rejects silence', () => {
		const detector = detect(new Float32Array(12_000), 48_000);

		expect(detector.frequency).toBeNull();
		expect(detector.confidence).toBe(0);
	});
});
