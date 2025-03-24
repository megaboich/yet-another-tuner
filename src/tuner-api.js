/**
 * @param {Object} options
 * @param {number} options.middleAFrequency
 * @param {number} options.semitone
 * @param {string[]} options.noteStrings
 * @param {Function} callback
 */
export async function startTuner({
	middleAFrequency = 440,
	noteStrings = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
	semitone = 69
}, callback) {
	const aubio = window['aubio'];
	if (!aubio)
		throw new Error('Aubio not found');
	const aubioAPI = await aubio();

	/**
	 * Gets musical note from frequency
	 * @param {number} frequency
	 * @returns {number}
	 */
	function getNote(frequency) {
		const note = 12 * (Math.log(frequency / middleAFrequency) / Math.log(2));
		return Math.round(note) + semitone;
	};

	/**
	 * Gets the musical note's standard frequency
	 * @param {number} note
	 * @returns {number}
	 */
	function getStandardFrequency(note) {
		return middleAFrequency * Math.pow(2, (note - semitone) / 12);
	};

	/**
	 * Gets cents difference between given frequency and musical note's standard frequency
	 * @param {number} frequency
	 * @param {number} note
	 * @returns {number}
	 */
	function getCents(frequency, note) {
		return Math.floor(
			(1200 * Math.log(frequency / getStandardFrequency(note))) / Math.log(2)
		);
	};

	const bufferSize = 4096;
	const audioContext = new window.AudioContext();
	const analyser = audioContext.createAnalyser();
	const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
	const pitchDetector = new aubioAPI.Pitch('default', bufferSize, 1, audioContext.sampleRate);

	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	audioContext.createMediaStreamSource(stream).connect(analyser);
	analyser.connect(scriptProcessor);
	scriptProcessor.connect(audioContext.destination);
	scriptProcessor.addEventListener('audioprocess', function (event) {
		const channelData = event.inputBuffer.getChannelData(0);
		const frequency = pitchDetector.do(channelData);
		if (frequency) {
			const note = getNote(frequency);
			callback({
				name: noteStrings[note % 12],
				value: note,
				cents: getCents(frequency, note),
				octave: Math.floor(note / 12) - 1,
				frequency: frequency,
			});
		}
	});
}
