/** @import { AppSettings, AppState, GuitarConfig, TuningMode, TuningTarget } from './types.js' */

import { getElement } from './helpers.js';

/**
 * @param {{ onOpenSettings(): void, onSelectAuto(): void, onStart(): void, onStop(): void }} handlers
 */
export function createAppView(handlers) {
	const welcomeScreen = getElement('#welcome-screen');
	const tuningScreen = getElement('#tuning-screen');
	const startButton = /** @type {HTMLButtonElement} */ (getElement('#start-button'));
	const stopButton = /** @type {HTMLButtonElement} */ (getElement('#stop-button'));
	const autoButton = getElement('#auto-mode-button');
	const tunerStatus = getElement('#tuner-status');
	const signalStatus = getElement('#signal-status-text');
	const welcomeTuning = getElement('#welcome-tuning');
	const footerSettings = getElement('#footer-settings');
	const stringsTitle = getElement('#strings-title');
	const settingsButton = getElement('#settings-button');

	startButton.addEventListener('click', handlers.onStart);
	stopButton.addEventListener('click', handlers.onStop);
	autoButton.addEventListener('click', handlers.onSelectAuto);
	settingsButton.addEventListener('click', handlers.onOpenSettings);

	/** @type {AppState | null} */
	let currentState = null;

	return {
		/** @param {AppSettings} settings @param {GuitarConfig} config @param {TuningTarget[]} targets */
		renderSettings(settings, config, targets) {
			document.documentElement.dataset.theme = settings.theme;
			document.documentElement.dataset.handedness = settings.handedness;
			stringsTitle.textContent = config.name;
			welcomeTuning.textContent = `${config.name} · ${targets.toReversed().map(target => target.noteName).join(' ')}`;
			footerSettings.textContent = `A4 = ${settings.referencePitch} Hz · Capo ${settings.capo}`;
		},

		/** @param {TuningMode} mode */
		renderMode(mode) {
			const isAuto = mode === 'auto';
			autoButton.classList.toggle('is-active', isAuto);
			autoButton.setAttribute('aria-pressed', String(isAuto));
		},

		/** @param {AppState} state @param {string} [customMessage] */
		renderState(state, customMessage) {
			if (currentState === state && !customMessage) return;
			currentState = state;
			document.body.dataset.appState = state;
			const isTuning = ['listening', 'no-signal', 'unclear-signal'].includes(state);
			welcomeScreen.hidden = isTuning || state === 'requesting';
			tuningScreen.hidden = !isTuning && state !== 'requesting';
			startButton.toggleAttribute('disabled', state === 'requesting' || state === 'unsupported');
			stopButton.toggleAttribute('disabled', !isTuning);
			if (state === 'idle') tunerStatus.textContent = 'Microphone access begins only when you press start.';
			if (state === 'requesting') tunerStatus.textContent = 'Requesting microphone access…';
			if (state === 'error') tunerStatus.textContent = customMessage ?? 'The tuner stopped unexpectedly.';
			if (state === 'stopped') tunerStatus.textContent = 'Microphone stopped. Your audio is no longer in use.';
			if (state === 'unsupported') tunerStatus.textContent = customMessage ?? 'This browser cannot run the tuner.';
			const buttonLabel = startButton.querySelector('span');
			if (buttonLabel) buttonLabel.textContent = state === 'error' ? 'Retry' : 'Start listening';
			if (state === 'requesting') signalStatus.textContent = 'Starting audio engine';
			if (state === 'listening') signalStatus.textContent = 'Signal locked';
			if (state === 'no-signal') signalStatus.textContent = 'Listening · Play a string';
			if (state === 'unclear-signal') signalStatus.textContent = 'Signal unclear · Play one string';
		},

		/** @param {string} message */
		setStatus(message) {
			tunerStatus.textContent = message;
		},
	};
}
