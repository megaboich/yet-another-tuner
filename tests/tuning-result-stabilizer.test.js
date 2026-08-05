/** @import { TunerAPIResponse } from '../src/types.js' */

import { describe, expect, it } from 'vitest';

import { createTuningResultStabilizer } from '../src/tuning-result-stabilizer.js';

/** @param {number} stringIndex */
function result(stringIndex) {
	/** @type {TunerAPIResponse} */
	const value = {
		cents: 0,
		confidence: 1,
		detectedFrequency: 110,
		frequency: 110,
		harmonic: 1,
		note: 45,
		octave: 2,
		rms: 0.1,
		stringIndex,
		stringNumber: stringIndex + 1,
		targetFrequency: 110,
	};
	return value;
}

describe('tuning result stabilizer', () => {
	it('requires consecutive confirmation before showing a string', () => {
		const stabilizer = createTuningResultStabilizer(3, 3);
		expect(stabilizer.process(result(5))).toBeNull();
		expect(stabilizer.process(result(5))).toBeNull();
		expect(stabilizer.process(result(5))?.stringIndex).toBe(5);
	});

	it('ignores isolated target flicker', () => {
		const stabilizer = createTuningResultStabilizer(2, 2);
		stabilizer.process(result(5));
		stabilizer.process(result(5));
		expect(stabilizer.process(result(4))).toBeNull();
		expect(stabilizer.process(result(5))?.stringIndex).toBe(5);
	});

	it('switches after a sustained new target and resets cleanly', () => {
		const stabilizer = createTuningResultStabilizer(2, 2);
		stabilizer.process(result(5));
		stabilizer.process(result(5));
		expect(stabilizer.process(result(4))).toBeNull();
		expect(stabilizer.process(result(4))?.stringIndex).toBe(4);
		stabilizer.reset();
		expect(stabilizer.process(result(4))).toBeNull();
	});
});
