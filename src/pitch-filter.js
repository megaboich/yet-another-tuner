/** @import { PitchEstimate, PitchFilter, PitchSample } from './types.js' */

import { getCentsFromFrequency } from './pitch-math.js';

const DEFAULTS = {
	fastThresholdCents: 35,
	maxFrequency: 400,
	minConfidence: 0.65,
	minFrequency: 55,
	minRms: 0.001,
	slowAlpha: 0.25,
};

/**
 * Create a stateful pitch quality gate and adaptive log-frequency smoother.
 * @param {Partial<typeof DEFAULTS>} [overrides]
 * @returns {PitchFilter}
 */
export function createPitchFilter(overrides = {}) {
	const options = { ...DEFAULTS, ...overrides };
	/** @type {number[]} */
	const history = [];
	/** @type {number | null} */
	let smoothedFrequency = null;

	return {
		process(sample) {
			if (!isUsableSample(sample, options)) return null;

			history.push(sample.frequency);
			if (history.length > 3) history.shift();
			const medianFrequency = median(history);

			if (smoothedFrequency === null) {
				smoothedFrequency = medianFrequency;
			} else {
				const difference = Math.abs(getCentsFromFrequency(medianFrequency, smoothedFrequency));
				const alpha = difference > options.fastThresholdCents ? 0.7 : options.slowAlpha;
				const smoothedLog = Math.log2(smoothedFrequency)
					+ alpha * (Math.log2(medianFrequency) - Math.log2(smoothedFrequency));
				smoothedFrequency = 2 ** smoothedLog;
			}

			/** @type {PitchEstimate} */
			const estimate = { ...sample, frequency: smoothedFrequency };
			return estimate;
		},
		reset() {
			history.length = 0;
			smoothedFrequency = null;
		},
	};
}

/**
 * @param {PitchSample} sample
 * @param {typeof DEFAULTS} options
 * @returns {sample is PitchEstimate}
 */
function isUsableSample(sample, options) {
	return sample.frequency !== null
		&& Number.isFinite(sample.frequency)
		&& sample.frequency >= options.minFrequency
		&& sample.frequency <= options.maxFrequency
		&& sample.rms >= options.minRms
		&& sample.confidence >= options.minConfidence;
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
	const sorted = values.toSorted((left, right) => left - right);
	// With two startup samples, choose the upper middle slot rather than blend
	// two potentially different notes.
	return sorted[Math.floor(sorted.length / 2)];
}
