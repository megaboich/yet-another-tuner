export const GUITAR_RECORDING_FIXTURES = [
	{ file: 'original-guitar/standard-string-6-e2-in-tune-01.m4a', guitar: 'original guitar', note: 'E2', stringNumber: 6 },
	{ file: 'original-guitar/standard-string-5-a2-in-tune-01.m4a', guitar: 'original guitar', note: 'A2', stringNumber: 5 },
	{ file: 'original-guitar/standard-string-4-d3-in-tune-01.m4a', guitar: 'original guitar', note: 'D3', stringNumber: 4 },
	{ file: 'original-guitar/standard-string-3-g3-in-tune-01.m4a', guitar: 'original guitar', note: 'G3', stringNumber: 3 },
	{ file: 'original-guitar/standard-string-2-b3-in-tune-01.m4a', guitar: 'original guitar', note: 'B3', stringNumber: 2 },
	{ file: 'original-guitar/standard-string-1-e4-in-tune-01.m4a', guitar: 'original guitar', note: 'E4', stringNumber: 1 },
	{ file: 'harley-benton-les-paul/standard-string-6-e2-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'E2', stringNumber: 6 },
	{ file: 'harley-benton-les-paul/standard-string-5-a2-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'A2', stringNumber: 5 },
	{ file: 'harley-benton-les-paul/standard-string-4-d3-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'D3', stringNumber: 4 },
	{ file: 'harley-benton-les-paul/standard-string-3-g3-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'G3', stringNumber: 3 },
	{ file: 'harley-benton-les-paul/standard-string-2-b3-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'B3', stringNumber: 2 },
	{ file: 'harley-benton-les-paul/standard-string-1-e4-in-tune-01.m4a', guitar: 'Harley Benton Les Paul', note: 'E4', stringNumber: 1 },
];

export const GUITAR_SEQUENCE_FIXTURES = [
	{
		expectedNotes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
		file: 'original-guitar/standard-sequence-e2-a2-d3-g3-b3-e4-3s-01.m4a',
		guitar: 'original guitar',
	},
	{
		expectedNotes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
		file: 'harley-benton-les-paul/standard-sequence-e2-a2-d3-g3-b3-e4-3s-01.m4a',
		guitar: 'Harley Benton Les Paul',
	},
];
