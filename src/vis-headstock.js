/** @import { Handedness, TunerAPIResponse, TuningTarget } from './types.js' */

/**
 * @param {HTMLElement} container
 * @param {(stringIndex: number) => void} onSelect
 */
export function createHeadstockVisualization(container, onSelect) {
	const buttons = Array.from(container.querySelectorAll('button'));
	/** @type {Map<HTMLButtonElement, () => void>} */
	const selectHandlers = new Map();
	for (const button of buttons) {
		const handler = () => onSelect(Number(button.dataset.stringIndex));
		button.addEventListener('click', handler);
		selectHandlers.set(button, handler);
	}

	return {
		/** @param {TuningTarget[]} targets */
		renderTargets(targets) {
			for (const button of buttons) {
				const stringIndex = Number(button.dataset.stringIndex);
				const target = targets[stringIndex];
				if (!target) continue;
				const strong = button.querySelector('strong');
				const small = button.querySelector('small');
				if (strong) strong.textContent = target.noteName;
				if (small) small.textContent = target.frequency.toFixed(1);
				button.setAttribute('aria-label', `String ${target.stringNumber}, ${target.noteName}${target.octave}`);
			}
		},

		/** @param {Handedness} handedness */
		setHandedness(handedness) {
			const indexes = handedness === 'left' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
			for (const stringIndex of indexes) {
				const button = buttons.find(candidate => Number(candidate.dataset.stringIndex) === stringIndex);
				if (button) container.appendChild(button);
			}
		},

		/** @param {TunerAPIResponse} entry */
		update(entry) {
			if (entry.stringIndex === null) return;
			clearActiveString(buttons);
			const button = buttons.find(candidate => Number(candidate.dataset.stringIndex) === entry.stringIndex);
			if (!button) return;
			button.classList.add('is-active');
			button.style.setProperty('--string-color', getTuningColor(entry.cents));
		},

		/** @param {number | null} stringIndex */
		select(stringIndex) {
			for (const button of buttons) {
				const isSelected = Number(button.dataset.stringIndex) === stringIndex;
				button.classList.toggle('is-selected', isSelected);
				button.setAttribute('aria-pressed', String(isSelected));
			}
		},

		clear() {
			clearActiveString(buttons);
		},

		destroy() {
			for (const [button, handler] of selectHandlers) button.removeEventListener('click', handler);
			selectHandlers.clear();
		},
	};
}

/** @param {HTMLButtonElement[]} buttons */
function clearActiveString(buttons) {
	for (const button of buttons) {
		button.classList.remove('is-active');
		button.style.removeProperty('--string-color');
	}
}

/** @param {number} cents @returns {string} */
function getTuningColor(cents) {
	if (Math.abs(cents) <= 3) return 'var(--good)';
	if (Math.abs(cents) <= 15) return 'var(--warning)';
	return 'var(--danger)';
}
