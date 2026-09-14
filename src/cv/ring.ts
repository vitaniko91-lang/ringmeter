import type { CV } from './opencv'
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
