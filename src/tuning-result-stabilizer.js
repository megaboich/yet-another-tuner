/** @import { TunerAPIResponse, TuningResultStabilizer } from './types.js' */

// Sixteen observations span 15 hops, or 160 ms at 48 kHz. Combined with the
// initial analysis window, first acquisition remains near the 300 ms target.
const DEFAULT_CONFIRMATIONS = 16;
const DEFAULT_SWITCH_CONFIRMATIONS = 24;

/**
 * Suppress one-frame target changes while preserving live cents updates for
 * the currently stable string or chromatic note.
 * @param {number} [requiredConfirmations]
 * @param {number} [switchConfirmations]
 * @returns {TuningResultStabilizer}
 */
export function createTuningResultStabilizer(
	requiredConfirmations = DEFAULT_CONFIRMATIONS,
	switchConfirmations = DEFAULT_SWITCH_CONFIRMATIONS,
) {
	/** @type {number | null} */
	let stableKey = null;
	/** @type {number | null} */
	let candidateKey = null;
	let candidateCount = 0;

	return {
		process(result) {
			const key = getTargetKey(result);
			if (key === stableKey) {
				candidateKey = null;
				candidateCount = 0;
				return result;
			}

			if (key !== candidateKey) {
				candidateKey = key;
				candidateCount = 1;
			} else {
				candidateCount += 1;
			}

			const confirmationTarget = stableKey === null
				? requiredConfirmations
				: switchConfirmations;
			if (candidateCount < confirmationTarget) return null;
			stableKey = candidateKey;
			candidateKey = null;
			candidateCount = 0;
			return result;
		},
		reset() {
			stableKey = null;
			candidateKey = null;
			candidateCount = 0;
		},
	};
}

/**
 * Chromatic results have no string, so the target note identifies them instead.
 * @param {TunerAPIResponse} result
 * @returns {number}
 */
function getTargetKey(result) {
	return result.stringIndex ?? -1 - result.note;
}
