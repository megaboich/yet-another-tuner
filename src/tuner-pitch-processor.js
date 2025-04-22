/** @import {Aubio as AubioAPI} from 'aubiojs'} */

import aubio from './lib/aubio/aubio.esm.js';

const middleAFrequency = 440;
const semitone = 69;

/**
 * Gets musical note from frequency
 * @param {number} frequency
 * @returns {number}
 */
function getNote(frequency) {
	const note = 12 * (Math.log(frequency / middleAFrequency) / Math.log(2));
	return Math.round(note) + semitone;
}

/**
 * Gets the musical note's standard frequency
 * @param {number} note
 * @returns {number}
 */
function getStandardFrequency(note) {
	return middleAFrequency * Math.pow(2, (note - semitone) / 12);
}

/**
 * Gets cents difference between given frequency and musical note's standard frequency.
 * 1 octave = 1200 cents.
 * 1 semitone = 100 cents.
 * Most tuners show a window of ±50 cents so you can see if you’re flat (negative) or sharp (positive) within the current semitone.
 * @param {number} frequency
 * @param {number} note
 * @returns {number}
 */
function getCents(frequency, note) {
	return Math.floor(
		(1200 * Math.log(frequency / getStandardFrequency(note))) / Math.log(2)
	);
}

class TunerPitchProcessor extends AudioWorkletProcessor {
	constructor() {
		super();

		/** @type {number[]} */
		this.buffer = [];
		this.bufferSize = 4096;

		this.initAubio();
	}

	async initAubio() {
		/** @type {AubioAPI} */
		const aubioAPI = await aubio();
		this.pitchDetector = new aubioAPI.Pitch('default', 4096 * 4, 4096, 44100);
	}

	/**
	 * @param {Float32Array[][]} inputs
	 * @returns
	 */
	process(inputs) {
		const input = inputs[0];
		if (input && input[0] && input[0].length > 0) {
			// Collect audio samples
			this.buffer.push(...input[0]);

			// Process when the buffer is full
			if (this.pitchDetector && this.buffer.length >= this.bufferSize) {
				const channelData = this.buffer.slice(0, this.bufferSize);
				this.buffer = this.buffer.slice(this.bufferSize);
				const frequency = this.pitchDetector.do(channelData);
				if (frequency) {
					const note = getNote(frequency);
					/** @type {TunerAPIResponse} */
					const tunerResponse = {
						frequency: frequency,
						note,
						cents: getCents(frequency, note),
						octave: Math.floor(note / 12) - 1,
					};
					this.port.postMessage(tunerResponse);
				}
			}
		}
		return true;
	}
}

registerProcessor('tuner-pitch-processor', TunerPitchProcessor);
