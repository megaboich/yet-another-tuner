import { getScale } from 'color2k';
import { getElement } from './helpers.js';
import { configs } from './configs.js';

const colorScale = getScale('#00ffff', '#a5de00', '#cebc00', '#ec9600', '#fa6c00', '#fa4100', '#f00000');
let prevStringIndex = 0;

/** @type {HTMLElement} */
let headContainer;

/**
 * Initialize the headstock visualization by loading the SVG and injecting it into the DOM.
 */
export async function initHeadstockVisualization() {
	try {
		// Load headstock graphics
		const headSvgResult = await fetch('./src/guitar-6-string-head-1.drawio.svg');
		if (!headSvgResult.ok) throw new Error('Failed to load headstock SVG');

		const headSvgText = await headSvgResult.text();
		headContainer = getElement('#vis-headstock');
		headContainer.innerHTML = headSvgText;
	} catch (error) {
		console.error('Error initializing headstock visualization:', error);
	}
}

/**
 * Update the headstock visualization based on the tuner API response.
 * @param {TunerAPIResponse} entry - The latest tuning data.
 */
export function updateHeadstockVisualization(entry) {
	const guitarConfig = configs[0]; // TODO: Allow dynamic selection of guitar configuration
	const { stringFreqs } = guitarConfig;

	// Find the closest string index
	const closestStringIndex = findClosestStringIndex(stringFreqs, entry.frequency);

	// Calculate the color based on the cents offset
	const color = colorScale(Math.abs(entry.cents) / 50);

	// Update the CSS variable for the closest string
	updateStringHighlight(closestStringIndex, color);
}

/**
 * Find the index of the closest string based on the frequency.
 * @param {number[]} stringFreqs - Array of string frequencies.
 * @param {number} frequency - The current frequency.
 * @returns {number} - The index of the closest string.
 */
function findClosestStringIndex(stringFreqs, frequency) {
	return stringFreqs.reduce((closestIndex, stringFreq, index) => {
		const closestDiff = Math.abs(stringFreqs[closestIndex] - frequency);
		const currentDiff = Math.abs(stringFreq - frequency);
		return currentDiff < closestDiff ? index : closestIndex;
	}, 0);
}

/**
 * Update the CSS variable to highlight the closest string and remove the previous highlight.
 * @param {number} closestStringIndex - The index of the closest string.
 * @param {string} color - The color to apply.
 */
function updateStringHighlight(closestStringIndex, color) {
	// Highlight the closest string
	headContainer.style.setProperty(`--string-${closestStringIndex + 1}`, color);

	// Remove the highlight from the previous string
	if (prevStringIndex !== closestStringIndex) {
		headContainer.style.removeProperty(`--string-${prevStringIndex + 1}`);
		prevStringIndex = closestStringIndex;
	}
}
