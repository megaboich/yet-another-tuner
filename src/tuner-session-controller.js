/** @import { TunerEventHandlers, TunerSession, TunerStartOptions } from './types.js' */

/**
 * Owns startup cancellation and guarantees that a superseded microphone
 * session is stopped before it can become active.
 * @param {(handlers: TunerEventHandlers, options?: TunerStartOptions) => Promise<TunerSession>} startSession
 */
export function createTunerSessionController(startSession) {
	/** @type {TunerSession | null} */
	let activeSession = null;
	/** @type {Promise<TunerSession> | null} */
	let pendingSession = null;
	let generation = 0;

	return {
		get active() {
			return activeSession;
		},

		get running() {
			return Boolean(activeSession || pendingSession);
		},

		/** @param {TunerEventHandlers} handlers @param {TunerStartOptions} options */
		async start(handlers, options) {
			if (activeSession || pendingSession) return null;
			const currentGeneration = ++generation;
			// startSession runs synchronously up to its first await, preserving the click activation.
			const sessionPromise = startSession(handlers, options);
			pendingSession = sessionPromise;
			try {
				const session = await sessionPromise;
				if (currentGeneration !== generation) {
					await session.stop();
					return null;
				}
				activeSession = session;
				return session;
			} finally {
				if (pendingSession === sessionPromise) pendingSession = null;
			}
		},

		async stop() {
			generation += 1;
			pendingSession = null;
			const session = activeSession;
			activeSession = null;
			await session?.stop();
		},
	};
}
