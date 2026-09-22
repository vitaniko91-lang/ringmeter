# Video script (≤ 3 min) — recorded 2026-09-22

0:00 MacBook flat on the table, screen kit open, ring on the paper square. "Ringmeter measures a ring from one photo over a 20 mm marker. No printer today — the kit is the laptop screen, calibrated with a bank card."
0:20 Phone overhead, ringmeter.vercel.app → Take photo → result: 17.9 ± 0.5 mm, EU 56 · US 7½ · UK P; open the Timings panel — engine init once, then the per-stage ms; cost line $0.
0:50 Retake: tilt the phone ~40° → TILT card with the hint. Shoot without the marker → NO_MARKER.
1:15 Laptop: `testset/RESULTS.md` — 25 photos, 23 measured, verdict 25/25, max error 0.52 mm, mean 0.28 mm.
1:35 The honest part: the hoop reads +0.4 mm on every photo. The scale was checked against the screen's pixel grid and a photo over the gauge circle — the camera sees the top of the rim, 3 mm closer than the marker. Stated in Limits; fix is ring height, listed first in "improve next".
2:10 Repo: `npm test` green (65), `git log` — ground truth committed before the photos.
2:35 "Measured, not promised. Thanks."
