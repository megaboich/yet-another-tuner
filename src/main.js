import { startTuner } from './tuner-api.js';
import { getElement } from './helpers.js';
import { initHeadstockVisualization, updateHeadstockVisualization } from './vis-headstock.js';
import { initInfoPanelVisualization, updateInfoPanelVisualization } from './vis-info-panel.js';

/**
 * Initialize the welcome screen and set up event listeners.
 */
function setupWelcomeScreen() {
	const welcomeScreen = getElement('#welcome-screen');
	welcomeScreen.style.display = 'block';

	welcomeScreen.addEventListener('click', () => {
		welcomeScreen.style.display = 'none';
		showTuningScreen();
	});
}

/**
 * Show the tuning screen and initialize visualizations.
 */
async function showTuningScreen() {
	const tuningScreen = getElement('#tuning-screen');
	tuningScreen.style.display = 'block';

	try {
		await initHeadstockVisualization();
		await initInfoPanelVisualization();

		await startTuner((entry) => {
			updateHeadstockVisualization(entry);
			updateInfoPanelVisualization(entry);
		});

		console.log('Tuner initialized');
	} catch (error) {
		console.error('Error initializing tuner:', error);
	}
}

/**
 * Main entry point for the application.
 */
async function main() {
	setupWelcomeScreen();
}

document.addEventListener('DOMContentLoaded', () => {
	main();
});
