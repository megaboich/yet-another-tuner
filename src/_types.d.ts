declare global {
	type GuitarConfig = {
		name: string;
		stringFreqs: number[];
	};

	type TunerAPIResponse = {
		frequency: number;
		note: number;

		/**
		 * Window of ±50 cents so you can see if you’re flat (negative) or sharp (positive) within the current semitone.
		 */
		cents: number;
		octave: number;
	};
}

export {};
