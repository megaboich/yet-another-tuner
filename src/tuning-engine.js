/** @import { PitchEstimate, TunerAPIResponse, TuningMode, TuningSelection, TuningTarget } from './types.js' */

import { getCentsFromFrequency, getNote, getStandardFrequency } from './pitch-math.js';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const AUTO_HARMONICS = 4;
// Prefer fundamentals when harmonic candidates are otherwise similarly close.
const HARMONIC_PENALTY_CENTS = 5;
const TARGET_HYSTERESIS_CENTS = 12;

/**
 * Create one atomic display result from a raw pitch estimate and tuning mode.
 * @param {PitchEstimate} estimate
 * @param {{ mode: TuningMode, targets: TuningTarget[], referencePitch?: number, manualStringIndex?: number, previousStringIndex?: number | null }} options
 * @returns {TunerAPIResponse}
 */
export function createTuningResult(estimate, options) {
	const selection = selectTarget(estimate.frequency, options);
	const normalizedFrequency = estimate.frequency / selection.harmonic;
	const { target } = selection;

	return {
		confidence: estimate.confidence,
		frequency: normalizedFrequency,
		detectedFrequency: estimate.frequency,
		harmonic: selection.harmonic,
		note: target.midiNote,
		cents: getCentsFromFrequency(normalizedFrequency, target.frequency),
		octave: target.octave,
		stringIndex: target.stringIndex,
		stringNumber: target.stringNumber,
		targetFrequency: target.frequency,
		rms: estimate.rms,
	};
}

/**
 * Select a target for the configured tuning mode.
 * @param {number} frequency
 * @param {{ mode: TuningMode, targets: TuningTarget[], referencePitch?: number, manualStringIndex?: number, previousStringIndex?: number | null }} options
 * @returns {TuningSelection}
 */
export function selectTarget(frequency, options) {
	if (options.mode === 'chromatic') return selectChromaticTarget(frequency, options.referencePitch);

	if (options.mode === 'manual') {
		const target = options.targets[options.manualStringIndex ?? -1];
		if (!target) throw new RangeError('A valid manual string index is required');
		return findBestHarmonic(frequency, target);
	}

	if (options.targets.length === 0) throw new RangeError('At least one tuning target is required');

	const selections = options.targets.map(target => findBestHarmonic(frequency, target));
	const best = selections.reduce((closest, selection) =>
		selectionScore(frequency, selection) < selectionScore(frequency, closest) ? selection : closest
	);
	const previous = selections.find(selection => selection.target.stringIndex === options.previousStringIndex);

	// Hysteresis applies to the full score, including the harmonic penalty.
	if (previous && selectionScore(frequency, previous) < selectionScore(frequency, best) + TARGET_HYSTERESIS_CENTS) {
		return previous;
	}

	return best;
}

/**
 * @param {number} frequency
 * @param {number} [referencePitch]
 * @returns {TuningSelection}
 */
function selectChromaticTarget(frequency, referencePitch = 440) {
	const midiNote = getNote(frequency, referencePitch);
	return {
		harmonic: 1,
		target: {
			frequency: getStandardFrequency(midiNote, referencePitch),
			midiNote,
			noteName: NOTE_NAMES[midiNote % 12],
			octave: Math.floor(midiNote / 12) - 1,
			stringIndex: null,
			stringNumber: null,
		},
	};
}

/**
 * @param {number} frequency
 * @param {TuningTarget} target
 * @returns {TuningSelection}
 */
function findBestHarmonic(frequency, target) {
	let best = { harmonic: 1, target };
	for (let harmonic = 2; harmonic <= AUTO_HARMONICS; harmonic += 1) {
		const candidate = { harmonic, target };
		if (selectionScore(frequency, candidate) < selectionScore(frequency, best)) best = candidate;
	}
	return best;
}

/**
 * @param {number} frequency
 * @param {TuningSelection} selection
 * @returns {number}
 */
function selectionScore(frequency, selection) {
	const targetFrequency = selection.target.frequency * selection.harmonic;
	return Math.abs(getCentsFromFrequency(frequency, targetFrequency))
		+ (selection.harmonic - 1) * HARMONIC_PENALTY_CENTS;
}
