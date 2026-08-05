import { describe, expect, it } from 'vitest';

import { createPitchFilter } from '../src/pitch-filter.js';

describe('pitch filter', () => {
	it('rejects silence, uncertain estimates, and out-of-range pitches', () => {
		const filter = createPitchFilter({ minConfidence: 0.6 });

		expect(filter.process({ frequency: 110, rms: 0.000_5, confidence: 1 })).toBeNull();
		expect(filter.process({ frequency: 110, rms: 0.1, confidence: 0.2 })).toBeNull();
		expect(filter.process({ frequency: 20, rms: 0.1, confidence: 1 })).toBeNull();
		expect(filter.process({ frequency: 2_000, rms: 0.1, confidence: 1 })).toBeNull();
		expect(filter.process({ frequency: null, rms: 0.1, confidence: 1 })).toBeNull();
	});

	it('rejects low-confidence detector output', () => {
		const filter = createPitchFilter();
		const result = filter.process({ frequency: 110, rms: 0.01, confidence: 0 });

		expect(result).toBeNull();
	});

	it('passes a valid first estimate with its quality metadata', () => {
		const filter = createPitchFilter();
		const result = filter.process({ frequency: 110, rms: 0.1, confidence: 0.9 });

		expect(result).toEqual({ frequency: 110, rms: 0.1, confidence: 0.9 });
	});

	it('suppresses a single frequency outlier with a median window', () => {
		const filter = createPitchFilter({ slowAlpha: 1 });
		filter.process({ frequency: 110, rms: 0.1, confidence: 1 });
		filter.process({ frequency: 110.2, rms: 0.1, confidence: 1 });
		const result = filter.process({ frequency: 220, rms: 0.1, confidence: 1 });

		expect(result?.frequency).toBeCloseTo(110.2, 5);
	});

	it('resets accumulated smoothing state', () => {
		const filter = createPitchFilter();
		filter.process({ frequency: 110, rms: 0.1, confidence: 1 });
		filter.reset();
		const result = filter.process({ frequency: 220, rms: 0.1, confidence: 1 });

		expect(result?.frequency).toBe(220);
	});
});
