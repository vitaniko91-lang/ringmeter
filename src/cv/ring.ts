import type { CV } from './opencv'
import type { Pt } from './types'
import { CANON_PX_PER_MM, RING_DIAMETER_MM, ZONE_CANON_PX } from '../kit/kit-geometry'
import { sampleBilinear } from './image'

export type HoleCandidate = { cx: number; cy: number; r: number; axesRatio: number } // canonical px

const CIRCULARITY_MIN = 0.7  // a highlight bridging the rim survives the 7×7 opening only as a small bump
const RING_CONTRAST_MIN = 40 // paper inside the hole must be this much brighter than the band 0.6 mm outside
const INTERIOR_RADII = [0.3, 0.5, 0.7, 0.85] // fractions of r probed inside the hole; the darkest one must still be paper

function meanOnCircle(gray: any, cx: number, cy: number, r: number, n = 32) {
  let s = 0
  for (let k = 0; k < n; k++) { const t = (2 * Math.PI * k) / n; s += sampleBilinear(gray, cx + r * Math.cos(t), cy + r * Math.sin(t)) }
  return s / n
}

/** White blobs fully inside the zone, circular, ring-sized, and surrounded by a darker band. */
export function findHoleCandidates(cv: CV, canon: any): HoleCandidate[] {
  const Z = ZONE_CANON_PX
  const roi = canon.roi(new cv.Rect(Z.x, Z.y, Z.w, Z.h))
  const blur = new cv.Mat(), bin = new cv.Mat(), contours = new cv.MatVector(), hier = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7))
  const out: HoleCandidate[] = []
  try {
    cv.GaussianBlur(roi, blur, new cv.Size(3, 3), 0)
    cv.adaptiveThreshold(blur, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 8)
    cv.morphologyEx(bin, bin, cv.MORPH_OPEN, kernel) // detach specular highlights that touch the rim
    cv.findContours(bin, contours, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE)
    const dMin = RING_DIAMETER_MM.min * CANON_PX_PER_MM, dMax = RING_DIAMETER_MM.max * CANON_PX_PER_MM
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      try {
        const parent = hier.data32S[i * 4 + 3]
        if (parent !== -1 || cnt.rows < 5) continue                     // outer contour of its own white component
        const br = cv.boundingRect(cnt)
        if (br.x <= 0 || br.y <= 0 || br.x + br.width >= roi.cols - 1 || br.y + br.height >= roi.rows - 1) continue // touches border → paper
        const A = cv.contourArea(cnt), P = cv.arcLength(cnt, true)
        const circ = (4 * Math.PI * A) / (P * P)
        const el = cv.fitEllipse(cnt)
        const d = (el.size.width + el.size.height) / 2
        if (circ < CIRCULARITY_MIN || d < dMin || d > dMax) continue
        const cx = el.center.x, cy = el.center.y, r = d / 2
        const inside = Math.min(...INTERIOR_RADII.map((k) => meanOnCircle(blur, cx, cy, k * r)))
        const band = meanOnCircle(blur, cx, cy, r + 0.6 * CANON_PX_PER_MM)
        if (inside - band < RING_CONTRAST_MIN) continue
        out.push({ cx: cx + Z.x, cy: cy + Z.y, r, axesRatio: Math.min(el.size.width, el.size.height) / Math.max(el.size.width, el.size.height) })
      } finally { cnt.delete() }
    }
  } finally { kernel.delete(); contours.delete(); hier.delete(); bin.delete(); blur.delete(); roi.delete() }
  return out
}

export type RefinedHole = {
  cx: number; cy: number; r: number; axesRatio: number
  points: Pt[]        // all 64 sampled edge points (before outlier rejection)
  inliers: number     // how many of them survived the MAD rejection and fed the final fit
  residualPx: number  // RMS radial residual of the inliers against the final fit
}

const RAYS = 64, WINDOW_PX = 8, STEP_PX = 0.25

const det3 = (m: number[]) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])

