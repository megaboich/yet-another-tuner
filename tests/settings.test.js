/** @import { StorageLike } from '../src/types.js' */

import { describe, expect, it } from 'vitest';

import {
	DEFAULT_SETTINGS,
	loadSettings,
	normalizeSettings,
	parseSettingsHash,
	saveSettings,
	serializeSettingsHash,
	SETTINGS_KEY,
} from '../src/settings.js';

function createStorage() {
	/** @type {Map<string, string>} */
	const values = new Map();
	/** @type {StorageLike} */
	const storage = {
		getItem: key => values.get(key) ?? null,
		removeItem: key => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	};
	return { storage, values };
}

describe('settings', () => {
	it('normalizes malformed and out-of-range values', () => {
		expect(normalizeSettings({
			capo: 99,
			handedness: 'upside-down',
			presetId: 'invalid',
			referencePitch: 500,
			theme: 'blue',
		})).toEqual({ ...DEFAULT_SETTINGS, capo: 12, referencePitch: 446 });
	});

	it('saves and reloads preferences', () => {
		const { storage, values } = createStorage();
		const settings = normalizeSettings({ ...DEFAULT_SETTINGS, presetId: 'drop-d', theme: 'light' });
		saveSettings(storage, settings);

		expect(values.has(SETTINGS_KEY)).toBe(true);
		expect(loadSettings(storage, '')).toEqual(settings);
	});

	it('applies valid musical hash settings over local preferences', () => {
		const { storage } = createStorage();
		saveSettings(storage, { ...DEFAULT_SETTINGS, theme: 'light', presetId: 'open-g' });
		const settings = loadSettings(storage, '#t=dadgad&a=442&c=3');

		expect(settings.presetId).toBe('dadgad');
		expect(settings.referencePitch).toBe(442);
		expect(settings.capo).toBe(3);
		expect(settings.theme).toBe('light');
	});

	it('serializes only shareable musical settings', () => {
		const hash = serializeSettingsHash({
			...DEFAULT_SETTINGS,
			capo: 2,
			deviceId: 'private-device',
			handedness: 'left',
			presetId: 'drop-d',
			referencePitch: 432,
			theme: 'light',
		});

		expect(parseSettingsHash(hash)).toEqual({ capo: 2, presetId: 'drop-d', referencePitch: 432 });
		expect(hash).not.toContain('private-device');
		expect(hash).not.toContain('light');
	});

	it('round-trips a valid custom tuning through the hash', () => {
		const hash = serializeSettingsHash({
			...DEFAULT_SETTINGS,
			customMidiNotes: [65, 60, 55, 50, 45, 40],
			presetId: 'custom',
		});

		expect(hash).toContain('t=custom');
		expect(parseSettingsHash(hash)).toEqual({
			customMidiNotes: [65, 60, 55, 50, 45, 40],
			presetId: 'custom',
		});
	});

	it('rejects malformed custom tuning hashes', () => {
		expect(parseSettingsHash('#t=custom&n=64.60.60.50.45.40')).toEqual({ presetId: 'custom' });
		expect(normalizeSettings({ customMidiNotes: [1, 2] }).customMidiNotes).toEqual(DEFAULT_SETTINGS.customMidiNotes);
	});
});
