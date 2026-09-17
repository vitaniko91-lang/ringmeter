// Renders the BUILT screen kit (dist/screen-kit.html) on a phone-sized viewport at DPR 3, both orientations, and runs
// the real detector on the screenshot — the same three checks check-kit.ts runs on the printed sheet. Landscape is
// the natural orientation; in portrait the kit is rotated 90°, which the marker-frame geometry must absorb.
//   npm run build && tsx scripts/check-screen-kit.ts
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { loadCv } from '../src/cv/opencv'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { markerGeometry } from '../src/cv/gates'
import { measure } from '../src/cv/pipeline'
import { MARKER_MM, ZONE } from '../src/kit/kit-geometry'

const PORT = 4174, DPR = 3, PX_PER_MM_CSS = 6.1            // the kit's default before calibration
const pxPerMm = PX_PER_MM_CSS * DPR
const VIEWPORTS = { landscape: { width: 800, height: 372 }, portrait: { width: 372, height: 800 } } as const
const TICK_MM = 5, INK = 200
if (!existsSync('dist/screen-kit.html')) throw new Error('dist/screen-kit.html is missing — run `npm run build` first')
mkdirSync('testset/.cache', { recursive: true })

const server = spawn(resolve('node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'ignore', 'inherit'] })
let up = false
for (let i = 0; i < 50 && !up; i++) {
  if (server.exitCode !== null) throw new Error(`vite preview exited (port ${PORT} busy?)`)
  try { await fetch(`http://localhost:${PORT}`); up = true } catch { await new Promise((r) => setTimeout(r, 200)) }
}
if (!up) { server.kill(); throw new Error(`vite preview did not come up on :${PORT}`) }

const cv = await loadCv()
let failed = false
const report = (ok: boolean, msg: string) => { console.log(`${msg} → ${ok ? 'OK' : 'FAIL'}`); if (!ok) failed = true }
const browser = await chromium.launch()
try {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: DPR })
    await page.addInitScript((v) => localStorage.setItem('ringmeter.screen-kit.pxPerMm', String(v)), PX_PER_MM_CSS)
    await page.goto(`http://localhost:${PORT}/screen-kit.html`)
    await page.getByRole('button', { name: 'Marker' }).click()
    await page.waitForTimeout(4500)   // the toolbar auto-hides; the photo must see nothing but the kit
    const file = `testset/.cache/screen-kit-${name}.png`
    writeFileSync(file, await page.screenshot({ fullPage: false }))
    const png = PNG.sync.read(await page.screenshot())
    const image = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
    const gray = toGray(cv, image)
    const at = (x: number, y: number) => gray.ucharPtr(y, x)[0]
    console.log(`\n${name} ${png.width}×${png.height} px → ${file}`)

    const q = detectMarker(cv, gray)
    if (!q) { report(false, 'marker detected'); gray.delete(); await page.close(); continue }
    const g = markerGeometry(q)
    report(Math.abs(g.sidePx - MARKER_MM * pxPerMm) < 1.5, `marker side ${g.sidePx.toFixed(1)} px (expect ${(MARKER_MM * pxPerMm).toFixed(1)})`)

    // Zone emptiness in the marker frame: TL corner + unit vectors along the detected marker edges
    const ux = [(q[1][0] - q[0][0]) / MARKER_MM, (q[1][1] - q[0][1]) / MARKER_MM], uy = [(q[3][0] - q[0][0]) / MARKER_MM, (q[3][1] - q[0][1]) / MARKER_MM]
    let dark = 0, total = 0
    for (let my = ZONE.y; my < ZONE.y + ZONE.h; my += 0.1) for (let mx = ZONE.x; mx < ZONE.x + ZONE.w; mx += 0.1) {
      const corner = (mx < ZONE.x + TICK_MM || mx >= ZONE.x + ZONE.w - TICK_MM) && (my < ZONE.y + TICK_MM || my >= ZONE.y + ZONE.h - TICK_MM)
      if (corner) continue
      const x = Math.round(q[0][0] + ux[0] * mx + uy[0] * my), y = Math.round(q[0][1] + ux[1] * mx + uy[1] * my)
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue
      total++; if (at(x, y) < INK) dark++
    }
    report(dark === 0, `zone: ${dark} of ${total} sampled px inked outside the corner ticks`)

    const m = measure(cv, image)
    report(!m.ok && m.code === 'NO_RING', `measure(screenshot): ${m.ok ? `OK?! d = ${m.diameterMm.toFixed(2)} mm` : `${m.code} — ${m.detail}`}`)
    gray.delete(); await page.close()
  }
} finally { await browser.close(); server.kill() }
process.exit(failed ? 1 : 0)
