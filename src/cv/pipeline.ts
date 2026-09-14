import type { CV } from './opencv'
import type { ImageLike, Outcome, Overlay, Pt, Quad, Reject, RejectCode, Timings } from './types'
import { REJECT_HINT } from './types'
import { toGray } from './image'
import { detectMarker } from './marker'
import { markerGates, markerGeometry, blurGate, ellipseGate, edgeGate, GATES } from './gates'
import { rectify, canonToSource, type Rectified } from './rectify'
import { findHoleCandidates, refineHole } from './ring'
import { uncertainty, estimateDistanceMm } from './uncertainty'
import { sizeRange } from '../sizing/sizing'
import { CANON_PX_PER_MM, CANON_SIZE_PX, MARKER_CANON_PX, MARKER_MM, mmToCanon } from '../kit/kit-geometry'

export const DETECT_MAX_SIDE = 1600   // marker detection runs on a downscaled copy; measurement on full resolution
const PRE_BLUR_RATIO = 1.5            // source denser than 1.5 × canonical (15 px/mm) is low-passed before the warp

/**
 * Laplacian variance of the marker crop (bbox + 50 %), normalised to marker size: the crop is resized to 200 px wide,
 * so the score measures blur in mm, not px. Sensor noise on small far-away crops inflates it — calibrate the threshold
 * with a noisy fixture, not only with the synthetic.
 */
export function blurScore(cv: CV, gray: any, quad: Quad): number {
  const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1])
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
  const x0 = Math.max(0, Math.round(Math.min(...xs) - w * 0.25)), y0 = Math.max(0, Math.round(Math.min(...ys) - h * 0.25))
  const x1 = Math.min(gray.cols, Math.round(Math.max(...xs) + w * 0.25)), y1 = Math.min(gray.rows, Math.round(Math.max(...ys) + h * 0.25))
  const roi = gray.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0))
  const small = new cv.Mat(), lap = new cv.Mat(), mean = new cv.Mat(), std = new cv.Mat()
  try {
    cv.resize(roi, small, new cv.Size(200, Math.max(1, Math.round((200 * (y1 - y0)) / (x1 - x0)))), 0, 0, cv.INTER_AREA)
    cv.Laplacian(small, lap, cv.CV_64F)
    cv.meanStdDev(lap, mean, std)
    return std.data64F[0] ** 2
  } finally { roi.delete(); small.delete(); lap.delete(); mean.delete(); std.delete() }
}

/**
 * Gaussian σ (source px) applied before rectification. Warping a source much denser than the 10 px/mm canonical
 * frame with INTER_LINEAR skips pixels (aliasing on the rim); a low-pass at half the decimation ratio prevents it.
 * 0 up to 15 px/mm, 0.5 · pxPerMm / 10 above.
 */
export function preBlurSigma(pxPerMm: number): number {
  const ratio = pxPerMm / CANON_PX_PER_MM
  return ratio > PRE_BLUR_RATIO ? 0.5 * ratio : 0
}

/** Source-px rectangle the warp actually reads: the canonical frame mapped back through the homography, padded, clipped. */
export function canonFootprint(cv: CV, quad: Quad, cols: number, rows: number, padPx: number) {
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, MARKER_CANON_PX.flatMap((p) => [p.x, p.y]))
  const dst = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flat())
  let Hinv: any = null
  try {
    Hinv = cv.getPerspectiveTransform(src, dst) // canonical → source, no inversion needed
    const W = CANON_SIZE_PX.w, H = CANON_SIZE_PX.h
    const pts = canonToSource(cv, Hinv, [[0, 0], [W, 0], [W, H], [0, H]])
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - padPx)), y0 = Math.max(0, Math.floor(Math.min(...ys) - padPx))
    const x1 = Math.min(cols, Math.ceil(Math.max(...xs) + padPx)), y1 = Math.min(rows, Math.ceil(Math.max(...ys) + padPx))
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
  } finally { src.delete(); dst.delete(); Hinv?.delete() }
}

/** OpenCV.js throws raw C++ exception pointers (integers); turn whatever was thrown into a readable message. */
function errorMessage(cv: CV, e: unknown): string {
  if (typeof e !== 'number') return e instanceof Error ? e.message : String(e)
  try { const msg = String(cv.exceptionFromPtr(e).msg ?? '').trim(); return msg || `opencv error ${e}` } catch { return `opencv error ${e}` }
}

