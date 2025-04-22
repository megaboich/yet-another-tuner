import { getElement } from './helpers.js';

// Constants
const NOTE_STRINGS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

const MAX_EVENT_LOG_SIZE = 100; // Limit the size of the event log
const CHART_STYLES = {
	backgroundColor: 'white',
	axisColor: 'lightgray',
	lineColor: 'black',
	font: '12px sans-serif',
	textColor: 'gray',
	stepX: 3,
	marginLeft: 40,
};

/** @type {HTMLElement} */
let eltNoteName;
/** @type {HTMLElement} */
let eltFrequency;
/** @type {HTMLElement} */
let tuningIndicator;
/** @type {HTMLCanvasElement} */
let chartCanvas;
/** @type {CanvasRenderingContext2D} */
let chartCtx;

/**
 * Event log to store tuning data for visualization.
 * Only last MAX_EVENT_LOG_SIZE entries are kept.
 * @type {TunerAPIResponse[]}
 */
const eventLog = [];

/**
 * Initialize the info panel visualization.
 */
export async function initInfoPanelVisualization() {
	try {
		eltNoteName = getElement('#note-name');
		eltFrequency = getElement('#note-frequency');
		tuningIndicator = getElement('#tuning-indicator');

		const chartContainer = getElement('#tuning-chart');
		chartCanvas = document.createElement('canvas');
		chartCanvas.width = chartContainer.clientWidth;
		chartCanvas.height = chartContainer.clientHeight;
		chartContainer.appendChild(chartCanvas);

		const context = chartCanvas.getContext('2d');
		if (!context) throw new Error('Canvas context is not available');
		chartCtx = context;
	} catch (error) {
		console.error('Error initializing info panel visualization:', error);
	}
}

/**
 * Update the info panel visualization with a new tuner API response.
 * @param {TunerAPIResponse} entry - The latest tuning data.
 */
export function updateInfoPanelVisualization(entry) {
	// Maintain a fixed-size event log
	if (eventLog.length >= MAX_EVENT_LOG_SIZE) {
		eventLog.shift();
	}
	eventLog.push(entry);

	// Update note name and frequency
	const noteName = NOTE_STRINGS[entry.note % 12];
	eltNoteName.innerText = `${noteName}${entry.octave}`;
	eltFrequency.innerText = `${entry.frequency.toFixed(2)} Hz`;

	// Update tuning indicator
	tuningIndicator.style.setProperty('--cents', entry.cents.toFixed(2));
	if (eventLog.length === 1) {
		tuningIndicator.style.visibility = 'visible';
	}

	// Prepare chart values and render
	const chartValues = eventLog.slice().reverse().map((e) => {
		if (e.note < entry.note) return -50;
		if (e.note > entry.note) return 50;
		return e.cents;
	});
	requestAnimationFrame(() => renderTuningChart(chartValues));
}

/**
 * Render the tuning chart with the given values.
 * @param {number[]} values - The tuning values to plot.
 */
function renderTuningChart(values) {
	const ctx = chartCtx;
	const canvas = chartCanvas;

	const { marginLeft, stepX, backgroundColor, axisColor, textColor, font, lineColor } = CHART_STYLES;

	// Clear canvas
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	const chartWidth = canvas.width - marginLeft;
	const chartHeight = canvas.height;
	const centerY = chartHeight / 2;

	// Draw axes
	ctx.strokeStyle = axisColor;
	ctx.lineWidth = 1;
	ctx.setLineDash([4, 3]);

	// Horizontal center axis
	ctx.beginPath();
	ctx.moveTo(marginLeft, centerY);
	ctx.lineTo(canvas.width, centerY);
	ctx.stroke();

	// Vertical Y axis
	ctx.beginPath();
	ctx.moveTo(marginLeft, 0);
	ctx.lineTo(marginLeft, canvas.height);
	ctx.stroke();

	ctx.setLineDash([]);

	// Axis labels
	ctx.fillStyle = textColor;
	ctx.font = font;
	ctx.textAlign = 'right';
	ctx.fillText('+50%', marginLeft - 5, 12);
	ctx.fillText('0', marginLeft - 5, centerY + 4);
	ctx.fillText('-50%', marginLeft - 5, chartHeight - 4);

	// Normalize and plot values
	const maxValues = Math.floor(chartWidth / stepX);
	const plotValues = values.slice(0, maxValues);

	ctx.strokeStyle = lineColor;
	ctx.lineWidth = 2;
	ctx.beginPath();

	plotValues.forEach((v, i) => {
		const x = marginLeft + i * stepX;
		const y = centerY - (v / 50) * (chartHeight / 2); // Scale -50..50 to canvas height
		if (i === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	});

	ctx.stroke();
}
