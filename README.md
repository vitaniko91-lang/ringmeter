# Ringmeter — ring size from one photo

Phone-friendly web page that estimates a ring's inner diameter from a photo taken over a printed calibration sheet (20 mm ArUco marker). Everything runs on-device in a Web Worker (OpenCV.js WASM); nothing is uploaded.

Live demo: https://ringmeter.vercel.app   ·   Ring Kit: `/ring-kit.pdf` (print at 100 %, check the scale with the coin circle)

## Run
    npm i
    npm run dev        # http://localhost:5173
    npm run build && npm run preview

## Test
    npm test           # Vitest (Node): sizing vs published anchors, gates, σ model, marker, ring, pipeline on synthetic images (≤ 0.1 mm), state, report builder
    npm run kit        # regenerate public/ring-kit.pdf, then render it at 300 dpi and assert: marker side 236 px at the stated position,
                       # nothing inked inside the ring zone, measure(render) = NO_RING, coin circle Ø 27.2 ± 0.1 mm
    npm run evaluate   # after `npm run build`: Playwright drives the built app (?eval=1) over testset/photos → testset/RESULTS.md
                       # env: TESTSET_DIR, GROUND_TRUTH, RESULTS_OUT override the photo dir / ground-truth json / output path

## How it works
1. The 15 MB engine (OpenCV.js, ~4 MB compressed) loads once per session in the worker — ~1.8 s measured on a laptop — before the first photo.
2. ArUco 4×4 (id 0) marker detected on a ≤ 1600 px copy; corners mapped back to full resolution.
3. Gates: marker size (≥ 8 px/mm), skew (side ratio, corner angles), sharpness (Laplacian variance on the marker crop, normalised to marker size).
4. Homography to a 10 px/mm plane (pre-blur when the source is denser than 15 px/mm); the ring zone is a fixed rectangle relative to the marker.
5. White circular hole inside the zone: adaptive threshold → 7×7 opening → contours → circularity, size, darker band around.
6. 64 radial sub-pixel edge points → RANSAC-lite consensus (minimal 3-ray subsets) → Kåsa least-squares circle with two MAD passes → ellipse ratio for tilt.
7. σ = edge ⊕ marker-corner ⊕ ring-height parallax (2 mm band, ≥ 5° tilt assumed), in quadrature; sizes per ISO 8653 / US / UK (`docs/sizing-table.md`).

Reject codes, each with a retake hint on the page: `BAD_FILE`, `NO_MARKER`, `TOO_FAR`, `TILT`, `BLUR`, `NO_RING`, `MULTIPLE_RINGS`, `ELLIPTIC`, `EDGE_UNCLEAR` (rim residual > 0.6 px or < 48 of 64 rays agree), `INTERNAL_ERROR` (worker failure or watchdog).

## Notes
- Fonts (IBM Plex Sans / Mono) are self-hosted via `@fontsource`; no third-party requests at runtime.
- `?eval=1` (or dev mode) exposes `window.__ringmeter = { seq, ready, engineInitMs, last }` for the evaluator; a plain production page has no hook.
- The per-photo watchdog (30 s) starts once the engine is ready; a photo tapped during engine init waits up to 180 s for it.

## Layout
`src/cv` pipeline · `src/kit` sheet geometry · `src/sizing` table · `src/app` UI · `src/eval` report builder · `scripts` kit / evaluate · `testset` photos, ground truth, results · `DELIVERY-NOTES.md`.
