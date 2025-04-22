/**
 * Finds a single element by selector in the DOM
 * @param {string} selector
 * @returns {HTMLElement}
 */
export function getElement(selector) {
	const element = document.querySelector(selector);
	if (!(element instanceof HTMLElement))
		throw new Error(`Element is not found by selector "${selector}"`);
	return element;
};
