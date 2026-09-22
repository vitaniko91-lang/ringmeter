import type { SizeReading } from '../cv/types'

/** One photo of the test set as the evaluator saw it. `totalMs` is the CV pipeline; `wallMs` is tap → result on the main thread. */
export type EvalRow = {
  file: string; object: string | null; truthMm: number | null; measuredMm: number | null; sigmaMm: number | null
  sizes: SizeReading | null; verdict: string; expect: string; totalMs: number; wallMs: number; blurScore: number | null; detail: string
}

export type EvalMeta = { recordedAt: string; status?: string; scaleCheck: string; kit?: string; engineInitMs: number | null }

/** Diameter error, in mm, at or below which a measured photo counts as "within tolerance" — the plan's failure threshold. */
export const TOL_MM = 0.5

const COLUMNS = ['file', 'object', 'truth mm', 'measured mm', 'abs err mm', '± mm', 'sizes', 'verdict', 'expected', 'verdict ok', 'within tol', 'time ms', 'wall ms', 'blur', 'detail']

const f2 = (v: number | null) => (v === null ? '—' : v.toFixed(2))
const f0 = (v: number | null) => (v === null ? '—' : v.toFixed(0))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
/** A raw `|` or newline inside `detail` would otherwise break the markdown table row it lands in. */
const escapeCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

export function buildReport(rows: EvalRow[], meta: EvalMeta) {
  const withTruth = rows.filter((r) => r.measuredMm !== null && r.truthMm !== null)
  const errs = withTruth.map((r) => +Math.abs(r.measuredMm! - r.truthMm!).toFixed(2))
  const withinTolCount = errs.filter((e) => e <= TOL_MM).length
  const passed = rows.filter((r) => r.verdict === r.expect).length

  // Timing is only meaningful once a photo actually reached the CV pipeline. `!ok && totalMs === 0` marks a reject
  // that never got there at all (BAD_FILE decode failure, worker crash, watchdog timeout) — its totalMs is a
  // placeholder, not a measurement, so such rows are excluded from every mean/max below and rendered as `—`.
  const measuredRows = rows.filter((r) => r.measuredMm !== null)
  const rejectRows = rows.filter((r) => r.measuredMm === null && r.totalMs > 0)

  const meanErr = mean(errs)
  const msVals = measuredRows.map((r) => r.totalMs), wallVals = measuredRows.map((r) => r.wallMs)
  const meanMs = mean(msVals), meanWall = mean(wallVals)
  const rejectMs = mean(rejectRows.map((r) => r.totalMs))

  const summary = {
    total: rows.length, measuredWithTruth: errs.length, passed,
    withinTol: `${withinTolCount}/${errs.length}`,
    maxAbsErrMm: errs.length ? Math.max(...errs) : null,
    meanAbsErrMm: meanErr === null ? null : +meanErr.toFixed(2),
    meanMs: meanMs === null ? null : +meanMs.toFixed(0),
    maxMs: msVals.length ? Math.max(...msVals) : null,
    meanWallMs: meanWall === null ? null : +meanWall.toFixed(0),
    maxWallMs: wallVals.length ? Math.max(...wallVals) : null,
    rejectMeanMs: rejectMs === null ? null : +rejectMs.toFixed(0),
  }

  const line = (r: EvalRow) => {
    const err = r.measuredMm !== null && r.truthMm !== null ? Math.abs(r.measuredMm - r.truthMm) : null
    const sz = r.sizes ? `EU ${r.sizes.eu} · US ${r.sizes.us} · UK ${r.sizes.uk}` : '—'
    const withinTol = r.verdict === 'MEASURE' && r.expect === 'MEASURE' ? (err !== null && err <= TOL_MM ? '✓' : '✗') : '—'
    const noTiming = r.measuredMm === null && r.totalMs === 0
    const time = noTiming ? '—' : f0(r.totalMs)
    const wallMs = noTiming ? '—' : f0(r.wallMs)
    const cells = [
      r.file, r.object ?? '—', f2(r.truthMm), f2(r.measuredMm), f2(err), f2(r.sigmaMm), sz, r.verdict, r.expect,
      r.verdict === r.expect ? '✓' : '✗', withinTol, time, wallMs, f0(r.blurScore), escapeCell(r.detail),
    ]
    return `| ${cells.join(' | ')} |`
  }

  const header = `| ${COLUMNS.join(' | ')} |`
  const sep = `|${COLUMNS.map(() => '---').join('|')}|`
  const markdown = `# Test-set results

Ground truth recorded ${meta.recordedAt}. Status: ${meta.status ?? "—"}\nKit: ${meta.kit ?? 'printed A4 Ring Kit'}\nScale check: ${meta.scaleCheck}
Chromium via Playwright on this machine; engine init on this machine: ${f0(meta.engineInitMs)} ms (once per session, before the first photo) (localhost; the one-time ~4 MB download is not included).
Columns: *time ms* = CV pipeline inside the worker; *wall ms* = tap → result on the page, including file decode and worker messaging.

${header}
${sep}
${rows.map(line).join('\n')}

## Summary

- Photos: ${summary.total} · measured (with ground truth): ${summary.measuredWithTruth} · verdict matches expectation: ${summary.passed}/${summary.total}
- Absolute diameter error on measured photos: max **${f2(summary.maxAbsErrMm)} mm**, mean ${f2(summary.meanAbsErrMm)} mm
- Within tolerance (± ${TOL_MM} mm): **${summary.withinTol}**
- Mean processing time (measured photos): ${f0(summary.meanMs)} ms pipeline (max ${f0(summary.maxMs)}) · ${f0(summary.meanWallMs)} ms wall (max ${f0(summary.maxWallMs)}) tap-to-result (Chromium via Playwright, this machine — phone timings in DELIVERY-NOTES)
- Rejects: mean ${f0(summary.rejectMeanMs)} ms (early exits)
- Cost per image: **$0.00** variable — on-device; hosting separate (static, Vercel Hobby $0 / Pro $20 per month)
`
  return { summary, markdown }
}
