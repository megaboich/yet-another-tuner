/**
 * Local AudioWorkletGlobalScope declarations are required because TypeScript's
 * DOM library does not include the processor-side API.
 * See https://github.com/microsoft/TypeScript/issues/28308
 */

declare abstract class AudioWorkletProcessor {
	constructor(options?: AudioWorkletNodeOptions);

	readonly port: MessagePort;

	abstract process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>
	): boolean;
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

declare const sampleRate: number;

interface AudioWorkletNodeOptions {
	processorOptions?: any;
	numberOfInputs?: number;
	numberOfOutputs?: number;
	outputChannelCount?: number[];
	channelCount?: number;
	channelCountMode?: 'max' | 'clamped-max' | 'explicit';
	channelInterpretation?: 'speakers' | 'discrete';
}
