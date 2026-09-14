import { MARKER_MM } from '../kit/kit-geometry'

/** Stated assumptions — printed in the UI limits section and in DELIVERY-NOTES. */
export const ASSUMED = {
  ringHeightMm: 2.0,   // typical band height 1.5–2.5 mm; the visible inner rim sits this far above the sheet
  minTiltDeg: 5,       // tilt below this is not resolvable from the hole ellipse — assumed present
  focalFraction: 0.7,  // f_px ≈ 0.7 × the image's long side for phone main cameras (24–28 mm equivalent)
  edgePx: 1.0,         // residual edge-localisation error after sub-pixel refinement, in source px
  cornerPx: 0.5,       // ArUco corner error per side, in source px
} as const

/** Set from the observed test-set error in Task 14 — must be ≥ max observed |err|. Displayed in the Limits section. */
export const TYPICAL_SIGMA_MM = 0.3

/** Camera-to-sheet distance from the marker's apparent size: f_px ≈ focalFraction × long side, D = f_px · 20 mm / side. */
export function estimateDistanceMm(longSidePx: number, markerSidePx: number) {
  return (ASSUMED.focalFraction * longSidePx * MARKER_MM) / markerSidePx
}

/** Precondition: marker gates passed (markerSidePx, pxPerMm, distanceMm > 0). */
export function uncertainty(a: { diameterMm: number; pxPerMm: number; markerSidePx: number; distanceMm: number; tiltDeg: number }) {
  const px = ASSUMED.edgePx / a.pxPerMm
  const marker = (a.diameterMm * ASSUMED.cornerPx) / a.markerSidePx
  const tilt = (Math.max(a.tiltDeg, ASSUMED.minTiltDeg) * Math.PI) / 180
  const parallax = (a.diameterMm * ASSUMED.ringHeightMm) / a.distanceMm + ASSUMED.ringHeightMm * Math.tan(tilt)
  return { px, marker, parallax, total: Math.hypot(px, marker, parallax) }
}
