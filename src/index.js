import { startTuner } from './tuner-api.js';

/**
 * 1st string: E4 - 329.63 Hz
 * 2nd string: B3 - 246.94 Hz
 * 3rd string: G3 - 196.00 Hz
 * 4th string: D3 - 146.83 Hz
 * 5th string: A2 - 110.00 Hz
 * 6th string: E2 -  82.41 Hz
 */
const guitarStandardFreqs = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41];

async function main() {
	const welcomeBanner = document.getElementById('welcome-banner');
	welcomeBanner.addEventListener('click', async () => {
		await startTuner({}, (note) => {
			console.log(note);

			// Find the closest string index from guitarStandardFreqs
			let closestStringIndex = 0;
			let closestFreqDiff = Math.abs(guitarStandardFreqs[0] - note.frequency);
			for (let i = 1; i < guitarStandardFreqs.length; i++) {
				const freqDiff = Math.abs(guitarStandardFreqs[i] - note.frequency);
				if (freqDiff < closestFreqDiff) {
					closestStringIndex = i;
					closestFreqDiff = freqDiff;
				}
			}

			// Set the color of the string closest to the note
			// Color is picked from the range from green to red, with green being the closest
			// If closestFreqDiff is 0, the string is in tune
			const color = `rgb(${255 - closestFreqDiff * 255 / 10}, ${closestFreqDiff * 255 / 10}, 0)`;

			// Assign the proper CSS variable to the headContainer to highlight the string
			headContainer.style = `--string-${closestStringIndex + 1}: ${color};`;
		});
		console.log('Tuner initialized');

		// Draw headstock
		const headSvgResult = await fetch('./src/guitar-6-string-head-1.drawio.svg');
		const headSvgText = await headSvgResult.text();

		const headContainer = document.getElementById('head-container');
		headContainer.innerHTML = headSvgText;

		welcomeBanner.remove();
	});
};

main();
