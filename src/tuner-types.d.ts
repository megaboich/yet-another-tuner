/**
 * Having to define own types for AudioWorkletProcessor and AudioWorkletNode
 * because the typescript definitions in the lib.dom.d.ts file are not
 * complete and do not match the actual implementation in the browser.
 * This is a workaround until the types are fixed in the lib.dom.d.ts file.
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

interface AudioWorkletNodeOptions {
	processorOptions?: any;
	numberOfInputs?: number;
	numberOfOutputs?: number;
	outputChannelCount?: number[];
	channelCount?: number;
	channelCountMode?: 'max' | 'clamped-max' | 'explicit';
	channelInterpretation?: 'speakers' | 'discrete';
}
