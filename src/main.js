/** @import { AppSettings, AppState, PitchFilter, PitchSample, ReferenceTone, TuningMode, TuningResultStabilizer, TuningTarget } from './types.js' */

import { createAppView } from './app-view.js';
import { buildTargets, getConfig, getCustomConfig, isValidCustomTuning } from './configs.js';
import { getElement } from './helpers.js';
import { createPitchFilter } from './pitch-filter.js';
import { startReferenceTone } from './reference-tone.js';
import {
	DEFAULT_SETTINGS,
	loadSettings,
	normalizeSettings,
	saveSettings,
	serializeSettingsHash,
} from './settings.js';
import { createSettingsView } from './settings-view.js';
import { startTuner } from './tuner-api.js';
import { createTunerSessionController } from './tuner-session-controller.js';
import { createTuningResult } from './tuning-engine.js';
import { createTuningResultStabilizer } from './tuning-result-stabilizer.js';
import { createHeadstockVisualization } from './vis-headstock.js';
import { createInfoPanelVisualization } from './vis-info-panel.js';

const STALE_READING_MS = 750;
const sessionController = createTunerSessionController(startTuner);

/** @type {ReturnType<typeof createAppView>} */
let appView;
/** @type {ReturnType<typeof createSettingsView>} */
let settingsView;
/** @type {ReturnType<typeof createHeadstockVisualization>} */
let headstockView;
/** @type {ReturnType<typeof createInfoPanelVisualization>} */
let infoPanelView;
/** @type {TuningMode} */
let tuningMode = 'auto';
/** @type {number | null} */
let manualStringIndex = null;
/** @type {AppSettings} */
let settings = DEFAULT_SETTINGS;
/** @type {TuningTarget[]} */
let targets = [];
/** @type {PitchFilter | null} */
let activeFilter = null;
/** @type {TuningResultStabilizer | null} */
let activeResultStabilizer = null;
/** @type {ReferenceTone | null} */
let activeReferenceTone = null;

function setupApp() {
	settings = loadSettings(localStorage, location.hash);
	applySettings(false);
	document.addEventListener('visibilitychange', handleVisibilityChange);
	window.addEventListener('pagehide', stopForBackground);
	appView.renderMode(tuningMode);
	appView.renderState('idle');
}

async function startListening() {
	if (sessionController.running) return;
	appView.renderState('requesting');
	const handlers = { onError: handleRuntimeError, onSample: createPitchHandler() };

	try {
		const session = await sessionController.start(handlers, { deviceId: settings.deviceId });
		if (!session) return;
		if (document.hidden) {
			await sessionController.stop();
			return;
		}
		headstockView.renderTargets(targets);
		headstockView.setHandedness(settings.handedness);
		await refreshDevices();
		appView.renderState('no-signal');
	} catch (error) {
		await sessionController.stop();
		showError(error);
	}
}

function createPitchHandler() {
	/** @type {number | null} */
	let previousStringIndex = null;
	const pitchFilter = createPitchFilter();
	activeFilter = pitchFilter;
	const resultStabilizer = createTuningResultStabilizer();
	activeResultStabilizer = resultStabilizer;
	let lastValidReading = performance.now();
	let readingIsVisible = false;

	/** @param {PitchSample} sample */
	return sample => {
		if (!sessionController.running) return;
		const estimate = pitchFilter.process(sample);
		if (!estimate) {
			appView.renderState(sample.rms < 0.001 ? 'no-signal' : 'unclear-signal');
			if (readingIsVisible && performance.now() - lastValidReading >= STALE_READING_MS) {
				clearVisualizations();
				pitchFilter.reset();
				resultStabilizer.reset();
				previousStringIndex = null;
				readingIsVisible = false;
			}
			return;
		}

		lastValidReading = performance.now();
		readingIsVisible = true;
		appView.renderState('listening');
		const candidateResult = createTuningResult(estimate, {
			mode: tuningMode,
			manualStringIndex: manualStringIndex ?? undefined,
			previousStringIndex,
			referencePitch: settings.referencePitch,
			targets,
		});
		const result = resultStabilizer.process(candidateResult);
		if (!result) return;
		previousStringIndex = result.stringIndex;
		headstockView.update(result);
		infoPanelView.update(result);
	};
}

function applySettings(updateUrl = true) {
	const config = settings.presetId === 'custom'
		? getCustomConfig(settings.customMidiNotes)
		: getConfig(settings.presetId);
	targets = buildTargets(config, settings.referencePitch, settings.capo);
	appView.renderSettings(settings, config, targets);
	settingsView.render(settings, targets);
	headstockView.renderTargets(targets);
	headstockView.setHandedness(settings.handedness);
	activeFilter?.reset();
	activeResultStabilizer?.reset();
	clearVisualizations();
	saveSettings(localStorage, settings);
	if (updateUrl) history.replaceState(null, '', `${location.pathname}${location.search}${serializeSettingsHash(settings)}`);
	restartReferenceToneIfPlaying();
}

