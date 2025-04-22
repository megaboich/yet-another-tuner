/**
 * @param {(response: TunerAPIResponse) => void} callback
 */
export async function startTuner(callback) {
	const audioContext = new window.AudioContext({ sampleRate: 44100 });
	const analyser = audioContext.createAnalyser();

	// Load the AudioWorkletProcessor
	await audioContext.audioWorklet.addModule('./src/tuner-pitch-processor.js');

	// Create the AudioWorkletNode
	const pitchProcessor = new AudioWorkletNode(audioContext, 'tuner-pitch-processor');

	// Get audio input stream
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const source = audioContext.createMediaStreamSource(stream);

	// Connect the audio graph
	source.connect(analyser);
	analyser.connect(pitchProcessor);
	pitchProcessor.connect(audioContext.destination);

	// Handle messages from the AudioWorkletProcessor
	pitchProcessor.port.onmessage = (event) => {
		if (event.data) {
			callback(event.data);
		}
	};
}
