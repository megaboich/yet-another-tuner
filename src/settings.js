/** @import { AppSettings, Handedness, PresetId, StorageLike, Theme } from './types.js' */

import { configs, DEFAULT_CUSTOM_MIDI_NOTES, isValidCustomTuning } from './configs.js';

export const SETTINGS_KEY = 'yet-another-tuner.settings.v1';

/** @type {AppSettings} */
export const DEFAULT_SETTINGS = Object.freeze({
	capo: 0,
	customMidiNotes: DEFAULT_CUSTOM_MIDI_NOTES,
	deviceId: '',
	handedness: 'right',
	presetId: 'standard',
	referencePitch: 440,
	theme: 'system',
});

/**
 * @param {unknown} value
 * @returns {AppSettings}
 */
export function normalizeSettings(value) {
	const source = isRecord(value) ? value : {};
	return {
		capo: clampInteger(source.capo, 0, 12, DEFAULT_SETTINGS.capo),
		customMidiNotes: isValidCustomTuning(source.customMidiNotes)
			? [...source.customMidiNotes]
			: [...DEFAULT_SETTINGS.customMidiNotes],
		deviceId: typeof source.deviceId === 'string' ? source.deviceId : '',
		handedness: isHandedness(source.handedness) ? source.handedness : DEFAULT_SETTINGS.handedness,
		presetId: isPresetId(source.presetId) ? source.presetId : DEFAULT_SETTINGS.presetId,
		referencePitch: clampInteger(source.referencePitch, 432, 446, DEFAULT_SETTINGS.referencePitch),
		theme: isTheme(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
	};
}

/**
 * @param {StorageLike} storage
 * @param {string} hash
 * @returns {AppSettings}
 */
export function loadSettings(storage, hash) {
	/** @type {AppSettings} */
	let stored;
	try {
		stored = normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null'));
	} catch {
		stored = DEFAULT_SETTINGS;
	}
	return { ...stored, ...parseSettingsHash(hash) };
}

/**
 * @param {StorageLike} storage
 * @param {AppSettings} settings
 */
export function saveSettings(storage, settings) {
	try {
		storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
	} catch {
		// Storage can be unavailable in private or restricted browsing modes.
	}
}

/**
 * @param {string} hash
 * @returns {Partial<AppSettings>}
 */
export function parseSettingsHash(hash) {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	/** @type {Partial<AppSettings>} */
	const parsed = {};
	const presetId = params.get('t');
	const referencePitch = params.has('a') ? Number(params.get('a')) : Number.NaN;
	const capo = params.has('c') ? Number(params.get('c')) : Number.NaN;
	const customMidiNotes = params.get('n')?.split('.').map(Number);
	if (isPresetId(presetId)) parsed.presetId = presetId;
	if (presetId === 'custom' && isValidCustomTuning(customMidiNotes)) parsed.customMidiNotes = customMidiNotes;
	if (Number.isInteger(referencePitch) && referencePitch >= 432 && referencePitch <= 446) parsed.referencePitch = referencePitch;
	if (Number.isInteger(capo) && capo >= 0 && capo <= 12) parsed.capo = capo;
	return parsed;
}

/**
 * @param {AppSettings} settings
 * @returns {string}
 */
export function serializeSettingsHash(settings) {
	const params = new URLSearchParams();
	if (settings.presetId !== DEFAULT_SETTINGS.presetId) params.set('t', settings.presetId);
	if (settings.referencePitch !== DEFAULT_SETTINGS.referencePitch) params.set('a', String(settings.referencePitch));
	if (settings.capo !== DEFAULT_SETTINGS.capo) params.set('c', String(settings.capo));
	if (settings.presetId === 'custom') params.set('n', settings.customMidiNotes.join('.'));
	const value = params.toString();
	return value ? `#${value}` : '';
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
	return typeof value === 'object' && value !== null;
}

/** @param {unknown} value @returns {value is PresetId} */
function isPresetId(value) {
	return value === 'custom' || (typeof value === 'string' && configs.some(config => config.id === value));
}

/** @param {unknown} value @returns {value is Theme} */
function isTheme(value) {
	return value === 'system' || value === 'dark' || value === 'light';
}

/** @param {unknown} value @returns {value is Handedness} */
function isHandedness(value) {
	return value === 'right' || value === 'left';
}

/**
 * @param {unknown} value
 * @param {number} minimum
 * @param {number} maximum
 * @param {number} fallback
 */
function clampInteger(value, minimum, maximum, fallback) {
	return typeof value === 'number' && Number.isInteger(value)
		? Math.max(minimum, Math.min(maximum, value))
		: fallback;
}
