import { describe, it, expect, beforeAll } from 'vitest'
import { loadCv, type CV } from '../src/cv/opencv'
import { renderSynthetic, SYN_RING_CENTER_MM, type SyntheticOpts } from '../src/cv/synthetic'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { rectify, canonToSource, type Rectified } from '../src/cv/rectify'
import { findHoleCandidates, refineHole } from '../src/cv/ring'
import { CANON_PX_PER_MM, MARKER_CANON_PX, mmToCanon } from '../src/kit/kit-geometry'
import type { Pt, Quad } from '../src/cv/types'

let cv: CV
beforeAll(async () => { cv = await loadCv() })

// Synthetic canvas placement (mirrors ORIGIN_MM and the default pxPerMm in synthetic.ts): source px of the ring centre.
const SYN_PX_PER_MM = 12, SYN_ORIGIN_MM = { x: 15, y: 30 }
const RING_SRC = { x: (SYN_ORIGIN_MM.x + SYN_RING_CENTER_MM.x) * SYN_PX_PER_MM, y: (SYN_ORIGIN_MM.y + SYN_RING_CENTER_MM.y) * SYN_PX_PER_MM }

/** Render → (optionally paint on the gray) → detect → rectify; the Rectified and the gray are always deleted. */
function withRectified<T>(opts: SyntheticOpts, fn: (r: Rectified, quad: Quad) => T, paint?: (gray: any) => void): T {
  const gray = toGray(cv, renderSynthetic(cv, opts).image)
  paint?.(gray)
  const quad = detectMarker(cv, gray)!
  const r = rectify(cv, gray, quad)
  gray.delete()
  try { return fn(r, quad) } finally { r.delete() }
}

describe('rectify', () => {
  it('maps the marker to its canonical square', () => withRectified({ tilt: 'mild' }, ({ canon }) => {
    const inside = mmToCanon({ x: 1, y: 1 }), paper = mmToCanon({ x: 31, y: -19 })
    expect(canon.ucharPtr(inside.y, inside.x)[0]).toBeLessThan(80)   // black border cell
    expect(canon.ucharPtr(paper.y, paper.x)[0]).toBeGreaterThan(200) // zone corner is paper
  }))
  it('canonToSource maps the canonical marker corners back onto the detected quad', () => withRectified({ tilt: 'mild' }, ({ Hinv }, quad) => {
    const back = canonToSource(cv, Hinv, MARKER_CANON_PX.map((p): Pt => [p.x, p.y]))
    expect(back).toHaveLength(4)
    back.forEach(([x, y], i) => expect(Math.hypot(x - quad[i][0], y - quad[i][1])).toBeLessThan(0.5))
  }))
})

describe('hole candidates', () => {
  it('finds exactly one hole of ~17.3 mm (coarse ≤ 0.3 mm)', () => withRectified({ tilt: 'mild', blurPx: 5 }, ({ canon }) => {
    const c = findHoleCandidates(cv, canon)
    expect(c).toHaveLength(1)
    expect(Math.abs((2 * c[0].r) / CANON_PX_PER_MM - 17.3)).toBeLessThan(0.3)
  }))
  it('finds two with an extra ring', () => withRectified({ extraRing: true }, ({ canon }) => expect(findHoleCandidates(cv, canon)).toHaveLength(2)))
  it('finds none without a ring', () => withRectified({ innerMm: null }, ({ canon }) => expect(findHoleCandidates(cv, canon)).toHaveLength(0)))
})

describe('refineHole', () => {
  // residual bias after refinement is the ArUco SUBPIX scale term (+0.05…0.2 %), covered by σ_marker
  for (const [inner, opts] of [[17.30, { tilt: 'mild', blurPx: 5 }], [16.55, { tilt: 'mild', blurPx: 7 }], [19.10, { tilt: 'none', blurPx: 3 }]] as const) {
    it(`recovers ${inner} mm within 0.1 mm`, () => withRectified({ ...opts, innerMm: inner }, ({ canon }) => {
      const c = findHoleCandidates(cv, canon)[0]
      const h = refineHole(cv, canon, c)
      expect(Math.abs((2 * h.r) / CANON_PX_PER_MM - inner)).toBeLessThan(0.1)
      expect(h.points).toHaveLength(64)
      expect(h.axesRatio).toBeGreaterThan(0.985)
      expect(h.residualPx).toBeLessThan(0.3)
      expect(h.inliers).toBeGreaterThanOrEqual(60)
      // Every one of the 64 sampled edge points sits on the TRUE-radius circle about the fitted centre — the rim was
      // localised on every ray, not merely fitted consistently. Per-ray bound is 1 px (= the 0.1 mm diameter tolerance):
      // measured max is 0.46–0.70 px, worst on axis-aligned rays of the blur-3 render (rasteriser/resampling aliasing).
      // The centre carries two terms the refinement cannot see — the synthetic draws the disc at pixel-centre 900.0
      // while the marker edge sits at 179.5 (0.42 px/axis in canon) and the ArUco scale term (≤ 0.2 % × 600 px) —
      // so it gets a 1.5 px budget against mmToCanon(SYN_RING_CENTER_MM) rather than 0.5.
      const T = mmToCanon(SYN_RING_CENTER_MM), R = (inner / 2) * CANON_PX_PER_MM
      for (const [x, y] of h.points) expect(Math.abs(Math.hypot(x - h.cx, y - h.cy) - R)).toBeLessThan(1.0)
      expect(Math.hypot(h.cx - T.x, h.cy - T.y)).toBeLessThan(1.5)
    }))
  }
  it('thin 1 mm band (17.3 / 19.3): one candidate, refined within 0.1 mm', () => withRectified({ innerMm: 17.3, outerMm: 19.3 }, ({ canon }) => {
    const c = findHoleCandidates(cv, canon)
    expect(c).toHaveLength(1)
    const h = refineHole(cv, canon, c[0])
    expect(Math.abs((2 * h.r) / CANON_PX_PER_MM - 17.3)).toBeLessThan(0.1)
  }))
  it('four highlights on the band: one candidate, refined within 0.1 mm, outlier rays rejected', () => withRectified({}, ({ canon }) => {
    const c = findHoleCandidates(cv, canon)
    expect(c).toHaveLength(1)
    const h = refineHole(cv, canon, c[0])
    expect(Math.abs((2 * h.r) / CANON_PX_PER_MM - 17.3)).toBeLessThan(0.1)
    expect(h.inliers).toBeGreaterThanOrEqual(56)
    expect(h.inliers).toBeLessThan(64) // the MAD path actually rejected the rays that hit a highlight
  }, (gray) => {
    // white 5 px discs straddling the inner rim (centre 4 px outside it) at 0°, 90°, 180°, 270°
    const rIn = (17.3 / 2) * SYN_PX_PER_MM + 4
    for (const t of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2])
      cv.circle(gray, new cv.Point(Math.round(RING_SRC.x + rIn * Math.cos(t)), Math.round(RING_SRC.y + rIn * Math.sin(t))), 5, new cv.Scalar(255), -1, cv.LINE_AA)
  }))
})
