import { describe, it, expect } from 'vitest'
import { markerGeometry, markerGates, blurGate, ellipseGate, GATES } from '../src/cv/gates'
import type { Quad } from '../src/cv/types'

const square = (s: number): Quad => [[100, 100], [100 + s, 100], [100 + s, 100 + s], [100, 100 + s]]

describe('gates', () => {
  it('measures a square marker', () => {
    const g = markerGeometry(square(200))
    expect(g.sidePx).toBeCloseTo(200); expect(g.ratio).toBeCloseTo(1); expect(g.maxAngleDev).toBeCloseTo(0); expect(g.pxPerMm).toBeCloseTo(10)
  })
  it('passes a square marker at 200 px', () => expect(markerGates(square(200))).toBeNull())
  it('rejects TOO_FAR below MIN_PX_PER_MM', () => expect(markerGates(square(20 * GATES.MIN_PX_PER_MM - 10))).toBe('TOO_FAR'))
  it('rejects TILT on a trapezoid', () => {
    const trap: Quad = [[100, 100], [300, 100], [290, 300], [110, 300]] // bottom 180 vs top 200
    expect(markerGates(trap)).toBe('TILT')
  })
  it('rejects BLUR below the threshold', () => { expect(blurGate(GATES.BLUR_MIN_SCORE - 1)).toBe('BLUR'); expect(blurGate(GATES.BLUR_MIN_SCORE + 1)).toBeNull() })
  it('rejects ELLIPTIC below the axes ratio', () => { expect(ellipseGate(0.97)).toBe('ELLIPTIC'); expect(ellipseGate(0.995)).toBeNull() })
})