/** Algebraic (Kåsa) least-squares circle fit: x² + y² + a·x + b·y + c = 0, normal equations solved by Cramer's rule. */
function fitCircle(pts: Pt[]) {
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0
  for (const [x, y] of pts) { const z = x * x + y * y; Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sxz += x * z; Syz += y * z; Sz += z }
  const n = pts.length
  const D = det3([Sxx, Sxy, Sx, Sxy, Syy, Sy, Sx, Sy, n])
  const a = det3([-Sxz, Sxy, Sx, -Syz, Syy, Sy, -Sz, Sy, n]) / D
  const b = det3([Sxx, -Sxz, Sx, Sxy, -Syz, Sy, Sx, -Sz, n]) / D
  const c = det3([Sxx, Sxy, -Sxz, Sxy, Syy, -Syz, Sx, Sy, -Sz]) / D
  const cx = -a / 2, cy = -b / 2
  return { cx, cy, r: Math.sqrt(cx * cx + cy * cy - c) }
}

/** Walk 64 rays outward from the coarse centre; the inner rim is the strongest bright→dark step. */
export function refineHole(cv: CV, canon: any, c: HoleCandidate): RefinedHole {
  // Blur only the window the rays can touch (+2 px so the 3×3 kernel never sees the ROI border), clamped to the image.
  const pad = c.r + WINDOW_PX + 2
  const x0 = Math.max(0, Math.floor(c.cx - pad)), y0 = Math.max(0, Math.floor(c.cy - pad))
  const x1 = Math.min(canon.cols, Math.ceil(c.cx + pad) + 1), y1 = Math.min(canon.rows, Math.ceil(c.cy + pad) + 1)
  const roi = canon.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0))
  const g = new cv.Mat()
  let m: any = null
  try {
    cv.GaussianBlur(roi, g, new cv.Size(3, 3), 0)
    const pts: Pt[] = []
    for (let k = 0; k < RAYS; k++) {
      const t = (2 * Math.PI * k) / RAYS, ux = Math.cos(t), uy = Math.sin(t)
      const rs: number[] = [], vs: number[] = []
      for (let r = c.r - WINDOW_PX; r <= c.r + WINDOW_PX; r += STEP_PX) { rs.push(r); vs.push(sampleBilinear(g, c.cx + ux * r - x0, c.cy + uy * r - y0)) }
      let best = -Infinity, bi = 2
      for (let i = 2; i < vs.length - 2; i++) { const grad = vs[i - 1] - vs[i + 1]; if (grad > best) { best = grad; bi = i } }
      const g0 = vs[bi - 2] - vs[bi], g1 = vs[bi - 1] - vs[bi + 1], g2 = vs[bi] - vs[bi + 2]
      const den = g0 - 2 * g1 + g2
      const off = den !== 0 ? (0.5 * (g0 - g2)) / den : 0
      const r = rs[bi] + Math.max(-1, Math.min(1, off)) * STEP_PX
      pts.push([c.cx + ux * r, c.cy + uy * r])
    }
    // Two passes of MAD outlier rejection; the second pass re-scores every ray against the refit. The median
    // threshold guarantees at least half of the rays survive each pass, so the refit always has ≥ 32 points.
    let fit = fitCircle(pts), keep = pts
    for (let pass = 0; pass < 2; pass++) {
      const res = pts.map(([x, y]) => Math.hypot(x - fit.cx, y - fit.cy) - fit.r)
      const mad = res.map(Math.abs).sort((a, b) => a - b)[res.length >> 1]
      keep = pts.filter((_, i) => Math.abs(res[i]) <= Math.max(3 * 1.4826 * mad, 0.5))
      fit = fitCircle(keep)
    }
    const residualPx = Math.sqrt(keep.reduce((s, [x, y]) => s + (Math.hypot(x - fit.cx, y - fit.cy) - fit.r) ** 2, 0) / keep.length)
    m = cv.matFromArray(keep.length, 1, cv.CV_32FC2, keep.flat())
    const el = cv.fitEllipse(m)
    const axesRatio = Math.min(el.size.width, el.size.height) / Math.max(el.size.width, el.size.height)
    return { cx: fit.cx, cy: fit.cy, r: fit.r, axesRatio, points: pts, inliers: keep.length, residualPx }
  } finally { m?.delete(); g.delete(); roi.delete() }
}
