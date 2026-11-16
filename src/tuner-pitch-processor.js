/** @import { FrequencyRange, PitchProcessorMessage, PitchSample } from './types.js' */

import { MpmPitchDetector } from './pitch-detector.js';

class TunerPitchProcessor extends AudioWorkletProcessor {
	/** @param {{ processorOptions?: FrequencyRange }} [options] */
	constructor(options) {
		super();
		const range = options?.processorOptions;
		this.pitchDetector = new MpmPitchDetector(sampleRate, range
			? { maxFrequency: range.maxFrequency, minFrequency: range.minFrequency }
			: {});
		/** @type {PitchProcessorMessage} */
		const message = { type: 'ready' };
		this.port.postMessage(message);
	}

	/**
	 * @param {Float32Array[][]} inputs
	 * @returns {boolean}
	 */
	process(inputs) {
		const channel = inputs[0]?.[0];
		if (channel && this.pitchDetector.push(channel)) {
			/** @type {PitchSample} */
			const estimate = {
				confidence: this.pitchDetector.confidence,
				frequency: this.pitchDetector.frequency,
				rms: this.pitchDetector.rms,
			};
			/** @type {PitchProcessorMessage} */
			const message = { type: 'estimate', estimate };
			this.port.postMessage(message);
		}
		return true;
	}
}

registerProcessor('tuner-pitch-processor', TunerPitchProcessor);
