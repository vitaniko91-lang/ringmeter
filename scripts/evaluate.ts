// Drives the BUILT app (dist/) in headless Chromium over the photo test set and writes the results table.
//   npm run build && npm run evaluate
// Env overrides (all optional): TESTSET_DIR (photos dir, default testset/photos), GROUND_TRUTH (json, default
// testset/ground-truth.json), RESULTS_OUT (markdown, default testset/RESULTS.md).
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildReport, type EvalRow } from '../src/eval/report'

const PORT = 4173
const DIR = process.env.TESTSET_DIR ?? 'testset/photos'
const GT = process.env.GROUND_TRUTH ?? 'testset/ground-truth.json'
const OUT = process.env.RESULTS_OUT ?? 'testset/RESULTS.md'

type GroundTruth = {
  recordedAt: string; printScaleCheck: string
  objects: Record<string, { kind: string; truthMm: number | null; method?: string; uncertaintyMm?: number }>
  photos: { file: string; object: string | null; expect: string }[]
}

if (!existsSync('dist/index.html')) throw new Error('dist/ is missing — run `npm run build` first')
const gt = JSON.parse(readFileSync(GT, 'utf8')) as GroundTruth
for (const ph of gt.photos) {
  if (!existsSync(resolve(DIR, ph.file))) throw new Error(`${resolve(DIR, ph.file)} not found`)
  if (ph.object && !gt.objects[ph.object]) throw new Error(`${ph.file}: unknown object "${ph.object}"`)
}

// vite is spawned directly (not via npx) so that kill() reaches the server process itself.
const server = spawn(resolve('node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
let up = false
for (let i = 0; i < 50 && !up; i++) { try { await fetch(`http://localhost:${PORT}`); up = true } catch { await new Promise((r) => setTimeout(r, 200)) } }
if (!up) { server.kill(); throw new Error(`vite preview did not come up on :${PORT}`) }

const rows: EvalRow[] = []
let engineInitMs: number | null = null
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
try {
  browser = await chromium.launch()   // inside the try: a launch failure must still stop the preview server
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`http://localhost:${PORT}/?eval=1`)   // ?eval=1 exposes window.__ringmeter; a plain production page has no hook
  const tReady = Date.now()
  await page.waitForFunction(() => window.__ringmeter?.ready === true, undefined, { timeout: 120_000 })   // engine init is once per session and is NOT part of any photo's wall time
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
      totalMs: o.totalMs, wallMs: last.wallMs, blurScore: o.ok ? o.blurScore : null, detail: o.ok ? '' : o.detail,
    })
    console.log(`${ph.file}: ${o.ok ? o.diameterMm.toFixed(2) + ' mm' : o.code} (pipeline ${o.totalMs.toFixed(0)} ms, wall ${last.wallMs} ms)`)
  }
} finally {
  await browser?.close()
  server.kill()
}
const report = buildReport(rows, { recordedAt: gt.recordedAt, printScaleCheck: gt.printScaleCheck, engineInitMs })
writeFileSync(OUT, report.markdown)
console.log(`${OUT} written`)
console.log(report.summary)