export function measure(cv: CV, image: ImageLike): Outcome {
  const timings: Timings = {}
  const t0 = performance.now(); let last = t0
  const lap = (name: string) => { const now = performance.now(); timings[name] = +(now - last).toFixed(1); last = now }
  const total = () => +(performance.now() - t0).toFixed(1)
  const reject = (code: RejectCode, detail: string, overlay: Overlay = {}): Reject => ({ ok: false, code, hint: REJECT_HINT[code], detail, overlay, timings, totalMs: total() })

  let quad: Quad | null = null
  let gray: any = null, R: Rectified | null = null
  try {
    gray = toGray(cv, image)
    lap('decode')

    // 1. marker on a downscaled copy, corners mapped back to full resolution
    const k = Math.min(1, DETECT_MAX_SIDE / Math.max(gray.cols, gray.rows))
    if (k < 1) {
      const small = new cv.Mat()
      try {
        cv.resize(gray, small, new cv.Size(Math.round(gray.cols * k), Math.round(gray.rows * k)), 0, 0, cv.INTER_AREA)
        const q = detectMarker(cv, small)
        quad = q ? (q.map(([x, y]) => [x / k, y / k]) as Quad) : null
      } finally { small.delete() }
    } else quad = detectMarker(cv, gray)
    lap('marker')
    if (!quad) return reject('NO_MARKER', 'ArUco 4x4 id 0 not detected')

    // 2. gates
    const geo = markerGeometry(quad)
    const g1 = markerGates(quad)
    const blur = g1 ? 0 : blurScore(cv, gray, quad)
    lap('gates')
    if (g1) return reject(g1, `marker side ${geo.sidePx.toFixed(0)} px (${geo.pxPerMm.toFixed(1)} px/mm), side ratio ${geo.ratio.toFixed(3)}, corner deviation ${geo.maxAngleDev.toFixed(1)}°`, { markerQuad: quad })
    const g2 = blurGate(blur)
    if (g2) return reject(g2, `blur score ${blur.toFixed(0)} < ${GATES.BLUR_MIN_SCORE}`, { markerQuad: quad })

    // 3. rectify to 10 px/mm. A source much denser than the canonical frame is low-passed first so the warp does not
    //    alias the rim — only inside the footprint the warp reads (4–5× cheaper than the full frame on a 12 MP photo).
    const sigma = preBlurSigma(geo.pxPerMm)
    if (sigma > 0) {
      const fp = canonFootprint(cv, quad, gray.cols, gray.rows, Math.ceil(3 * sigma) + 1)
      if (fp.w > 0 && fp.h > 0) {
        const roi = gray.roi(new cv.Rect(fp.x, fp.y, fp.w, fp.h))
        try { cv.GaussianBlur(roi, roi, new cv.Size(0, 0), sigma) } finally { roi.delete() }
      }
    }
    R = rectify(cv, gray, quad)
    lap('rectify')

    // 4. ring
    const cands = findHoleCandidates(cv, R.canon)
    if (cands.length === 0) { lap('ring'); return reject('NO_RING', 'no circular hole found inside the zone', { markerQuad: quad }) }
    if (cands.length > 1) { lap('ring'); return reject('MULTIPLE_RINGS', `${cands.length} ring-like holes in the zone`, { markerQuad: quad }) }
    const hole = refineHole(cv, R.canon, cands[0])
    lap('ring')
    const innerBoundary = canonToSource(cv, R.Hinv, hole.points)
    const g3 = edgeGate(hole.residualPx, hole.inliers)
    if (g3) return reject(g3, `edge residual ${hole.residualPx.toFixed(2)} px, ${hole.inliers}/64 inliers`, { markerQuad: quad, innerBoundary })
    const tiltDeg = (Math.acos(Math.min(1, hole.axesRatio)) * 180) / Math.PI
    const g4 = ellipseGate(hole.axesRatio)
    if (g4) return reject(g4, `hole axes ratio ${hole.axesRatio.toFixed(3)} (tilt ≈ ${tiltDeg.toFixed(0)}°)`, { markerQuad: quad, innerBoundary })

    // 5. numbers
    const diameterMm = (2 * hole.r) / CANON_PX_PER_MM
    const estDistanceMm = estimateDistanceMm(Math.max(gray.cols, gray.rows), geo.sidePx)
    const u = uncertainty({ diameterMm, pxPerMm: geo.pxPerMm, markerSidePx: geo.sidePx, distanceMm: estDistanceMm, tiltDeg })
    const b0 = mmToCanon({ x: 0, y: MARKER_MM + 3 }), b1 = mmToCanon({ x: 10, y: MARKER_MM + 3 })
    const scaleBar = canonToSource(cv, R.Hinv, [[b0.x, b0.y], [b1.x, b1.y]]) as [Pt, Pt]
    lap('result')
    return {
      ok: true, diameterMm, sigmaMm: u.total, sigmaParts: { px: u.px, marker: u.marker, parallax: u.parallax },
      axesRatio: hole.axesRatio, tiltDeg, pxPerMm: geo.pxPerMm, markerSidePx: geo.sidePx, estDistanceMm, blurScore: blur,
      edgeResidualPx: hole.residualPx, edgeInliers: hole.inliers,
      sizes: sizeRange(diameterMm, u.total), overlay: { markerQuad: quad, innerBoundary, scaleBar }, timings, totalMs: total(),
    }
  } catch (e) {
    return reject('INTERNAL_ERROR', `internal error: ${errorMessage(cv, e)}`, quad ? { markerQuad: quad } : {})
  } finally { R?.delete(); gray?.delete() }
}
