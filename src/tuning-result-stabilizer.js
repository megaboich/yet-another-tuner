/** @import { TunerAPIResponse, TuningResultStabilizer } from './types.js' */

// Sixteen observations span 15 hops, or 160 ms at 48 kHz. Combined with the
// initial analysis window, first acquisition remains near the 300 ms target.
const DEFAULT_CONFIRMATIONS = 16;
const DEFAULT_SWITCH_CONFIRMATIONS = 24;

/**
 * Suppress one-frame target changes while preserving live cents updates for
 * the currently stable string.
 * @param {number} [requiredConfirmations]
 * @param {number} [switchConfirmations]
 * @returns {TuningResultStabilizer}
 */
export function createTuningResultStabilizer(
	requiredConfirmations = DEFAULT_CONFIRMATIONS,
	switchConfirmations = DEFAULT_SWITCH_CONFIRMATIONS,
) {
	/** @type {number | null} */
	let stableStringIndex = null;
	/** @type {number | null} */
	let candidateStringIndex = null;
	let candidateCount = 0;

	return {
		process(result) {
			if (result.stringIndex === stableStringIndex && stableStringIndex !== null) {
				candidateStringIndex = null;
				candidateCount = 0;
				return result;
			}

			if (result.stringIndex !== candidateStringIndex) {
				candidateStringIndex = result.stringIndex;
				candidateCount = 1;
			} else {
				candidateCount += 1;
			}

			const confirmationTarget = stableStringIndex === null
				? requiredConfirmations
				: switchConfirmations;
			if (candidateCount < confirmationTarget) return null;
			stableStringIndex = candidateStringIndex;
			candidateStringIndex = null;
			candidateCount = 0;
			return result;
		},
		reset() {
			stableStringIndex = null;
			candidateStringIndex = null;
			candidateCount = 0;
		},
	};
}
