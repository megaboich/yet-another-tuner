export function registerServiceWorker() {
	// Development caching would fight Vite's live updates and obscure source changes.
	if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

	// Registration is not needed for the first render, so keep it off the load path.
	window.addEventListener('load', () => {
		navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, {
			// Limit control to this app when deployed below a shared GitHub Pages origin.
			scope: import.meta.env.BASE_URL,
			// Always revalidate the worker and its generated precache manifest on deploy.
			updateViaCache: 'none',
		}).catch(error => console.error('Service worker registration failed:', error));
	}, { once: true });
}
