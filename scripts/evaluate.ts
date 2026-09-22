// Drives the BUILT app (dist/) in headless Chromium over the photo test set and writes the results table.
//   npm run build && npm run evaluate
// Env overrides (all optional): TESTSET_DIR (photos dir, default testset/photos), GROUND_TRUTH (json, default
// testset/ground-truth.json), RESULTS_OUT (markdown, default testset/RESULTS.md), READY_TIMEOUT_MS (engine-ready
// wait, default 180000 — matches the app's own INIT_WATCHDOG_MS).
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildReport, type EvalRow } from '../src/eval/report'
import { REJECT_HINT } from '../src/cv/types'

const PORT = 4173
const DIR = process.env.TESTSET_DIR ?? 'testset/photos'
const GT = process.env.GROUND_TRUTH ?? 'testset/ground-truth.json'
const OUT = process.env.RESULTS_OUT ?? 'testset/RESULTS.md'
const OVERLAY_OUT = process.env.OVERLAY_OUT   // optional: per-photo overlays (marker quad, inner boundary in source px) as JSON, for offline inspection
const READY_TIMEOUT_MS = Number(process.env.READY_TIMEOUT_MS ?? 180_000)   // aligned with useMeasure's INIT_WATCHDOG_MS

const REJECT_CODES = Object.keys(REJECT_HINT)

type GroundTruth = {
  status: string; recordedAt: string; scaleCheck: string; kit?: string
  objects: Record<string, { kind: string; truthMm: number | null; method?: string; uncertaintyMm?: number }>
  photos: { file: string; object: string | null; expect: string }[]
}

if (!existsSync('dist/index.html')) throw new Error('dist/ is missing — run `npm run build` first')
const gt = JSON.parse(readFileSync(GT, 'utf8')) as GroundTruth
// A template ground truth (unfilled recordedAt, or a status still marked TEMPLATE) must never be run — its
// truthMm values are placeholders, and a "result" against them would be a fabricated measurement.
if (!gt.recordedAt) throw new Error(`${GT}: recordedAt is empty — this ground truth has not been filled in yet`)
if (gt.status?.startsWith('TEMPLATE')) throw new Error(`${GT}: status is still "${gt.status}" — fill in the template before running the evaluator`)
for (const ph of gt.photos) {
  if (!existsSync(resolve(DIR, ph.file))) throw new Error(`${resolve(DIR, ph.file)} not found`)
  if (ph.object && !gt.objects[ph.object]) throw new Error(`${ph.file}: unknown object "${ph.object}"`)
  if (ph.expect !== 'MEASURE' && !REJECT_CODES.includes(ph.expect)) throw new Error(`${ph.file}: unknown expect "${ph.expect}"`)
  if (ph.expect === 'MEASURE' && ph.object && gt.objects[ph.object].truthMm === null) throw new Error(`${ph.file}: object "${ph.object}" expects MEASURE but truthMm is null`)
}

// vite is spawned directly (not via npx) so that kill() reaches the server process itself.
const server = spawn(resolve('node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'ignore', 'inherit'] })
let up = false
for (let i = 0; i < 50 && !up; i++) {
  if (server.exitCode !== null) throw new Error(`vite preview exited (port ${PORT} busy?)`)
  try { await fetch(`http://localhost:${PORT}`); up = true } catch { await new Promise((r) => setTimeout(r, 200)) }
}
if (!up) { server.kill(); throw new Error(`vite preview did not come up on :${PORT}`) }

// A server already answering on :4173 from a previous run (or an unrelated project) passes the readiness fetch
// above too — confirm it is actually THIS build by matching the hashed entry script filename against dist/index.html.
const distScript = /\/assets\/(?:index|main)-[^"']+\.js/.exec(readFileSync('dist/index.html', 'utf8'))?.[0]
if (!distScript) { server.kill(); throw new Error('dist/index.html: could not find the built entry script tag') }
const liveHtml = await (await fetch(`http://localhost:${PORT}/`)).text()
if (!liveHtml.includes(distScript)) { server.kill(); throw new Error(`another server is on :${PORT}`) }

const rows: EvalRow[] = []
const overlays: Record<string, unknown> = {}
let engineInitMs: number | null = null
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
try {
  browser = await chromium.launch()   // inside the try: a launch failure must still stop the preview server
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`http://localhost:${PORT}/?eval=1`)   // ?eval=1 exposes window.__ringmeter; a plain production page has no hook
  const tReady = Date.now()
  await page.waitForFunction(() => window.__ringmeter?.ready === true, undefined, { timeout: READY_TIMEOUT_MS })   // engine init is once per session and is NOT part of any photo's wall time
  engineInitMs = (await page.evaluate(() => window.__ringmeter!.engineInitMs)) ?? null
  console.log(`engine ready: ${engineInitMs?.toFixed(0) ?? '—'} ms in the worker (${Date.now() - tReady} ms after navigation)`)
  for (const [i, ph] of gt.photos.entries()) {
    await page.setInputFiles('input[type=file]', resolve(DIR, ph.file))
    await page.waitForFunction((n) => window.__ringmeter?.seq === n && !!window.__ringmeter.last, i + 1, { timeout: 120_000 })
    const last = await page.evaluate(() => window.__ringmeter!.last!)
    const o = last.outcome, obj = ph.object ? gt.objects[ph.object] : null
    rows.push({
      file: ph.file, object: ph.object, truthMm: obj?.truthMm ?? null,
      measuredMm: o.ok ? +o.diameterMm.toFixed(2) : null, sigmaMm: o.ok ? +o.sigmaMm.toFixed(2) : null,
      sizes: o.ok ? o.sizes.nominal : null, verdict: o.ok ? 'MEASURE' : o.code, expect: ph.expect,
      totalMs: o.totalMs, wallMs: last.wallMs, blurScore: o.blurScore ?? null,
      detail: o.ok ? `rim fit ${o.rimFitMm.toFixed(2)} mm, ${o.edgeInliers}/64 rays, residual ${o.edgeResidualPx.toFixed(2)} px, axes ${o.axesRatio.toFixed(3)}; marker ${o.markerSidePx.toFixed(0)} px (${o.pxPerMm.toFixed(1)} px/mm, ≈${o.estDistanceMm.toFixed(0)} mm)` : o.detail,
    })
    if (OVERLAY_OUT) overlays[ph.file] = { ok: o.ok, overlay: o.overlay, ...(o.ok ? { diameterMm: o.diameterMm, rimFitMm: o.rimFitMm, pxPerMm: o.pxPerMm } : {}) }
    console.log(`${ph.file}: ${o.ok ? o.diameterMm.toFixed(2) + ' mm' : o.code} (pipeline ${o.totalMs.toFixed(0)} ms, wall ${last.wallMs} ms)`)
  }
} finally {
  server.kill()   // independent of browser.close(): the preview server must go down even if closing the browser throws
  try { await browser?.close() } catch { /* best effort — nothing left to report to */ }
}
const report = buildReport(rows, { recordedAt: gt.recordedAt, status: gt.status, scaleCheck: gt.scaleCheck, kit: gt.kit, engineInitMs })
writeFileSync(OUT, report.markdown)
if (OVERLAY_OUT) writeFileSync(OVERLAY_OUT, JSON.stringify(overlays))
console.log(`${OUT} written`)
console.log(report.summary)
