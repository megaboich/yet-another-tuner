/** @import { PitchProcessorMessage, TunerEventHandlers, TunerSession, TunerStartOptions } from './types.js' */

import pitchProcessorUrl from './tuner-pitch-processor.js?url';

/**
 * @param {TunerEventHandlers} handlers
 * @param {TunerStartOptions} [options]
 * @returns {Promise<TunerSession>}
 */
export async function startTuner(handlers, options = {}) {
	const audioContext = new AudioContext();
	const resumePromise = audioContext.resume();
	/** @type {MediaStream | null} */
	let stream = null;
	/** @type {MediaStreamAudioSourceNode | null} */
	let source = null;
	/** @type {AudioWorkletNode | null} */
	let pitchProcessor = null;
	/** @type {GainNode | null} */
	let silentOutput = null;
	let stopped = false;

	const cleanup = async () => {
		if (stopped) return;
		stopped = true;
		pitchProcessor?.disconnect();
		source?.disconnect();
		silentOutput?.disconnect();
		stream?.getTracks().forEach(track => track.stop());
		if (audioContext.state !== 'closed') await audioContext.close();
	};

	try {
		stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				autoGainControl: false,
				channelCount: 1,
				...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
				echoCancellation: false,
				noiseSuppression: false,
			},
		});
		await audioContext.audioWorklet.addModule(pitchProcessorUrl);
		pitchProcessor = new AudioWorkletNode(audioContext, 'tuner-pitch-processor');
		const detectorReady = waitForDetector(pitchProcessor, handlers);
		source = audioContext.createMediaStreamSource(stream);
		silentOutput = audioContext.createGain();
		silentOutput.gain.value = 0;
		// Keep the analysis graph pulled without feeding the microphone back.
		source.connect(pitchProcessor).connect(silentOutput).connect(audioContext.destination);
		await detectorReady;
		await resumePromise;

		for (const track of stream.getAudioTracks()) {
			track.addEventListener('ended', () => {
				if (!stopped) handlers.onError(new Error('Microphone disconnected'));
			}, { once: true });
		}

		return {
			deviceId: stream.getAudioTracks()[0]?.getSettings().deviceId ?? '',
			stop: cleanup,
		};
	} catch (error) {
		await cleanup();
		throw error;
	}
}

/**
 * @param {AudioWorkletNode} pitchProcessor
 * @param {TunerEventHandlers} handlers
 * @returns {Promise<void>}
 */
function waitForDetector(pitchProcessor, handlers) {
	return new Promise((resolve, reject) => {
		let ready = false;
		/**
		 * @param {Error} error
		 */
		const reportError = (error) => {
			if (ready) handlers.onError(error);
			else reject(error);
		};
		pitchProcessor.onprocessorerror = () => reportError(new Error('Pitch processor stopped unexpectedly'));
		pitchProcessor.port.onmessage = (event) => {
			/** @type {PitchProcessorMessage} */
			const message = event.data;
			if (message.type === 'ready') {
				ready = true;
				resolve();
			}
			if (message.type === 'error') reportError(new Error(message.message));
			if (message.type === 'estimate') handlers.onSample(message.estimate);
		};
	});
}
