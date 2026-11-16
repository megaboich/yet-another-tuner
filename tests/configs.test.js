import { describe, expect, it } from 'vitest';

import {
	buildChromaticToneTargets,
	buildTargets,
	CHROMATIC_FREQUENCY_RANGE,
	configs,
	getConfig,
	getCustomConfig,
	getFrequencyRange,
	GUITAR_FREQUENCY_RANGE,
	isValidCustomTuning,
} from '../src/configs.js';

describe('tuning configurations', () => {
	it('provides every planned preset with six descending strings', () => {
		expect(configs.map(config => config.id)).toEqual([
			'standard', 'drop-d', 'dadgad', 'open-g', 'open-d', 'half-step-down', 'full-step-down',
		]);
		for (const config of configs) {
			expect(config.midiNotes).toHaveLength(6);
			expect(config.midiNotes).toEqual(config.midiNotes.toSorted((left, right) => right - left));
		}
	});

	it('generates calibrated and capo-transposed targets', () => {
		const targets = buildTargets(getConfig('standard'), 442, 2);

		expect(targets[0].midiNote).toBe(66);
		expect(targets[0].noteName).toBe('F♯');
		expect(targets[4].frequency).toBeCloseTo(124.04, 1);
	});

	it('falls back to standard for an unknown runtime value', () => {
		expect(getConfig(/** @type {never} */ ('unknown')).id).toBe('standard');
	});

	it('validates constrained custom tunings', () => {
		expect(isValidCustomTuning([64, 60, 55, 50, 45, 40])).toBe(true);
		expect(isValidCustomTuning([64, 60, 60, 50, 45, 40])).toBe(false);
		expect(isValidCustomTuning([40, 45, 50, 55, 59, 64])).toBe(false);
		expect(isValidCustomTuning([90, 60, 55, 50, 45, 40])).toBe(false);
	});

	it('builds targets from a valid custom tuning', () => {
		const targets = buildTargets(getCustomConfig([65, 60, 55, 50, 45, 40]), 440, 0);

		expect(targets.map(target => target.noteName)).toEqual(['F', 'C', 'G', 'D', 'A', 'E']);
	});

	it('uses a wider detector range only for chromatic mode', () => {
		expect(getFrequencyRange('standard')).toBe(GUITAR_FREQUENCY_RANGE);
		expect(getFrequencyRange('custom')).toBe(GUITAR_FREQUENCY_RANGE);
		expect(getFrequencyRange('chromatic')).toBe(CHROMATIC_FREQUENCY_RANGE);
	});

	it('offers chromatic reference tones from C2 to C7', () => {
		const tones = buildChromaticToneTargets(440);

		expect(`${tones[0].noteName}${tones[0].octave}`).toBe('C2');
		expect(`${tones.at(-1)?.noteName}${tones.at(-1)?.octave}`).toBe('C7');
		expect(tones.find(tone => tone.midiNote === 69)?.frequency).toBe(440);
	});
});
