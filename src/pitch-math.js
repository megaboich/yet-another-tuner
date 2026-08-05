const MIDDLE_A_FREQUENCY = 440;
const MIDDLE_A_MIDI_NOTE = 69;

/**
 * Get the nearest MIDI note for a frequency.
 * @param {number} frequency
 * @param {number} [referencePitch]
 * @returns {number}
 */
export function getNote(frequency, referencePitch = MIDDLE_A_FREQUENCY) {
	const note = 12 * Math.log2(frequency / referencePitch);
	return Math.round(note) + MIDDLE_A_MIDI_NOTE;
}

/**
 * Get the standard frequency of a MIDI note at A4 = 440 Hz.
 * @param {number} note
 * @param {number} [referencePitch]
 * @returns {number}
 */
export function getStandardFrequency(note, referencePitch = MIDDLE_A_FREQUENCY) {
	return referencePitch * 2 ** ((note - MIDDLE_A_MIDI_NOTE) / 12);
}

/**
 * Get the cents difference from a MIDI note's standard frequency.
 * @param {number} frequency
 * @param {number} note
 * @param {number} [referencePitch]
 * @returns {number}
 */
export function getCents(frequency, note, referencePitch = MIDDLE_A_FREQUENCY) {
	return getCentsFromFrequency(frequency, getStandardFrequency(note, referencePitch));
}

/**
 * Get the cents difference between a detected and target frequency.
 * @param {number} frequency
 * @param {number} targetFrequency
 * @returns {number}
 */
export function getCentsFromFrequency(frequency, targetFrequency) {
	return 1200 * Math.log2(frequency / targetFrequency);
}
