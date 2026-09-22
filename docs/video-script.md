# Video walkthrough — silent, captioned (target 2:05, limit 3:00)

No voice-over. Every claim is a caption on screen. Numbers below are the real ones from
`testset/RESULTS.md` (2026-09-22) — do not round them differently in the edit.

## Footage to capture (three recordings, assembled in iMovie)

**A — phone screen recording** (iPhone Control Centre → Screen Recording), ~50 s:
open `ringmeter.vercel.app`, Take photo of the ring on the kit, let the result appear,
open the Timings panel, scroll to the cost line. Then two retakes: one shot tilted ≈ 40°,
one with the marker outside the frame. AirDrop the .mov to the Mac.

**B — phone filmed from outside** (the Mac's camera or held steady), ~10 s:
the MacBook lying flat with `screen-kit.html` open, the ring on the paper square,
the phone coming down overhead. This is the only shot that shows the physical setup.

**C — Mac screen recording** (⌘⇧5), ~35 s: `testset/RESULTS.md` scrolled slowly through the
table to the Summary block; then a terminal with `npm test` finishing green; then `git log --oneline`.

## Caption track

| in | caption (one or two lines, max ~7 words per line) | over |
|---|---|---|
| 0:00 | Ringmeter — ring size from one photo | B |
| 0:04 | No printer today. The kit is the laptop screen. | B |
| 0:09 | Calibrated once against a bank card: 5.03 px/mm | B |
| 0:14 | One ring, flat, beside the 20 mm marker | B |
| 0:19 | Open the page, tap Take photo | A |
| 0:26 | Everything runs on the phone. Nothing is uploaded. | A |
| 0:31 | Inner diameter 17.9 mm ± 0.5 | A (result) |
| 0:36 | EU 56 · US 7½ · UK P — table and rounding cited | A |
| 0:41 | The detected inner boundary, drawn on the photo | A (overlay) |
| 0:46 | Engine loads once, then ≈ 0.2 s per photo | A (Timings) |
| 0:51 | Cost per image: $0.00 — no API, no upload | A (cost line) |
| 0:56 | Tilted 40° → TILT, with a retake hint | A (reject) |
| 1:02 | Marker out of frame → NO_MARKER | A (reject) |
| 1:08 | It refuses instead of inventing precision | A |
| 1:13 | 25 photos, 23 measured, two unsupported | C (RESULTS) |
| 1:19 | Max error 0.52 mm · mean 0.28 mm | C |
| 1:24 | Verdict matches expectation: 25 of 25 | C (Summary) |
| 1:29 | The honest part: the thick ring reads +0.4 mm | C |
| 1:35 | The camera sees the top of the rim, not the sheet | C |
| 1:41 | Checked three ways — geometry, not a bug | C |
| 1:46 | Stated in Limits. Fixing it is first on my list. | C |
| 1:52 | npm test — 65 passing | C (terminal) |
| 1:57 | Ground truth committed before the photos | C (git log) |
| 2:03 | Measured, not promised. | black |

## Edit notes

- No music. Silence is deliberate and reads as focus, not as a missing track.
- Captions: plain lower third, white on a dark bar, 4–6 s each, never two on screen at once.
- Keep the phone recording at its native aspect; do not crop the result screen — the ± and the
  size chips must stay legible.
- If a shot runs short, hold the last frame rather than speeding the footage up.
