import { describe, it, expect } from 'vitest'
import { euSize, usSize, ukSize, sizesFor, sizeRange } from '../src/sizing/sizing'

// d / US / UK are the Wikipedia “Ring size” table rows; EU is roundHalf(π·d), i.e. the table's circumference rounded to the nearest half.
const anchors = [
  { d: 15.70, eu: 49.5, us: 5, uk: 'J½' },
  { d: 16.51, eu: 52, us: 6, uk: 'L½' },
  { d: 17.32, eu: 54.5, us: 7, uk: 'N½' },
  { d: 18.14, eu: 57, us: 8, uk: 'P½' },
  { d: 19.76, eu: 62, us: 10, uk: 'T½' },
]

describe('sizing', () => {
  for (const a of anchors) {
    it(`d=${a.d} → EU ${a.eu}, US ${a.us}, UK ${a.uk}`, () => {
      expect(euSize(a.d)).toBe(a.eu)
      expect(usSize(a.d)).toBe(a.us)
      expect(ukSize(a.d)).toBe(a.uk)
    })
  }
  it('rounds to nearest half', () => { expect(euSize(17.30)).toBe(54.5); expect(usSize(17.0)).toBe(6.5) })
  it('range spans when σ crosses a boundary', () => {
    const r = sizeRange(17.30, 0.30)
    expect(r.low.eu).toBeLessThan(r.high.eu); expect(r.spans).toBe(true)
    expect(sizeRange(17.35, 0.05).spans).toBe(false)
  })
  it('sizesFor returns all three scales', () => { expect(sizesFor(17.35)).toEqual({ eu: 54.5, us: 7, uk: 'N½' }) })
  it('UK scale continues past Z as Z1, Z2 …', () => { expect(ukSize(23.42)).toBe('Z4') })
  it('range spans when the UK index crosses a Z-extension boundary', () => { expect(sizeRange(24, 0.3).spans).toBe(true) })
})