/** @param {Partial<AppSettings>} changes @param {boolean} [updateUrl] */
function updateSettings(changes, updateUrl = true) {
	settings = normalizeSettings({ ...settings, ...changes });
	applySettings(updateUrl);
}

function openSettings() {
	settingsView.open();
	refreshDevices();
}

function resetSettings() {
	stopReferenceTone();
	settings = DEFAULT_SETTINGS;
	applySettings();
}

/** @param {number[]} midiNotes */
function updateCustomTuning(midiNotes) {
	if (!isValidCustomTuning(midiNotes)) {
		settingsView.setCustomError('Notes must be unique and descend from string 1 to string 6.');
		return;
	}
	settingsView.setCustomError('');
	updateSettings({ customMidiNotes: midiNotes, presetId: 'custom' });
}

async function toggleReferenceTone() {
	if (activeReferenceTone) {
		await stopReferenceTone();
		return;
	}
	const { stringIndex, volume } = settingsView.getToneSelection();
	const target = targets[stringIndex];
	if (!target) return;
	activeReferenceTone = await startReferenceTone(target.frequency, volume);
	settingsView.renderToneState(true);
}

async function stopReferenceTone() {
	const tone = activeReferenceTone;
	activeReferenceTone = null;
	await tone?.stop();
	settingsView.renderToneState(false);
}

function restartReferenceToneIfPlaying() {
	if (!activeReferenceTone) return;
	stopReferenceTone().then(toggleReferenceTone);
}

async function refreshDevices() {
	if (!navigator.mediaDevices.enumerateDevices) return;
	const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput');
	settingsView.renderDevices(devices, settings.deviceId);
}

/** @param {string} deviceId */
async function changeDevice(deviceId) {
	updateSettings({ deviceId }, false);
	if (!sessionController.active) return;
	await stopListening('stopped');
	await startListening();
}

/** @param {number} stringIndex */
function selectManualString(stringIndex) {
	tuningMode = 'manual';
	manualStringIndex = stringIndex;
	headstockView.select(stringIndex);
	appView.renderMode(tuningMode);
}

function selectAutoMode() {
	tuningMode = 'auto';
	manualStringIndex = null;
	headstockView.select(null);
	appView.renderMode(tuningMode);
}

/** @param {AppState} state */
async function stopListening(state) {
	activeFilter = null;
	activeResultStabilizer = null;
	await sessionController.stop();
	clearVisualizations();
	appView.renderState(state);
}

function handleVisibilityChange() {
	if (document.hidden) stopForBackground();
}

function stopForBackground() {
	stopReferenceTone();
	if (!sessionController.running) return;
	stopListening('stopped').then(() => {
		appView.setStatus('Microphone stopped when the page moved to the background.');
	});
}

/** @param {Error} error */
function handleRuntimeError(error) {
	stopListening('error').then(() => showError(error));
}

/** @param {unknown} error */
function showError(error) {
	appView.renderState('error', getErrorMessage(error));
	console.error('Tuner error:', error);
}

function clearVisualizations() {
	headstockView.clear();
	infoPanelView.clear();
}

/** @param {unknown} error @returns {string} */
function getErrorMessage(error) {
	if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Microphone access was denied. Allow it in browser settings, then retry.';
	if (error instanceof DOMException && error.name === 'NotFoundError') return 'No microphone was found.';
	if (error instanceof DOMException && (error.name === 'NotReadableError' || error.name === 'AbortError')) return 'The microphone is busy in another application.';
	if (error instanceof DOMException && error.name === 'OverconstrainedError') return 'The selected microphone is unavailable. Choose another input.';
	if (error instanceof DOMException && error.name === 'SecurityError') return 'The browser blocked microphone access for this page.';
	if (error instanceof Error && error.message === 'Microphone disconnected') return 'The microphone was disconnected. Reconnect it and retry.';
	return 'The tuner could not start. Check your microphone and retry.';
}

function main() {
	appView = createAppView({
		onOpenSettings: openSettings,
		onSelectAuto: selectAutoMode,
		onStart: startListening,
		onStop: () => stopListening('stopped'),
	});
	settingsView = createSettingsView({
		onClose: stopReferenceTone,
		onCustomTuningChange: updateCustomTuning,
		onDeviceChange: changeDevice,
		onReset: resetSettings,
		onToggleTone: toggleReferenceTone,
		onToneSelectionChange: restartReferenceToneIfPlaying,
		onUpdate: updateSettings,
	});
	headstockView = createHeadstockVisualization(getElement('#vis-headstock'), selectManualString);
	infoPanelView = createInfoPanelVisualization(getElement('#vis-info-panel'));
	if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
		appView.renderState('unsupported', 'Use a current browser over HTTPS to enable microphone tuning.');
		return;
	}
	setupApp();
}

document.addEventListener('DOMContentLoaded', main);
