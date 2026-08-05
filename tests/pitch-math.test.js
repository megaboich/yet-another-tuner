import { describe, expect, it } from 'vitest';

import { getCents, getCentsFromFrequency, getNote, getStandardFrequency } from '../src/pitch-math.js';

describe('pitch math', () => {
	it('maps standard guitar notes to MIDI notes', () => {
		expect(getNote(82.41)).toBe(40);
		expect(getNote(110)).toBe(45);
		expect(getNote(329.63)).toBe(64);
	});

	it('maps MIDI notes to their standard frequencies', () => {
		expect(getStandardFrequency(40)).toBeCloseTo(82.41, 2);
		expect(getStandardFrequency(69)).toBe(440);
	});

	it('supports calibrated reference pitches', () => {
		expect(getStandardFrequency(69, 432)).toBe(432);
		expect(getStandardFrequency(69, 446)).toBe(446);
		expect(getNote(432, 432)).toBe(69);
	});

	it('reports cents below, at, and above a note', () => {
		expect(getCents(440, 69)).toBe(0);
		expect(getCents(430, 69)).toBeLessThan(0);
		expect(getCents(450, 69)).toBeGreaterThan(0);
	});

	it('calculates precise target-relative cents without negative rounding bias', () => {
		expect(getCentsFromFrequency(440 * 2 ** (-10 / 1200), 440)).toBeCloseTo(-10, 10);
		expect(getCentsFromFrequency(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10, 10);
	});
});
