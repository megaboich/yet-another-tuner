/** @import { TuningTarget } from '../src/types.js' */

import { describe, expect, it } from 'vitest';

import { buildTargets, configs } from '../src/configs.js';
import { createTuningResult, selectTarget } from '../src/tuning-engine.js';

const targets = buildTargets(configs[0], 440, 0);

/**
 * @param {number} frequency
 */
function estimate(frequency) {
	return { confidence: 1, frequency, rms: 0.1 };
}

describe('tuning engine', () => {
	it('calculates cents against the selected open string', () => {
		const result = createTuningResult(estimate(84), { mode: 'auto', targets });

		expect(result.stringNumber).toBe(6);
		expect(result.note).toBe(40);
		expect(result.cents).toBeCloseTo(33.15, 1);
	});

	it('does not report a non-open chromatic note as an in-tune string', () => {
		const result = createTuningResult(estimate(174.61), { mode: 'auto', targets });

		expect(Math.abs(result.cents)).toBeGreaterThan(95);
	});

	it('recognizes a likely open-string harmonic', () => {
		const result = createTuningResult(estimate(220), { mode: 'auto', targets });

		expect(result.stringNumber).toBe(5);
		expect(result.harmonic).toBe(2);
		expect(result.frequency).toBe(110);
		expect(result.cents).toBe(0);
	});

	it('locks manual mode to the requested string', () => {
		const result = createTuningResult(
			estimate(147),
			{ mode: 'manual', manualStringIndex: 3, targets },
		);

		expect(result.stringNumber).toBe(4);
		expect(result.cents).toBeCloseTo(2, 0);
	});

	it('selects the nearest chromatic note without a guitar string', () => {
		const result = createTuningResult(estimate(440), { mode: 'chromatic', targets });

		expect(result.note).toBe(69);
		expect(result.stringNumber).toBeNull();
		expect(result.cents).toBe(0);
	});

	it('retains the previous target within the hysteresis margin', () => {
		/** @type {TuningTarget[]} */
		const closeTargets = [
			{ frequency: 100, midiNote: 43, noteName: 'G', octave: 2, stringIndex: 0, stringNumber: 1 },
			{ frequency: 102, midiNote: 44, noteName: 'G♯', octave: 2, stringIndex: 1, stringNumber: 2 },
		];
		const selection = selectTarget(101.1, {
			mode: 'auto',
			previousStringIndex: 0,
			targets: closeTargets,
		});

		expect(selection.target.stringIndex).toBe(0);
	});

	it('rejects invalid manual targets', () => {
		expect(() => selectTarget(440, {
			mode: 'manual',
			manualStringIndex: 99,
			targets,
		})).toThrow(RangeError);
	});
});
