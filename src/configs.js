/** @import { GuitarConfig, PresetId, TuningTarget } from './types.js' */

import { getStandardFrequency } from './pitch-math.js';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** @type {GuitarConfig[]} */
export const configs = [
	{ id: 'standard', name: 'Standard', midiNotes: [64, 59, 55, 50, 45, 40] },
	{ id: 'drop-d', name: 'Drop D', midiNotes: [64, 59, 55, 50, 45, 38] },
	{ id: 'dadgad', name: 'DADGAD', midiNotes: [62, 57, 55, 50, 45, 38] },
	{ id: 'open-g', name: 'Open G', midiNotes: [62, 59, 55, 50, 43, 38] },
	{ id: 'open-d', name: 'Open D', midiNotes: [62, 57, 54, 50, 45, 38] },
	{ id: 'half-step-down', name: 'Half step down', midiNotes: [63, 58, 54, 49, 44, 39] },
	{ id: 'full-step-down', name: 'Full step down', midiNotes: [62, 57, 53, 48, 43, 38] },
];

export const DEFAULT_CUSTOM_MIDI_NOTES = [64, 59, 55, 50, 45, 40];

/**
 * @param {PresetId} presetId
 * @returns {GuitarConfig}
 */
export function getConfig(presetId) {
	return configs.find(config => config.id === presetId) ?? configs[0];
}

/**
 * @param {readonly number[]} midiNotes
 * @returns {GuitarConfig}
 */
export function getCustomConfig(midiNotes) {
	return { id: 'custom', name: 'Custom', midiNotes };
}

/**
 * @param {unknown} value
 * @returns {value is number[]}
 */
export function isValidCustomTuning(value) {
	return Array.isArray(value)
		&& value.length === 6
		&& value.every((note, index) => Number.isInteger(note)
			&& note >= 28
			&& note <= 76
			&& (index === 0 || value[index - 1] > note));
}

/**
 * @param {GuitarConfig} config
 * @param {number} referencePitch
 * @param {number} capo
 * @returns {TuningTarget[]}
 */
export function buildTargets(config, referencePitch, capo) {
	return config.midiNotes.map((openMidiNote, stringIndex) => {
		const midiNote = openMidiNote + capo;
		return {
			frequency: getStandardFrequency(midiNote, referencePitch),
			midiNote,
			noteName: NOTE_NAMES[midiNote % 12],
			octave: Math.floor(midiNote / 12) - 1,
			stringIndex,
			stringNumber: stringIndex + 1,
		};
	});
}
