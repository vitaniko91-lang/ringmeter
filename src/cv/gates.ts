import type { Quad, RejectCode } from './types'
import { MARKER_MM } from '../kit/kit-geometry'

export const GATES = {
  MIN_PX_PER_MM: 8,        // marker side ≥ 160 px in the full-resolution photo
  MIN_SIDE_RATIO: 0.95,    // marker min/max side — coarse tilt check (~18°). Hand-held overhead shots land at 0.958–0.97 (2026-09-22); the residual tilt feeds σ instead of rejecting
  MAX_ANGLE_DEV_DEG: 5,    // marker corner angles vs 90°
  BLUR_MIN_SCORE: 60,      // Laplacian variance on the marker crop normalised to 200 px — sharp screen-kit photos score 690–860 (2026-09-22)
  MIN_AXES_RATIO: 0.94,    // hole ellipse minor/major — a hammered band reads 0.95–0.99 while lying flat (2026-09-22); tilt itself is caught by the marker gates above
  EDGE_MAX_RESIDUAL_PX: 2.5, // RMS radial residual of the inlier rays, canonical px — 0.4–0.6 on a smooth band, 1.1–2.2 on a hammered one (2026-09-22); the residual also feeds σ
  EDGE_MIN_INLIERS: 44,    // rays (of 64) that must agree on the inner rim — an open hoop with a hinge keeps 46–48 (2026-09-22)
} as const

export function sideLengths(q: Quad): number[] {
  return q.map((p, i) => { const n = q[(i + 1) % 4]; return Math.hypot(n[0] - p[0], n[1] - p[1]) })
}

export function cornerAngles(q: Quad): number[] {
  return q.map((p, i) => {
    const a = q[(i + 3) % 4], b = q[(i + 1) % 4]
    const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]]
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]))
    return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI
  })
}

export function markerGeometry(q: Quad) {
  const s = sideLengths(q)
  const sideMin = Math.min(...s), sideMax = Math.max(...s)
  const ratio = sideMin / sideMax
  const maxAngleDev = Math.max(...cornerAngles(q).map((a) => Math.abs(a - 90)))
  const sidePx = s.reduce((a, b) => a + b, 0) / 4
  return { sidePx, ratio, maxAngleDev, pxPerMm: sidePx / MARKER_MM, tiltDeg: (Math.acos(ratio) * 180) / Math.PI }
}

export function markerGates(q: Quad): RejectCode | null {
  const g = markerGeometry(q)
  if (g.pxPerMm < GATES.MIN_PX_PER_MM) return 'TOO_FAR'
  if (g.ratio < GATES.MIN_SIDE_RATIO || g.maxAngleDev > GATES.MAX_ANGLE_DEV_DEG) return 'TILT'
  return null
}
export const blurGate = (score: number): RejectCode | null => (score < GATES.BLUR_MIN_SCORE ? 'BLUR' : null)
export const ellipseGate = (axesRatio: number): RejectCode | null => (axesRatio < GATES.MIN_AXES_RATIO ? 'ELLIPTIC' : null)
export const edgeGate = (residualPx: number, inliers: number): RejectCode | null =>
  (residualPx > GATES.EDGE_MAX_RESIDUAL_PX || inliers < GATES.EDGE_MIN_INLIERS ? 'EDGE_UNCLEAR' : null)
