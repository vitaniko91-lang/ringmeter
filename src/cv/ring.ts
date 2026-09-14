import type { CV } from './opencv'
import type { Pt } from './types'
import { CANON_PX_PER_MM, RING_DIAMETER_MM, ZONE_CANON_PX } from '../kit/kit-geometry'
import { sampleBilinear } from './image'

export type HoleCandidate = { cx: number; cy: number; r: number; axesRatio: number } // canonical px

const CIRCULARITY_MIN = 0.8
const RING_CONTRAST_MIN = 40 // paper inside the hole must be this much brighter than the band 1.5 mm outside

function meanOnCircle(gray: any, cx: number, cy: number, r: number, n = 32) {
  let s = 0
  for (let k = 0; k < n; k++) { const t = (2 * Math.PI * k) / n; s += sampleBilinear(gray, cx + r * Math.cos(t), cy + r * Math.sin(t)) }
  return s / n
}

/** White blobs fully inside the zone, circular, ring-sized, and surrounded by a darker band. */
export function findHoleCandidates(cv: CV, canon: any): HoleCandidate[] {
  const Z = ZONE_CANON_PX
  const roi = canon.roi(new cv.Rect(Z.x, Z.y, Z.w, Z.h))
  const blur = new cv.Mat(), bin = new cv.Mat()
  cv.GaussianBlur(roi, blur, new cv.Size(3, 3), 0)
  cv.adaptiveThreshold(blur, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 8)
  const contours = new cv.MatVector(), hier = new cv.Mat()
  cv.findContours(bin, contours, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE)
  const out: HoleCandidate[] = []
  const dMin = RING_DIAMETER_MM.min * CANON_PX_PER_MM, dMax = RING_DIAMETER_MM.max * CANON_PX_PER_MM
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i)
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
    const inside = meanOnCircle(blur, cx, cy, r * 0.5), band = meanOnCircle(blur, cx, cy, r + 1.5 * CANON_PX_PER_MM)
    if (inside - band < RING_CONTRAST_MIN) continue
    out.push({ cx: cx + Z.x, cy: cy + Z.y, r, axesRatio: Math.min(el.size.width, el.size.height) / Math.max(el.size.width, el.size.height) })
  }
  contours.delete(); hier.delete(); bin.delete(); blur.delete(); roi.delete()
  return out
}

export type RefinedHole = { cx: number; cy: number; r: number; axesRatio: number; points: Pt[]; residualPx: number }

const RAYS = 64, WINDOW_PX = 8, STEP_PX = 0.25

/** Algebraic (Kåsa) least-squares circle fit. */
function fitCircle(cv: CV, pts: Pt[]) {
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0
  for (const [x, y] of pts) { const z = x * x + y * y; Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sxz += x * z; Syz += y * z; Sz += z }
  const A = cv.matFromArray(3, 3, cv.CV_64F, [Sxx, Sxy, Sx, Sxy, Syy, Sy, Sx, Sy, pts.length])
  const B = cv.matFromArray(3, 1, cv.CV_64F, [-Sxz, -Syz, -Sz])
  const X = new cv.Mat()
  cv.solve(A, B, X, cv.DECOMP_LU)
  const [a, b, c] = [X.data64F[0], X.data64F[1], X.data64F[2]]
  A.delete(); B.delete(); X.delete()
  const cx = -a / 2, cy = -b / 2
  return { cx, cy, r: Math.sqrt(cx * cx + cy * cy - c) }
}

/** Walk 64 rays outward from the coarse centre; the inner rim is the strongest bright→dark step. */
export function refineHole(cv: CV, canon: any, c: HoleCandidate): RefinedHole {
  const g = new cv.Mat()
  cv.GaussianBlur(canon, g, new cv.Size(3, 3), 0)
  const pts: Pt[] = []
  for (let k = 0; k < RAYS; k++) {
    const t = (2 * Math.PI * k) / RAYS, ux = Math.cos(t), uy = Math.sin(t)
    const rs: number[] = [], vs: number[] = []
    for (let r = c.r - WINDOW_PX; r <= c.r + WINDOW_PX; r += STEP_PX) { rs.push(r); vs.push(sampleBilinear(g, c.cx + ux * r, c.cy + uy * r)) }
    let best = -Infinity, bi = 2
    for (let i = 2; i < vs.length - 2; i++) { const grad = vs[i - 1] - vs[i + 1]; if (grad > best) { best = grad; bi = i } }
    const g0 = vs[bi - 2] - vs[bi], g1 = vs[bi - 1] - vs[bi + 1], g2 = vs[bi] - vs[bi + 2]
    const den = g0 - 2 * g1 + g2
    const off = den !== 0 ? (0.5 * (g0 - g2)) / den : 0
    const r = rs[bi] + Math.max(-1, Math.min(1, off)) * STEP_PX
    pts.push([c.cx + ux * r, c.cy + uy * r])
  }
  g.delete()
  let fit = fitCircle(cv, pts)
  const res = pts.map(([x, y]) => Math.hypot(x - fit.cx, y - fit.cy) - fit.r)
  const mad = res.map(Math.abs).sort((a, b) => a - b)[res.length >> 1]
  const keep = pts.filter((_, i) => Math.abs(res[i]) <= Math.max(3 * mad, 0.5))
  if (keep.length >= 16) fit = fitCircle(cv, keep)
  const residualPx = Math.sqrt(keep.reduce((s, [x, y]) => s + (Math.hypot(x - fit.cx, y - fit.cy) - fit.r) ** 2, 0) / keep.length)
  const m = cv.matFromArray(keep.length, 1, cv.CV_32FC2, keep.flat())
  const el = cv.fitEllipse(m); m.delete()
  const axesRatio = Math.min(el.size.width, el.size.height) / Math.max(el.size.width, el.size.height)
  return { cx: fit.cx, cy: fit.cy, r: fit.r, axesRatio, points: pts, residualPx }
}
