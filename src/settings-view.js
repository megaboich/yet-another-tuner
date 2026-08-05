/** @import { AppSettings, TuningTarget } from './types.js' */

import { getElement } from './helpers.js';

/**
 * @typedef {object} SettingsViewHandlers
 * @property {(changes: Partial<AppSettings>) => void} onUpdate
 * @property {(deviceId: string) => void} onDeviceChange
 * @property {(midiNotes: number[]) => void} onCustomTuningChange
 * @property {() => void} onReset
 * @property {() => void} onToggleTone
 * @property {() => void} onToneSelectionChange
 * @property {() => void} onClose
 */

/** @param {SettingsViewHandlers} handlers */
export function createSettingsView(handlers) {
	const dialog = /** @type {HTMLDialogElement} */ (getElement('#settings-dialog'));
	const presetSelect = /** @type {HTMLSelectElement} */ (getElement('#preset-select'));
	const capoSelect = /** @type {HTMLSelectElement} */ (getElement('#capo-select'));
	const themeSelect = /** @type {HTMLSelectElement} */ (getElement('#theme-select'));
	const handednessSelect = /** @type {HTMLSelectElement} */ (getElement('#handedness-select'));
	const deviceSelect = /** @type {HTMLSelectElement} */ (getElement('#device-select'));
	const referenceInput = /** @type {HTMLInputElement} */ (getElement('#reference-input'));
	const referenceOutput = getElement('#reference-output');
	const customFields = getElement('#custom-tuning-fields');
	const customNotes = getElement('#custom-note-selects');
	const customError = getElement('#custom-tuning-error');
	const toneSelect = /** @type {HTMLSelectElement} */ (getElement('#tone-string-select'));
	const toneVolume = /** @type {HTMLInputElement} */ (getElement('#tone-volume-input'));
	const toneButton = getElement('#tone-button');

	for (let capo = 0; capo <= 12; capo += 1) {
		capoSelect.add(new Option(capo === 0 ? 'No capo' : `Fret ${capo}`, String(capo)));
	}
	for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
		const label = document.createElement('label');
		label.textContent = `String ${stringIndex + 1}`;
		const select = document.createElement('select');
		select.dataset.customString = String(stringIndex);
		select.setAttribute('aria-label', `Custom note for string ${stringIndex + 1}`);
		for (let midiNote = 28; midiNote <= 76; midiNote += 1) {
			select.add(new Option(getMidiNoteLabel(midiNote), String(midiNote)));
		}
		select.addEventListener('change', emitCustomTuning);
		label.appendChild(select);
		customNotes.appendChild(label);
	}

	presetSelect.addEventListener('change', () => handlers.onUpdate({ presetId: /** @type {AppSettings['presetId']} */ (presetSelect.value) }));
	capoSelect.addEventListener('change', () => handlers.onUpdate({ capo: Number(capoSelect.value) }));
	themeSelect.addEventListener('change', () => handlers.onUpdate({ theme: /** @type {AppSettings['theme']} */ (themeSelect.value) }));
	handednessSelect.addEventListener('change', () => handlers.onUpdate({ handedness: /** @type {AppSettings['handedness']} */ (handednessSelect.value) }));
	deviceSelect.addEventListener('change', () => handlers.onDeviceChange(deviceSelect.value));
	referenceInput.addEventListener('input', () => handlers.onUpdate({ referencePitch: Number(referenceInput.value) }));
	toneSelect.addEventListener('change', handlers.onToneSelectionChange);
	toneButton.addEventListener('click', handlers.onToggleTone);
	getElement('#reset-settings-button').addEventListener('click', handlers.onReset);
	dialog.addEventListener('close', handlers.onClose);

	function emitCustomTuning() {
		const midiNotes = Array.from(customNotes.querySelectorAll('select')).map(select => Number(select.value));
		handlers.onCustomTuningChange(midiNotes);
	}

	return {
		open() {
			dialog.showModal();
		},

		/** @param {AppSettings} settings @param {TuningTarget[]} targets */
		render(settings, targets) {
			setSelectValue(presetSelect, settings.presetId);
			setSelectValue(capoSelect, String(settings.capo));
			setSelectValue(themeSelect, settings.theme);
			setSelectValue(handednessSelect, settings.handedness);
			setSelectValue(deviceSelect, settings.deviceId);
			customFields.hidden = settings.presetId !== 'custom';
			for (const select of customNotes.querySelectorAll('select')) {
				const stringIndex = Number(select.dataset.customString);
				select.value = String(settings.customMidiNotes[stringIndex]);
			}
			referenceInput.value = String(settings.referencePitch);
			referenceOutput.textContent = `${settings.referencePitch} Hz`;
			const currentTone = toneSelect.value;
			toneSelect.replaceChildren();
			for (const target of targets) {
				toneSelect.add(new Option(`String ${target.stringNumber} · ${target.noteName}${target.octave} · ${target.frequency.toFixed(1)} Hz`, String(target.stringIndex)));
			}
			toneSelect.value = Array.from(toneSelect.options).some(option => option.value === currentTone) ? currentTone : '5';
		},

		/** @param {MediaDeviceInfo[]} devices @param {string} selectedDeviceId */
		renderDevices(devices, selectedDeviceId) {
			deviceSelect.replaceChildren(new Option('System default', ''));
			devices.forEach((device, index) => deviceSelect.add(new Option(device.label || `Microphone ${index + 1}`, device.deviceId)));
			setSelectValue(deviceSelect, selectedDeviceId);
		},

		getToneSelection() {
			return { stringIndex: Number(toneSelect.value), volume: Number(toneVolume.value) / 100 };
		},

		/** @param {boolean} playing */
		renderToneState(playing) {
			toneButton.textContent = playing ? 'Stop tone' : 'Play tone';
			toneButton.setAttribute('aria-pressed', String(playing));
		},

		/** @param {string} message */
		setCustomError(message) {
			customError.textContent = message;
		},
	};
}

/** @param {HTMLSelectElement} select @param {string} value */
function setSelectValue(select, value) {
	if (Array.from(select.options).some(option => option.value === value)) select.value = value;
}

/** @param {number} midiNote */
function getMidiNoteLabel(midiNote) {
	const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
	return `${names[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;
}
