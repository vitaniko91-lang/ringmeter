import { ASSUMED } from '../../cv/uncertainty'
import { GATES } from '../../cv/gates'
import { SIZING_SOURCE } from '../../sizing/sizing'
import { RING_DIAMETER_MM } from '../../kit/kit-geometry'

export function Limits() {
  return (
    <section aria-labelledby="limits-h" className="mt-12 border-t border-line pt-8 text-sm">
      <h2 id="limits-h" className="text-xl font-semibold">How it works, and its limits</h2>
      <h3 className="mt-4 font-semibold">Supported conditions</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
        <li>One ring, {RING_DIAMETER_MM.min}–{RING_DIAMETER_MM.max} mm inner diameter, lying flat inside the zone of the printed kit.</li>
        <li>Near-overhead photo: rejected when the hole looks more than ≈10° oval (axes ratio &lt; {GATES.MIN_AXES_RATIO}) or the marker is visibly skewed.</li>
        <li>Marker at least {GATES.MIN_PX_PER_MM} px per mm in the photo (≈15–25 cm on a phone); sharp enough that the marker crop scores ≥ {GATES.BLUR_MIN_SCORE}.</li>
        <li>Unsupported: several rings, rings with stones covering the inner rim, non-flat or transparent rings, unprinted or scaled markers.</li>
      </ul>
      <h3 className="mt-4 font-semibold">Uncertainty</h3>
      <p className="mt-1 text-muted">
        The ± combines three measured or assumed terms: edge localisation ({ASSUMED.edgePx} px), marker-corner error ({ASSUMED.cornerPx} px per side) and parallax from the ring's height —
        the visible inner rim sits ≈{ASSUMED.ringHeightMm} mm above the sheet, so it projects slightly larger, and any residual tilt below {ASSUMED.minTiltDeg}° cannot be detected and is assumed present.
        Typical result: ±0.3 mm, i.e. about one EU size. The test set in the repository reports the observed error per photo; we never claim better than what was measured.
      </p>
      <h3 className="mt-4 font-semibold">Sizing table</h3>
      <p className="mt-1 text-muted">{SIZING_SOURCE.name} (<a className="underline" href={SIZING_SOURCE.url}>source</a>). {SIZING_SOURCE.formulas.eu}; {SIZING_SOURCE.formulas.us}; {SIZING_SOURCE.formulas.uk}. {SIZING_SOURCE.rounding}</p>
      <h3 className="mt-4 font-semibold">Method</h3>
      <p className="mt-1 text-muted">ArUco marker detection → perspective rectification to 10 px/mm → circular white hole inside the zone → 64 sub-pixel edge points → least-squares circle. Everything runs in a Web Worker with OpenCV.js; nothing is uploaded.</p>
    </section>
  )
}
