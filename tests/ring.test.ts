import { describe, it, expect, beforeAll } from 'vitest'
import { loadCv, type CV } from '../src/cv/opencv'
import { renderSynthetic } from '../src/cv/synthetic'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { rectify } from '../src/cv/rectify'
import { findHoleCandidates } from '../src/cv/ring'
import { CANON_PX_PER_MM, mmToCanon } from '../src/kit/kit-geometry'

let cv: CV
beforeAll(async () => { cv = await loadCv() })

function canonOf(opts = {}) {
  const gray = toGray(cv, renderSynthetic(cv, opts).image)
  const q = detectMarker(cv, gray)!
  const r = rectify(cv, gray, q)
  gray.delete()
  return r
}

describe('rectify', () => {
  it('maps the marker to its canonical square', () => {
    const { canon } = canonOf({ tilt: 'mild' })
    const inside = mmToCanon({ x: 1, y: 1 }), paper = mmToCanon({ x: 31, y: -19 })
    expect(canon.ucharPtr(inside.y, inside.x)[0]).toBeLessThan(80)   // black border cell
    expect(canon.ucharPtr(paper.y, paper.x)[0]).toBeGreaterThan(200) // zone corner is paper
  })
})

describe('hole candidates', () => {
  it('finds exactly one hole of ~17.3 mm (coarse ≤ 0.3 mm)', () => {
    const { canon } = canonOf({ tilt: 'mild', blurPx: 5 })
    const c = findHoleCandidates(cv, canon)
    expect(c).toHaveLength(1)
    expect(Math.abs((2 * c[0].r) / CANON_PX_PER_MM - 17.3)).toBeLessThan(0.3)
  })
  it('finds two with an extra ring', () => expect(findHoleCandidates(cv, canonOf({ extraRing: true }).canon)).toHaveLength(2))
  it('finds none without a ring', () => expect(findHoleCandidates(cv, canonOf({ innerMm: null }).canon)).toHaveLength(0))
})
