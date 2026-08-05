export const GUITAR_RECORDING_FIXTURES = [
	{ file: 'standard-string-6-e2-in-tune-01.m4a', note: 'E2', stringNumber: 6 },
	{ file: 'standard-string-5-a2-in-tune-01.m4a', note: 'A2', stringNumber: 5 },
	{ file: 'standard-string-4-d3-in-tune-01.m4a', note: 'D3', stringNumber: 4 },
	{ file: 'standard-string-3-g3-in-tune-01.m4a', note: 'G3', stringNumber: 3 },
	{ file: 'standard-string-2-b3-in-tune-01.m4a', note: 'B3', stringNumber: 2 },
	{ file: 'standard-string-1-e4-in-tune-01.m4a', note: 'E4', stringNumber: 1 },
];

export const GUITAR_SEQUENCE_FIXTURE = {
	expectedNotes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
	file: 'standard-sequence-e2-a2-d3-g3-b3-e4-3s-01.m4a',
	maxUnexpectedTransitions: 0,
};
