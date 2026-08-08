# Repository Guidance

## Project Summary

Awesome Tuner is a static, backend-less guitar tuner deployed to GitHub
Pages. Microphone audio is processed locally with Web Audio and an
`AudioWorklet`; audio must never be uploaded, recorded, or persisted.

The app uses vanilla modern JavaScript, CSS, and native browser APIs. Do not
introduce a UI framework, backend, client-side router, runtime CDN, or
transpilation layer without a demonstrated requirement.

## Commands

Requires Node.js `^20.19.0`, `^22.13.0`, or `>=24`, and pnpm 9.15.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm test
pnpm test:browser
pnpm build
pnpm preview
```

`pnpm check` runs lint/type-check, unit tests, and the production build. It does
not run Playwright; use `pnpm test:browser` for the browser suite.

## Source Conventions

- Keep application, worklet, test, and configuration source in JavaScript.
- Use modern ESM and browser syntax.
- Keep reusable contracts in module-scoped `.d.ts` files.
- Import types into JavaScript with JSDoc `@import`; avoid runtime imports used
  only for types.
- Keep strict `allowJs`, `checkJs`, and `noEmit` TypeScript checking enabled.
- Use ambient declarations only for missing browser/worklet platform types.
- Follow existing tab indentation and ESLint rules.
- Prefer small pure modules for DSP and musical-domain logic.

## Architecture

| Area | Main files |
|---|---|
| App state and orchestration | `src/main.js` |
| App shell and settings UI | `src/app-view.js`, `src/settings-view.js` |
| Microphone lifecycle | `src/tuner-api.js`, `src/tuner-session-controller.js` |
| Worklet adapter | `src/tuner-pitch-processor.js` |
| MPM/NSDF detector | `src/pitch-detector.js` |
| Quality gate and smoothing | `src/pitch-filter.js` |
| Musical math and targets | `src/pitch-math.js`, `src/configs.js` |
| String/harmonic selection | `src/tuning-engine.js` |
| Cross-frame stability | `src/tuning-result-stabilizer.js` |
| Settings and URL state | `src/settings.js` |
| Tuner visualizations | `src/vis-info-panel.js`, `src/vis-headstock.js`, `src/styles.css` |
| Shared contracts | `src/types.d.ts`, `src/tuner-types.d.ts` |

The pitch pipeline order is an invariant:

```text
microphone → AudioWorklet detector → quality/smoothing filter
→ target and harmonic selection → result stabilizer → UI
```

Keep target selection and target-relative cents calculation atomic. The UI
must never independently infer a string from a detector result.

### UI Approach

The feature-complete UI intentionally uses native HTML, CSS, DOM APIs, and
small controller/view modules. Do not add a UI framework, component runtime,
template compiler, or client-side state library without a concrete requirement
that this approach cannot reasonably satisfy.

- `src/main.js` is the composition root and application controller. It owns
  domain state and coordinates settings, sessions, pitch processing, and views;
  it should not contain detailed DOM construction or scattered selectors.
- View factories receive their DOM roots and event callbacks, cache their
  elements, and return narrow imperative interfaces such as `render`, `update`,
  `clear`, and `destroy`. Views must not own musical or audio-domain decisions.
- `src/tuner-session-controller.js` owns active/pending microphone state and
  startup cancellation. Keep `AudioContext` creation on the direct trusted-user
  event path rather than moving it into deferred rendering or effects.
- Keep low-frequency shell and settings updates separate from high-frequency
  tuner updates. Pitch readings and canvas drawing should update only their
  dedicated views, using `requestAnimationFrame` where appropriate.
- Prefer explicit element IDs or root-scoped selectors over selectors coupled
  to incidental markup structure. Preserve native controls, dialog behavior,
  labels, live regions, focus order, and ARIA state.
- Every object that installs observers or externally owned listeners should
  expose idempotent cleanup when it can be unmounted or recreated.
- Add behavior at the smallest existing boundary. Extend a view for DOM-only
  behavior, a controller for lifecycle/orchestration, and a pure module for
  domain rules instead of growing `src/main.js`.

## Audio And DSP Invariants

- Construct and resume audio from a trusted user action.
- Use the actual audio/worklet sample rate; never hard-code 44.1 kHz.
- Keep worklet processing allocation-conscious. Reuse typed buffers and avoid
  growing arrays, full-window copies, or per-sample objects.
- Keep the graph inaudible while ensuring the browser pulls the worklet.
- Treat detector confidence as periodic clarity, not probability.
- Apply quality gating before target selection and rendering.
- Smooth in logarithmic/cents space, not linear hertz space.
- Preserve harmonic matching, target hysteresis, and cross-frame confirmation
  unless tests justify changing them.
- Source constants and tests are authoritative; do not duplicate thresholds in
  contributor documentation.

The detector targets monophonic guitar input in roughly 55–400 Hz and analyzes
the first input channel. Harmonic handling is heuristic frequency matching.
Auto mode chooses the nearest configured target for an accepted pitch.

See `docs/pitch-analysis.md` for the conceptual algorithm explanation.

## Privacy And Lifecycle

- Never add audio upload, recording, telemetry, or third-party runtime requests.
- Persist settings only, never samples or detected audio.
- Device IDs are local-only and must not appear in shareable URL hashes.
- Cleanup must be idempotent: disconnect nodes, stop all media tracks, and
  close the `AudioContext`.
- Stop microphone and reference-tone sessions in the background; do not restart
  without another user action.
- Keep permission, device, worklet, and disconnection errors recoverable.

## Settings And URLs

All stored settings pass through validation in `src/settings.js`.

- Local storage may contain musical preferences, theme, orientation, and input
  device selection.
- The URL hash contains only shareable musical state.
- Keep the app route-free so GitHub Pages refreshes require no fallback server.

## Testing Guidance

Add tests at the lowest useful layer:

- Math, detector, filter, selection, stabilization, and settings: Vitest.
- Worklet wiring, lifecycle, accessibility, layout, or complete audio behavior:
  Playwright against the production build.
- Detector changes: run synthetic 44.1/48 kHz, harmonic/noise, individual real
  recordings, and the full sequence fixture.
- Stability changes: the visible sequence must remain exactly
  `E2 → A2 → D3 → G3 → B3 → E4` with no extra transitions.

Recording conventions live in `tests/fixtures/guitar-recordings/README.md`.
Keep fixtures unprocessed and put expectations in metadata, not filenames only.

Automated audio integration uses Chromium. Safari, Firefox, iOS, Android, and
real-device behavior remain manual validation areas.

## Build And Deployment

- Vite uses a relative base for GitHub Pages project-subpath assets/worklets.
- Production source maps are disabled.
- `dist/` is generated; do not edit or commit it.
- CI runs frozen install, checks, and browser tests.
- Deployment publishes the static `dist/` artifact.
- The service worker precaches the production app shell for offline use; it
  never caches audio or detected pitch data. Navigation is network-first with
  an offline shell fallback, while content-hashed assets are cache-first. Keep
  registration production-only to avoid interfering with Vite development and
  scoped to the configured base path so project-subpath deployments do not
  control sibling applications.

## Documentation Policy

- `readme.md`: product summary, setup, commands, and links.
- `docs/pitch-analysis.md`: beginner concepts and algorithm rationale.
- Fixture README: recording and naming conventions.
- `AGENTS.md`: contributor architecture, invariants, and workflows.
- Put implementation-specific rationale beside the relevant code.
- Do not mirror functions, constants, checklists, or completed plans in docs.
