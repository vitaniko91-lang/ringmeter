import { describe, it, expect } from 'vitest'
import { buildReport, type EvalRow } from '../src/eval/report'

const rows: EvalRow[] = [
  { file: 'A-20cm.jpg', object: 'A', truthMm: 17.25, measuredMm: 17.41, sigmaMm: 0.31, sizes: { eu: 54.5, us: 7, uk: 'N½' }, verdict: 'MEASURE', expect: 'MEASURE', totalMs: 812, wallMs: 1043, blurScore: 210, detail: '' },
  { file: 'U-no-marker.jpg', object: null, truthMm: null, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'NO_MARKER', expect: 'NO_MARKER', totalMs: 120, wallMs: 240, blurScore: null, detail: 'ArUco 4x4 id 0 not detected' },
  { file: 'U-blur.jpg', object: 'A', truthMm: 17.25, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'NO_MARKER', expect: 'BLUR', totalMs: 130, wallMs: 260, blurScore: null, detail: '' },
]

describe('buildReport', () => {
  it('computes errors, pass marks and the summary', () => {
    const r = buildReport(rows, { recordedAt: '2026-09-15', printScaleCheck: 'coin fits', engineInitMs: 1834 })
    expect(r.summary).toMatchObject({ measured: 1, maxAbsErrMm: 0.16, meanAbsErrMm: 0.16, passed: 2, total: 3, meanMs: 354, meanWallMs: 514 })
    expect(r.markdown).toContain('| A-20cm.jpg | A | 17.25 | 17.41 | 0.16 |')
    expect(r.markdown).toContain('| 812 | 1043 | 210 |')
    expect(r.markdown).toContain('✗')
    expect(r.markdown).toContain('$0.00')
    expect(r.markdown).toContain('engine init on this machine: 1834 ms')
  })
  it('handles a run with no measured photos and no engine timing', () => {
    const r = buildReport([rows[1]], { recordedAt: '2026-09-15', printScaleCheck: '', engineInitMs: null })
    expect(r.summary).toMatchObject({ measured: 0, maxAbsErrMm: null, meanAbsErrMm: null, passed: 1, total: 1 })
    expect(r.markdown).toContain('max **— mm**')
    expect(r.markdown).toContain('engine init on this machine: — ms')
  })
})
