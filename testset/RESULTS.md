# Test-set results

Ground truth recorded 2026-09-22 09:40–10:20 WITA (gauge readings); photos 2026-09-21 21:10–22:05, 2026-09-22 10:25 and 2026-09-22 19:10 WITA. Status: RE-RECORDED 2026-09-22 — supersedes the 2026-09-18 file (rings A/B/S measured on a spare iPhone kit that was no longer available on the day of the photo run). Truth values below come from the on-screen gauge, not from the app. Full disclosure: the raw photos were run through the evaluator in triage mode on 2026-09-21/22 while the pipeline gates were being calibrated (see DELIVERY-NOTES → What changed after the first photos); the gauge readings were taken before that and were not adjusted afterwards.
Kit: screen-kit.html on the MacBook Air laid flat (5.03 CSS px/mm); the ring lies on a square of white paper placed on the glass inside the zone for the *-paper-* photos and directly on the glass for the *-glass-* photos. Photos with an iPhone main camera, hand-held, roughly overhead, 11–21 cm from the sheet (distance estimated from the marker's size). No printer was available.
Scale check: screen-kit.html on a MacBook Air (13.3", 2560×1600 panel, 1440×900 CSS): an ID-1 bank card's long edge (85.60 mm) matched the calibration line at 5.03 CSS px/mm; the panel's nominal pitch gives 2560 / 286.5 mm / 1.778 = 5.03 as well. Independent check on the photos: the display's pixel grid (0.1119 mm pitch) resolved by FFT on H-paper-05 gives 24.6–24.9 photo px/mm against 24.67 from the marker.
Chromium via Playwright on this machine; engine init on this machine: 1913 ms (once per session, before the first photo) (localhost; the one-time ~4 MB download is not included).
Columns: *time ms* = CV pipeline inside the worker; *wall ms* = tap → result on the page, including file decode and worker messaging.

| file | object | truth mm | measured mm | abs err mm | ± mm | sizes | verdict | expected | verdict ok | within tol | time ms | wall ms | blur | detail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H-glass-01.jpg | H | 17.50 | 17.93 | 0.43 | 0.51 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 307 | 580 | 802 | rim fit 17.97 mm, 46/64 rays, residual 0.51 px, axes 0.995; marker 288 px (14.4 px/mm, ≈194 mm) |
| H-glass-02.jpg | H | 17.50 | 17.95 | 0.45 | 0.57 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 175 | 438 | 852 | rim fit 18.01 mm, 46/64 rays, residual 0.57 px, axes 0.992; marker 280 px (14.0 px/mm, ≈200 mm) |
| H-glass-03.jpg | H | 17.50 | 17.94 | 0.44 | 0.56 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 144 | 497 | 814 | rim fit 17.98 mm, 47/64 rays, residual 0.65 px, axes 0.992; marker 270 px (13.5 px/mm, ≈208 mm) |
| H-glass-04.jpg | H | 17.50 | 17.90 | 0.40 | 0.58 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 173 | 445 | 687 | rim fit 18.00 mm, 47/64 rays, residual 0.64 px, axes 0.990; marker 374 px (18.7 px/mm, ≈150 mm) |
| H-glass-05.jpg | H | 17.50 | 17.82 | 0.32 | 0.36 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 143 | 418 | 864 | rim fit 17.89 mm, 47/64 rays, residual 0.55 px, axes 0.996; marker 264 px (13.2 px/mm, ≈212 mm) |
| H-glass-06.jpg | H | 17.50 | 17.86 | 0.36 | 0.46 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 156 | 419 | 838 | rim fit 17.91 mm, 46/64 rays, residual 0.43 px, axes 0.992; marker 295 px (14.8 px/mm, ≈190 mm) |
| H-glass-07.jpg | H | 17.50 | 17.97 | 0.47 | 0.41 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 172 | 440 | 838 | rim fit 18.01 mm, 44/64 rays, residual 0.37 px, axes 0.997; marker 318 px (15.9 px/mm, ≈176 mm) |
| H-paper-01.jpg | H | 17.50 | 18.02 | 0.52 | 0.56 | EU 56.5 · US 8 · UK P½ | MEASURE | MEASURE | ✓ | ✗ | 160 | 422 | 849 | rim fit 18.10 mm, 48/64 rays, residual 0.65 px, axes 0.991; marker 272 px (13.6 px/mm, ≈206 mm) |
| H-paper-02.jpg | H | 17.50 | 17.82 | 0.32 | 0.59 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 156 | 429 | 910 | rim fit 17.91 mm, 46/64 rays, residual 0.52 px, axes 0.989; marker 270 px (13.5 px/mm, ≈207 mm) |
| H-paper-03.jpg | H | 17.50 | 17.81 | 0.31 | 0.69 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 177 | 439 | 749 | rim fit 17.85 mm, 46/64 rays, residual 0.45 px, axes 0.992; marker 355 px (17.8 px/mm, ≈158 mm) |
| H-paper-04.jpg | H | 17.50 | 17.90 | 0.40 | 0.65 | EU 56 · US 7.5 · UK P | MEASURE | MEASURE | ✓ | ✓ | 175 | 440 | 770 | rim fit 18.00 mm, 49/64 rays, residual 0.72 px, axes 0.991; marker 356 px (17.8 px/mm, ≈157 mm) |
| H-paper-05.jpg | H | 17.50 | 17.96 | 0.46 | 0.76 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 257 | 550 | 674 | rim fit 18.02 mm, 46/64 rays, residual 0.48 px, axes 0.994; marker 489 px (24.5 px/mm, ≈114 mm) |
| H-paper-06.jpg | H | 17.50 | 17.98 | 0.48 | 0.78 | EU 56.5 · US 8 · UK P | MEASURE | MEASURE | ✓ | ✓ | 234 | 525 | 735 | rim fit 18.06 mm, 45/64 rays, residual 0.43 px, axes 0.993; marker 484 px (24.2 px/mm, ≈116 mm) |
| H-paper-07.jpg | H | 17.50 | 18.01 | 0.51 | 0.56 | EU 56.5 · US 8 · UK P½ | MEASURE | MEASURE | ✓ | ✗ | 192 | 460 | 720 | rim fit 18.09 mm, 47/64 rays, residual 0.63 px, axes 0.990; marker 412 px (20.6 px/mm, ≈136 mm) |
| B-glass-01.jpg | B | 16.80 | 16.69 | 0.11 | 0.74 | EU 52.5 · US 6 · UK M | MEASURE | MEASURE | ✓ | ✓ | 178 | 468 | 831 | rim fit 16.89 mm, 58/64 rays, residual 1.43 px, axes 0.970; marker 360 px (18.0 px/mm, ≈156 mm) |
| B-glass-02.jpg | B | 16.80 | 16.46 | 0.34 | 0.80 | EU 51.5 · US 6 · UK L½ | MEASURE | MEASURE | ✓ | ✓ | 181 | 437 | 760 | rim fit 16.91 mm, 59/64 rays, residual 1.64 px, axes 0.968; marker 395 px (19.8 px/mm, ≈142 mm) |
| B-glass-03.jpg | B | 16.80 | 16.75 | 0.05 | 0.76 | EU 52.5 · US 6.5 · UK M | MEASURE | MEASURE | ✓ | ✓ | 162 | 425 | 734 | rim fit 17.09 mm, 58/64 rays, residual 1.53 px, axes 0.968; marker 333 px (16.6 px/mm, ≈168 mm) |
| B-glass-04.jpg | B | 16.80 | 16.70 | 0.10 | 0.75 | EU 52.5 · US 6.5 · UK M | MEASURE | MEASURE | ✓ | ✓ | 174 | 437 | 824 | rim fit 17.02 mm, 56/64 rays, residual 1.45 px, axes 0.970; marker 356 px (17.8 px/mm, ≈157 mm) |
| B-glass-05.jpg | B | 16.80 | 16.73 | 0.07 | 0.72 | EU 52.5 · US 6.5 · UK M | MEASURE | MEASURE | ✓ | ✓ | 164 | 424 | 842 | rim fit 17.01 mm, 57/64 rays, residual 1.35 px, axes 0.973; marker 369 px (18.5 px/mm, ≈152 mm) |
| B-paper-01.jpg | B | 16.80 | 16.73 | 0.07 | 0.67 | EU 52.5 · US 6.5 · UK M | MEASURE | MEASURE | ✓ | ✓ | 160 | 423 | 979 | rim fit 17.01 mm, 64/64 rays, residual 1.41 px, axes 0.974; marker 269 px (13.5 px/mm, ≈208 mm) |
| B-paper-02.jpg | B | 16.80 | 16.64 | 0.16 | 0.69 | EU 52.5 · US 6 · UK M | MEASURE | MEASURE | ✓ | ✓ | 181 | 458 | 792 | rim fit 16.92 mm, 64/64 rays, residual 1.27 px, axes 0.976; marker 317 px (15.9 px/mm, ≈177 mm) |
| B-paper-03.jpg | B | 16.80 | 16.83 | 0.03 | 0.74 | EU 53 · US 6.5 · UK M½ | MEASURE | MEASURE | ✓ | ✓ | 179 | 444 | 771 | rim fit 17.08 mm, 62/64 rays, residual 1.31 px, axes 0.975; marker 345 px (17.2 px/mm, ≈162 mm) |
| B-paper-04.jpg | B | 16.80 | 16.90 | 0.10 | 0.93 | EU 53 · US 6.5 · UK M½ | MEASURE | MEASURE | ✓ | ✓ | 282 | 569 | 527 | rim fit 17.22 mm, 63/64 rays, residual 1.58 px, axes 0.969; marker 505 px (25.2 px/mm, ≈111 mm) |
| B-paper-05.jpg | B | 16.80 | 16.81 | 0.01 | 0.78 | EU 53 · US 6.5 · UK M½ | MEASURE | MEASURE | ✓ | ✓ | 188 | 469 | 756 | rim fit 17.06 mm, 64/64 rays, residual 1.25 px, axes 0.975; marker 378 px (18.9 px/mm, ≈148 mm) |
| U-no-marker.jpg | B | 16.80 | — | — | — | — | NO_MARKER | NO_MARKER | ✓ | — | 74 | 340 | — | ArUco 4x4 id 0 not detected |
| U-blur-heavy.jpg | B | 16.80 | — | — | — | — | NO_MARKER | NO_MARKER | ✓ | — | 70 | 347 | — | ArUco 4x4 id 0 not detected |
| U-tilt40.jpg | H | 17.50 | — | — | — | — | TILT | TILT | ✓ | — | 77 | 360 | — | marker side 551 px (27.5 px/mm), side ratio 0.781, corner deviation 24.6° |
| U-blur.jpg | H | 17.50 | — | — | — | — | BLUR | BLUR | ✓ | — | 72 | 398 | 29 | blur score 29 < 60 |
| U-two-rings.jpg | — | — | — | — | — | — | MULTIPLE_RINGS | MULTIPLE_RINGS | ✓ | — | 181 | 465 | 615 | 2 ring-like holes in the zone |

## Summary

- Photos: 29 · measured (with ground truth): 24 · verdict matches expectation: 29/29
- Absolute diameter error on measured photos: max **0.52 mm**, mean 0.29 mm
- Within tolerance (± 0.5 mm): **22/24**
- Mean processing time (measured photos): 186 ms pipeline (max 307) · 461 ms wall (max 580) tap-to-result (Chromium via Playwright, this machine — phone timings in DELIVERY-NOTES)
- Rejects: mean 95 ms (early exits)
- Cost per image: **$0.00** variable — on-device; hosting separate (static, Vercel Hobby $0 / Pro $20 per month)
