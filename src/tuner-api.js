/**
 * @param {(response: TunerAPIResponse) => void} callback
 */
export async function startTuner(callback) {
	const audioContext = new AudioContext({ sampleRate: 44100 });
	await audioContext.audioWorklet.addModule('./src/tuner-pitch-processor.js');
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const source = audioContext.createMediaStreamSource(stream);
	const pitchProcessor = new AudioWorkletNode(audioContext, 'tuner-pitch-processor');
	source
		.connect(pitchProcessor)
		.connect(audioContext.destination);

	// Handle messages from the AudioWorkletProcessor
	pitchProcessor.port.onmessage = (event) => {
		if (event.data) {
			callback(event.data);
		}
	};
}
