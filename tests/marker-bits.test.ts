import { describe, it, expect, beforeAll } from 'vitest'
import { loadCv, type CV } from '../src/cv/opencv'
import { markerBits } from '../src/kit/marker-bits'

let cv: CV
beforeAll(async () => { cv = await loadCv() })

describe('markerBits', () => {
  it('is a 6×6 matrix with a solid black border and mixed interior', () => {
    const b = markerBits(cv)
    expect(b).toHaveLength(6); b.forEach((r) => expect(r).toHaveLength(6))
    for (let i = 0; i < 6; i++) { expect(b[0][i]).toBe(true); expect(b[5][i]).toBe(true); expect(b[i][0]).toBe(true); expect(b[i][5]).toBe(true) }
    const inner = b.slice(1, 5).flatMap((r) => r.slice(1, 5))
    expect(inner.some(Boolean)).toBe(true); expect(inner.some((v) => !v)).toBe(true)
  })
})
