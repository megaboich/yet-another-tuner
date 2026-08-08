const DEFAULT_OPTIONS = {
	hopSize: 512,
	highPassFrequency: 80,
	// The real sequence fixture showed that a stricter value could skip the
	// fundamental during string decay and produce an octave error.
	keyMaximumThreshold: 0.85,
	maxFrequency: 400,
	minConfidence: 0.6,
	minFrequency: 55,
	minRms: 0.000_5,
	windowSize: 2_048,
};

/**
 * Allocation-conscious McLeod Pitch Method detector using Type-II NSDF.
 */
export class MpmPitchDetector {
	/**
	 * @param {number} sampleRate
	 * @param {Partial<typeof DEFAULT_OPTIONS>} [overrides]
	 */
	constructor(sampleRate, overrides = {}) {
		this.sampleRate = sampleRate;
		this.options = { ...DEFAULT_OPTIONS, ...overrides };
		const { windowSize, maxFrequency, minFrequency } = this.options;
		this.minimumLag = Math.floor(sampleRate / maxFrequency);
		this.maximumLag = Math.min(windowSize - 2, Math.ceil(sampleRate / minFrequency));
		// Mirroring makes the trailing analysis window contiguous without copying.
		this.ring = new Float32Array(windowSize * 2);
		this.nsdf = new Float64Array(this.maximumLag + 2);
		this.energy = new Float64Array(windowSize + 1);
		this.peaks = new Uint16Array(this.maximumLag + 1);
		this.writeIndex = 0;
		this.sampleCount = 0;
		this.samplesSinceAnalysis = 0;
		this.previousInput = 0;
		this.previousOutput = 0;
		this.secondPreviousInput = 0;
		this.secondPreviousOutput = 0;
		// Attenuate handling, mains, and room rumble before periodicity analysis.
		this.highPassCoefficient = Math.exp(-2 * Math.PI * this.options.highPassFrequency / sampleRate);
		this.frequency = null;
		this.confidence = 0;
		this.rms = 0;
	}

	/**
	 * Add samples and analyze when a complete hop is available.
	 * @param {Float32Array} input
	 * @returns {boolean} Whether a new result is available.
	 */
	push(input) {
		let analyzed = false;
		for (const inputSample of input) {
			const firstPass = inputSample - this.previousInput
				+ this.highPassCoefficient * this.previousOutput;
			this.previousInput = inputSample;
			this.previousOutput = firstPass;
			const sample = firstPass - this.secondPreviousInput
				+ this.highPassCoefficient * this.secondPreviousOutput;
			this.secondPreviousInput = firstPass;
			this.secondPreviousOutput = sample;
			this.ring[this.writeIndex] = sample;
			this.ring[this.writeIndex + this.options.windowSize] = sample;
			this.writeIndex = (this.writeIndex + 1) % this.options.windowSize;

			if (this.sampleCount < this.options.windowSize) {
				this.sampleCount += 1;
				if (this.sampleCount === this.options.windowSize) {
					this.samplesSinceAnalysis = 0;
					this.analyze();
					analyzed = true;
				}
				continue;
			}

			this.samplesSinceAnalysis += 1;
			if (this.samplesSinceAnalysis >= this.options.hopSize) {
				this.samplesSinceAnalysis = 0;
				this.analyze();
				analyzed = true;
			}
		}
		return analyzed;
	}

	analyze() {
		const { windowSize, minConfidence, minRms, keyMaximumThreshold } = this.options;
		const start = this.writeIndex;
		this.energy[0] = 0;
		for (let index = 0; index < windowSize; index += 1) {
			const sample = this.ring[start + index];
			this.energy[index + 1] = this.energy[index] + sample * sample;
		}
		this.rms = Math.sqrt(this.energy[windowSize] / windowSize);
		if (this.rms < minRms) {
			this.reject();
			return;
		}

		this.nsdf[0] = 1;
		for (let lag = 1; lag <= this.maximumLag + 1; lag += 1) {
			let correlation = 0;
			const overlap = windowSize - lag;
			for (let index = 0; index < overlap; index += 1) {
				correlation += this.ring[start + index] * this.ring[start + index + lag];
			}
			const normalization = this.energy[windowSize - lag]
				+ this.energy[windowSize] - this.energy[lag];
			this.nsdf[lag] = normalization > Number.EPSILON
				? 2 * correlation / normalization
				: 0;
		}

		const peakCount = this.collectKeyMaxima();
		let globalMaximum = 0;
		for (let index = 0; index < peakCount; index += 1) {
			globalMaximum = Math.max(globalMaximum, this.getPeakHeight(this.peaks[index]));
		}
		if (globalMaximum < minConfidence) {
			this.reject();
			return;
		}

		const cutoff = Math.max(minConfidence, globalMaximum * keyMaximumThreshold);
		for (let index = 0; index < peakCount; index += 1) {
			const peak = this.peaks[index];
			const height = this.getPeakHeight(peak);
			if (height < cutoff) continue;
			const period = peak + this.getPeakOffset(peak);
			const frequency = this.sampleRate / period;
			if (frequency < this.options.minFrequency || frequency > this.options.maxFrequency) continue;
			this.frequency = frequency;
			this.confidence = Math.min(1, Math.max(0, height));
			return;
		}
		this.reject();
	}

	collectKeyMaxima() {
		let lag = 1;
		let peakCount = 0;
		while (lag <= this.maximumLag + 1 && this.nsdf[lag] > 0) lag += 1;
		while (lag <= this.maximumLag + 1) {
			while (lag <= this.maximumLag + 1 && this.nsdf[lag] <= 0) lag += 1;
			if (lag > this.maximumLag + 1) break;
			let peak = lag;
			while (lag <= this.maximumLag + 1 && this.nsdf[lag] > 0) {
				if (this.nsdf[lag] > this.nsdf[peak]) peak = lag;
				lag += 1;
			}
			if (peak >= this.minimumLag && peak <= this.maximumLag) {
				this.peaks[peakCount] = peak;
				peakCount += 1;
			}
		}
		return peakCount;
	}

	/** @param {number} peak */
	getPeakOffset(peak) {
		const previous = this.nsdf[peak - 1];
		const value = this.nsdf[peak];
		const next = this.nsdf[peak + 1];
		const denominator = previous - 2 * value + next;
		if (!Number.isFinite(denominator) || denominator >= -1e-12) return 0;
		return Math.max(-1, Math.min(1, 0.5 * (previous - next) / denominator));
	}

	/** @param {number} peak */
	getPeakHeight(peak) {
		const previous = this.nsdf[peak - 1];
		const value = this.nsdf[peak];
		const next = this.nsdf[peak + 1];
		const denominator = previous - 2 * value + next;
		if (!Number.isFinite(denominator) || denominator >= -1e-12) return value;
		const difference = previous - next;
		return value - difference * difference / (8 * denominator);
	}

	reject() {
		this.frequency = null;
		this.confidence = 0;
	}
}
