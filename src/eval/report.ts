import type { SizeReading } from '../cv/types'

/** One photo of the test set as the evaluator saw it. `totalMs` is the CV pipeline; `wallMs` is tap → result on the main thread. */
export type EvalRow = {
  file: string; object: string | null; truthMm: number | null; measuredMm: number | null; sigmaMm: number | null
  sizes: SizeReading | null; verdict: string; expect: string; totalMs: number; wallMs: number; blurScore: number | null; detail: string
}

export type EvalMeta = { recordedAt: string; printScaleCheck: string; engineInitMs: number | null }

const f2 = (v: number | null) => (v === null ? '—' : v.toFixed(2))
const f0 = (v: number | null) => (v === null ? '—' : v.toFixed(0))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function buildReport(rows: EvalRow[], meta: EvalMeta) {
  const errs = rows.filter((r) => r.measuredMm !== null && r.truthMm !== null).map((r) => +Math.abs(r.measuredMm! - r.truthMm!).toFixed(2))
  const passed = rows.filter((r) => r.verdict === r.expect).length
  const m = mean(errs), ms = mean(rows.map((r) => r.totalMs)), wall = mean(rows.map((r) => r.wallMs))
  const summary = {
    total: rows.length, measured: errs.length, passed,
    maxAbsErrMm: errs.length ? Math.max(...errs) : null,
    meanAbsErrMm: m === null ? null : +m.toFixed(2),
    meanMs: ms === null ? null : +ms.toFixed(0),
    meanWallMs: wall === null ? null : +wall.toFixed(0),
  }
  const line = (r: EvalRow) => {
    const err = r.measuredMm !== null && r.truthMm !== null ? Math.abs(r.measuredMm - r.truthMm) : null
    const sz = r.sizes ? `EU ${r.sizes.eu} · US ${r.sizes.us} · UK ${r.sizes.uk}` : '—'
    return `| ${r.file} | ${r.object ?? '—'} | ${f2(r.truthMm)} | ${f2(r.measuredMm)} | ${f2(err)} | ${f2(r.sigmaMm)} | ${sz} | ${r.verdict} | ${r.expect} | ${r.verdict === r.expect ? '✓' : '✗'} | ${f0(r.totalMs)} | ${f0(r.wallMs)} | ${f0(r.blurScore)} | ${r.detail} |`
  }
  const markdown = `# Test-set results

Ground truth recorded ${meta.recordedAt} (before any run). Print scale check: ${meta.printScaleCheck}.
Chromium via Playwright on this machine; engine init on this machine: ${f0(meta.engineInitMs)} ms (once per session, before the first photo).
Columns: *time ms* = CV pipeline inside the worker; *wall ms* = tap → result on the page, including file decode and worker messaging.

| file | object | truth mm | measured mm | abs err mm | ± mm | sizes | verdict | expected | ok | time ms | wall ms | blur | detail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map(line).join('\n')}

## Summary

- Photos: ${summary.total} · measured: ${summary.measured} · verdict matches expectation: ${summary.passed}/${summary.total}
- Absolute diameter error on measured photos: max **${f2(summary.maxAbsErrMm)} mm**, mean ${f2(summary.meanAbsErrMm)} mm
- Mean processing time: ${f0(summary.meanMs)} ms pipeline · ${f0(summary.meanWallMs)} ms tap-to-result per photo (Chromium via Playwright, this machine — phone timings in DELIVERY-NOTES)
- Cost per image: **$0.00** variable — on-device; hosting separate (static, Vercel Hobby $0 / Pro $20 per month)
`
  return { summary, markdown }
}
