/** @import { TunerAPIResponse } from './types.js' */

const MAX_EVENT_LOG_SIZE = 100;

/** @param {HTMLElement} panel */
export function createInfoPanelVisualization(panel) {
	const noteName = getChild(panel, '#note-name');
	const frequency = getChild(panel, '#note-frequency');
	const centsValue = getChild(panel, '#cents-value');
	const tuningDirection = getChild(panel, '#tuning-direction');
	const tuningIndicator = getChild(panel, '#tuning-indicator');
	const chartContainer = getChild(panel, '#tuning-chart');
	const chartCanvas = document.createElement('canvas');
	chartCanvas.setAttribute('aria-hidden', 'true');
	chartContainer.replaceChildren(chartCanvas);
	const context = chartCanvas.getContext('2d');
	if (!context) throw new Error('Canvas context is not available');
	const chartCtx = context;
	/** @type {TunerAPIResponse[]} */
	const eventLog = [];

	function renderChart() {
		const width = chartContainer.clientWidth;
		const height = chartContainer.clientHeight;
		const centerY = height / 2;
		const styles = getComputedStyle(document.documentElement);
		chartCtx.clearRect(0, 0, width, height);
		chartCtx.strokeStyle = styles.getPropertyValue('--line').trim();
		chartCtx.lineWidth = 1;
		chartCtx.setLineDash([4, 4]);
		chartCtx.beginPath();
		chartCtx.moveTo(0, centerY);
		chartCtx.lineTo(width, centerY);
		chartCtx.stroke();
		chartCtx.setLineDash([]);

		if (eventLog.length === 0) return;
		const values = eventLog.slice(-Math.floor(width / 4));
		chartCtx.strokeStyle = styles.getPropertyValue('--brass-bright').trim();
		chartCtx.lineWidth = 2;
		chartCtx.beginPath();
		values.forEach((entry, index) => {
			const x = values.length === 1 ? width : index * width / (values.length - 1);
			const cents = Math.max(-50, Math.min(50, entry.cents));
			const y = centerY - cents / 50 * (height * 0.42);
			if (index === 0) chartCtx.moveTo(x, y);
			else chartCtx.lineTo(x, y);
		});
		chartCtx.stroke();
	}

	function resizeChart() {
		const width = Math.max(1, chartContainer.clientWidth);
		const height = Math.max(1, chartContainer.clientHeight);
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		chartCanvas.width = Math.round(width * ratio);
		chartCanvas.height = Math.round(height * ratio);
		chartCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
		renderChart();
	}

	const resizeObserver = new ResizeObserver(resizeChart);
	resizeObserver.observe(chartContainer);
	resizeChart();

	return {
		/** @param {TunerAPIResponse} entry */
		update(entry) {
			if (eventLog.length >= MAX_EVENT_LOG_SIZE) eventLog.shift();
			eventLog.push(entry);
			const clampedCents = Math.max(-50, Math.min(50, entry.cents));
			let tuningState = 'sharp';
			if (Math.abs(entry.cents) <= 3) tuningState = 'in-tune';
			else if (entry.cents < 0) tuningState = 'flat';
			noteName.innerText = `${getNoteName(entry.note)}${entry.octave}`;
			frequency.innerText = `${entry.frequency.toFixed(2)} Hz`;
			centsValue.innerText = `${formatSigned(entry.cents)} cents`;
			tuningDirection.innerText = tuningState === 'in-tune' ? 'In tune' : tuningState;
			panel.dataset.tuningState = tuningState;
			tuningIndicator.style.setProperty('--cents', clampedCents.toFixed(2));
			requestAnimationFrame(renderChart);
		},

		clear() {
			eventLog.length = 0;
			noteName.innerText = '—';
			frequency.innerText = 'Play a string';
			centsValue.innerText = '0.0 cents';
			tuningDirection.innerText = 'Waiting';
			delete panel.dataset.tuningState;
			tuningIndicator.style.setProperty('--cents', '0');
			requestAnimationFrame(renderChart);
		},

		destroy() {
			resizeObserver.disconnect();
			chartCanvas.remove();
		},
	};
}

/** @param {HTMLElement} parent @param {string} selector */
function getChild(parent, selector) {
	const child = parent.querySelector(selector);
	if (!(child instanceof HTMLElement)) throw new Error(`Element is not found by selector "${selector}"`);
	return child;
}

/** @param {number} note @returns {string} */
function getNoteName(note) {
	return ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][note % 12];
}

/** @param {number} value @returns {string} */
function formatSigned(value) {
	return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}
