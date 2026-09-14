import { describe, it, expect } from 'vitest'
import { reducer, initial } from '../src/app/state'

describe('app state', () => {
  it('idle → processing → result → idle', () => {
    let s = reducer(initial, { type: 'start' })
    expect(s.phase).toBe('processing')
    s = reducer(s, { type: 'stage', stage: 'measuring' })
    expect(s).toMatchObject({ phase: 'processing', stage: 'measuring' })
    s = reducer(s, { type: 'done', outcome: { ok: true } as any, fileTimings: { 'file decode': 12 }, wallMs: 512, engineInitMs: 1800 })
    expect(s).toMatchObject({ phase: 'result', wallMs: 512, engineInitMs: 1800 })
    expect(reducer(s, { type: 'reset' })).toEqual(initial)
  })
  it('a reject outcome lands in the reject phase', () => {
    const s = reducer(reducer(initial, { type: 'start' }), { type: 'done', outcome: { ok: false, code: 'NO_MARKER' } as any, fileTimings: {}, wallMs: 40, engineInitMs: null })
    expect(s.phase).toBe('reject')
  })
})
