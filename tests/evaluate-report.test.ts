import { describe, it, expect } from 'vitest'
import { buildReport, TOL_MM, type EvalRow } from '../src/eval/report'

const rows: EvalRow[] = [
  { file: 'A-20cm.jpg', object: 'A', truthMm: 17.25, measuredMm: 17.41, sigmaMm: 0.31, sizes: { eu: 54.5, us: 7, uk: 'N½' }, verdict: 'MEASURE', expect: 'MEASURE', totalMs: 812, wallMs: 1043, blurScore: 210, detail: '' },
  { file: 'U-no-marker.jpg', object: null, truthMm: null, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'NO_MARKER', expect: 'NO_MARKER', totalMs: 120, wallMs: 240, blurScore: null, detail: 'ArUco 4x4 id 0 not detected' },
  { file: 'U-blur.jpg', object: 'A', truthMm: 17.25, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'NO_MARKER', expect: 'BLUR', totalMs: 130, wallMs: 260, blurScore: null, detail: '' },
  // 0.90 mm error: exceeds TOL_MM (0.5) — exercises `within tol` = ✗ on an otherwise-passing MEASURE/MEASURE row.
  { file: 'B-25cm.jpg', object: 'B', truthMm: 20.00, measuredMm: 20.90, sigmaMm: 0.35, sizes: { eu: 60, us: 9, uk: 'T' }, verdict: 'MEASURE', expect: 'MEASURE', totalMs: 900, wallMs: 1057, blurScore: 180, detail: '' },
]

describe('buildReport', () => {
  it('computes errors, within-tolerance, pass marks and the summary', () => {
    const r = buildReport(rows, { recordedAt: '2026-09-15', printScaleCheck: 'coin fits', engineInitMs: 1834 })
    expect(TOL_MM).toBe(0.5)
    expect(r.summary).toMatchObject({
      measuredWithTruth: 2, maxAbsErrMm: 0.9, meanAbsErrMm: 0.53, passed: 3, total: 4,
      withinTol: '1/2', meanMs: 856, maxMs: 900, meanWallMs: 1050, maxWallMs: 1057, rejectMeanMs: 125,
    })
    expect(r.markdown).toContain('| A-20cm.jpg | A | 17.25 | 17.41 | 0.16 |')
    expect(r.markdown).toContain('| 812 | 1043 | 210 |')
    expect(r.markdown).toContain('verdict ok')
    expect(r.markdown).toContain('within tol')
    expect(r.markdown).toContain('$0.00')
    expect(r.markdown).toContain('engine init on this machine: 1834 ms')
    expect(r.markdown).toContain('the one-time ~4 MB download is not included')
    expect(r.markdown).toContain('Rejects: mean 125 ms (early exits)')
    // A-20cm.jpg: MEASURE/MEASURE, err 0.16 ≤ 0.5 → ✓. B-25cm.jpg: MEASURE/MEASURE, err 0.90 > 0.5 → ✗.
    // U-no-marker.jpg / U-blur.jpg are not MEASURE/MEASURE pairs → within-tol column is '—'.
    const lines = r.markdown.split('\n')
    const aLine = lines.find((l) => l.startsWith('| A-20cm.jpg'))!
    const bLine = lines.find((l) => l.startsWith('| B-25cm.jpg'))!
    const noMarkerLine = lines.find((l) => l.startsWith('| U-no-marker.jpg'))!
    expect(aLine.split('|').map((c) => c.trim())).toContain('✓')
    expect(bLine.split('|').map((c) => c.trim())).toContain('✗')
    expect(noMarkerLine.split('|').map((c) => c.trim()).at(-6)).toBe('—') // within-tol cell for a non-MEASURE row
  })
  it('handles a run with no measured photos and no engine timing', () => {
    const r = buildReport([rows[1]], { recordedAt: '2026-09-15', printScaleCheck: '', engineInitMs: null })
    expect(r.summary).toMatchObject({ measuredWithTruth: 0, maxAbsErrMm: null, meanAbsErrMm: null, passed: 1, total: 1, withinTol: '0/0', meanMs: null, rejectMeanMs: 120 })
    expect(r.markdown).toContain('max **— mm**')
    expect(r.markdown).toContain('engine init on this machine: — ms')
  })
  it('renders — instead of a real timing for a reject that never reached the pipeline (totalMs 0)', () => {
    const zero: EvalRow = { file: 'U-watchdog.jpg', object: null, truthMm: null, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'INTERNAL_ERROR', expect: 'MEASURE', totalMs: 0, wallMs: 30000, blurScore: null, detail: 'timed out after 30 s' }
    const r = buildReport([zero], { recordedAt: '2026-09-15', printScaleCheck: '', engineInitMs: null })
    const line = r.markdown.split('\n').find((l) => l.startsWith('| U-watchdog.jpg'))!
    const cells = line.split('|').map((c) => c.trim())
    expect(cells.at(-5)).toBe('—') // time ms
    expect(cells.at(-4)).toBe('—') // wall ms — also blanked, even though wallMs itself is a real 30000
    expect(r.summary.rejectMeanMs).toBeNull() // excluded from the rejects mean too
  })
  it('escapes a pipe and a newline inside detail so the markdown table does not break', () => {
    const dirty: EvalRow = { file: 'U-dirty.jpg', object: null, truthMm: null, measuredMm: null, sigmaMm: null, sizes: null, verdict: 'NO_RING', expect: 'MEASURE', totalMs: 50, wallMs: 90, blurScore: 30, detail: 'a | pipe\nand a newline' }
    const r = buildReport([dirty], { recordedAt: '2026-09-15', printScaleCheck: '', engineInitMs: null })
    expect(r.markdown).toContain('a \\| pipe and a newline')
    expect(r.markdown).not.toContain('a | pipe\nand a newline')
  })
})
