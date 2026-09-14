import { describe, it, expect } from 'vitest'
import * as K from '../src/kit/kit-geometry'

describe('kit geometry', () => {
  it('zone does not overlap the marker + quiet zone', () => {
    expect(K.ZONE.x).toBeGreaterThanOrEqual(K.MARKER_MM + K.QUIET_ZONE_MM)
  })
  it('zone is centred on the marker centre vertically', () => {
    expect(K.ZONE.y + K.ZONE.h / 2).toBeCloseTo(K.MARKER_MM / 2, 6)
  })
  it('canonical frame contains marker and zone', () => {
    const tl = K.mmToCanon({ x: 0, y: 0 }), br = K.mmToCanon({ x: K.ZONE.x + K.ZONE.w, y: K.ZONE.y + K.ZONE.h })
    expect(tl.x).toBeGreaterThan(0); expect(tl.y).toBeGreaterThan(0)
    expect(br.x).toBeLessThan(K.CANON_SIZE_PX.w); expect(br.y).toBeLessThan(K.CANON_SIZE_PX.h)
  })
  it('gauge runs 15.0 … 22.0 by 0.5', () => {
    expect(K.GAUGE_CIRCLES_MM[0]).toBe(15); expect(K.GAUGE_CIRCLES_MM.at(-1)).toBe(22); expect(K.GAUGE_CIRCLES_MM).toHaveLength(15)
  })
  it('everything fits on A4 with 10 mm margins', () => {
    const right = K.MARKER_ON_SHEET.x + K.ZONE.x + K.ZONE.w
    expect(right).toBeLessThanOrEqual(K.SHEET.w - 10)
    expect(K.MARKER_ON_SHEET.y + K.ZONE.y).toBeGreaterThanOrEqual(10)
    expect(K.MARKER_ON_SHEET.x - K.QUIET_ZONE_MM).toBeGreaterThanOrEqual(10)
    expect(K.MARKER_ON_SHEET.y + K.ZONE.y + K.ZONE.h).toBeLessThanOrEqual(K.SHEET.h - 10)
  })
})
