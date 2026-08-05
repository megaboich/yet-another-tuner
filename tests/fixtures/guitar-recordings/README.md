# Guitar Recording Fixtures

Recordings are unchanged Voice Memos `.m4a` files. Use this filename pattern:

`<tuning>-string-<number>-<note>-<case>-<take>.m4a`

Examples:

- `standard-string-6-e2-in-tune-01.m4a`
- `standard-string-6-e2-flat-20c-01.m4a`
- `standard-string-1-e4-sharp-20c-01.m4a`
- `standard-string-5-a2-second-harmonic-01.m4a`
- `standard-string-3-g3-background-noise-01.m4a`

Keep the original audio unprocessed. Add expected metadata to
`../guitar-recordings.js`; do not infer test expectations from filenames.

Each useful edge case should ideally be 3-6 seconds and contain one pluck,
including the attack and natural decay. Record one string at a time.

Sequence fixtures use:

`<tuning>-sequence-<notes>-<duration-per-note>-<take>.m4a`

The current sequence fixture plays `E2 A2 D3 G3 B3 E4` for approximately
three seconds each. Its integration test records every displayed note change
and rejects any extra transition as visible flicker.

The source recording was created in macOS Voice Memos at 48 kHz stereo and is
kept unchanged. Expected timing is inferred only for test observation; the app
receives the decoded recording through the same `MediaStream` and
`AudioWorklet` path used by a microphone.
