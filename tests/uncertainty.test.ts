import { describe, it, expect } from 'vitest'
import { uncertainty, estimateDistanceMm, ASSUMED } from '../src/cv/uncertainty'

describe('uncertainty', () => {
  it('estimates distance from marker size', () => {
    // f_px ≈ 0.7·W ; D = f_px · 20 / side
    expect(estimateDistanceMm(4000, 200)).toBeCloseTo(0.7 * 4000 * 20 / 200)
  })
  it('combines edge, marker and parallax terms in quadrature', () => {
    const u = uncertainty({ diameterMm: 17, pxPerMm: 10, markerSidePx: 200, distanceMm: 280, tiltDeg: 5 })
    expect(u.px).toBeCloseTo(0.1)
    expect(u.marker).toBeCloseTo(17 * 0.5 / 200)
    expect(u.parallax).toBeCloseTo(17 * ASSUMED.ringHeightMm / 280 + ASSUMED.ringHeightMm * Math.tan(5 * Math.PI / 180))
    expect(u.total).toBeCloseTo(Math.hypot(u.px, u.marker, u.parallax))
  })
  it('never assumes tilt below the floor', () => {
    const a = uncertainty({ diameterMm: 17, pxPerMm: 10, markerSidePx: 200, distanceMm: 280, tiltDeg: 0 })
    const b = uncertainty({ diameterMm: 17, pxPerMm: 10, markerSidePx: 200, distanceMm: 280, tiltDeg: ASSUMED.minTiltDeg })
    expect(a.total).toBeCloseTo(b.total)
  })
})
