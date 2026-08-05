export type GuitarConfig = {
	id: PresetId;
	name: string;
	midiNotes: readonly number[];
};

export type PresetId = 'standard' | 'drop-d' | 'dadgad' | 'open-g' | 'open-d' | 'half-step-down' | 'full-step-down' | 'custom';
export type Theme = 'system' | 'dark' | 'light';
export type Handedness = 'right' | 'left';

export type AppSettings = {
	presetId: PresetId;
	referencePitch: number;
	capo: number;
	theme: Theme;
	handedness: Handedness;
	deviceId: string;
	customMidiNotes: number[];
};

export type ReferenceTone = {
	stop(): Promise<void>;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type PitchSample = {
	confidence: number;
	frequency: number | null;
	rms: number;
};

export type PitchEstimate = PitchSample & {
	frequency: number;
};

export type PitchFilter = {
	process(sample: PitchSample): PitchEstimate | null;
	reset(): void;
};

export type AppState
	= | 'unsupported'
		| 'idle'
		| 'requesting'
		| 'listening'
		| 'no-signal'
		| 'unclear-signal'
		| 'error'
		| 'stopped';

export type TunerSession = {
	deviceId: string;
	stop(): Promise<void>;
};

export type TunerStartOptions = {
	deviceId?: string;
};

export type TunerEventHandlers = {
	onError(error: Error): void;
	onSample(sample: PitchSample): void;
};

export type PitchProcessorMessage
	= | { type: 'ready' }
		| { type: 'estimate'; estimate: PitchSample }
		| { type: 'error'; message: string };

export type TuningMode = 'auto' | 'manual' | 'chromatic';

export type TuningTarget = {
	frequency: number;
	midiNote: number;
	noteName: string;
	octave: number;
	stringIndex: number | null;
	stringNumber: number | null;
};

export type TuningSelection = {
	harmonic: number;
	target: TuningTarget;
};

export type TunerAPIResponse = PitchEstimate & {
	detectedFrequency: number;
	harmonic: number;
	note: number;

	/** Cents flat (negative) or sharp (positive) from the selected target. */
	cents: number;
	octave: number;
	stringIndex: number | null;
	stringNumber: number | null;
	targetFrequency: number;
};

export type TuningResultStabilizer = {
	process(result: TunerAPIResponse): TunerAPIResponse | null;
	reset(): void;
};
