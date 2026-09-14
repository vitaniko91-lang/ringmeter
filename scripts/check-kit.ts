import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { loadCv } from '../src/cv/opencv'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { markerGeometry } from '../src/cv/gates'
import { measure } from '../src/cv/pipeline'
import { COIN_CHECK, MARKER_MM, MARKER_ON_SHEET, ZONE } from '../src/kit/kit-geometry'
import { L } from './kit-layout'

const DPI = 300, pxPerMm = DPI / 25.4
const px = (mm: number) => Math.round(mm * pxPerMm)
const TICK_MM = 5          // corner squares excluded from the zone-emptiness count (the 4 mm accent ticks live there)
const DARK = 128           // 8-bit gray below this counts as a stroke (circle outlines, marker cells)
const INK = 200            // anything darker than paper (+ AA fringe) counts inside the zone — the grey captions print at 153
const COIN_TOL_MM = 0.1

try { execSync('which pdftoppm', { stdio: 'ignore' }) } catch {
  console.error('check-kit needs pdftoppm (poppler) to render the PDF: brew install poppler  /  apt install poppler-utils')
  process.exit(2)
}

mkdirSync('testset/.cache', { recursive: true })
execSync(`pdftoppm -r ${DPI} -png -singlefile public/ring-kit.pdf testset/.cache/kit`)
const png = PNG.sync.read(readFileSync('testset/.cache/kit.png'))
const image = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
const cv = await loadCv()
const gray = toGray(cv, image)
const at = (x: number, y: number) => gray.ucharPtr(y, x)[0]
let failed = false
const report = (ok: boolean, msg: string) => { console.log(`${msg} → ${ok ? 'OK' : 'FAIL'}`); if (!ok) failed = true }

// 1. Marker detected where the sheet says it is, at the size it says
const q = detectMarker(cv, gray)
if (!q) { console.error('FAIL: marker not detected on the rendered kit'); gray.delete(); process.exit(1) }
const g = markerGeometry(q)
const expectSide = MARKER_MM * pxPerMm, expectX = MARKER_ON_SHEET.x * pxPerMm, expectY = MARKER_ON_SHEET.y * pxPerMm
report(Math.abs(g.sidePx - expectSide) < 1.5 && Math.abs(q[0][0] - expectX) < 3 && Math.abs(q[0][1] - expectY) < 3,
  `marker side ${g.sidePx.toFixed(1)} px (expect ${expectSide.toFixed(1)}), TL (${q[0][0].toFixed(0)}, ${q[0][1].toFixed(0)}) expect (${expectX.toFixed(0)}, ${expectY.toFixed(0)})`)

// 2. Nothing printed inside the ring zone except the corner ticks
const z = { x: MARKER_ON_SHEET.x + ZONE.x, y: MARKER_ON_SHEET.y + ZONE.y, w: ZONE.w, h: ZONE.h }
let dark = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
for (let y = px(z.y); y < px(z.y + z.h); y++) for (let x = px(z.x); x < px(z.x + z.w); x++) {
  const corner = (x < px(z.x + TICK_MM) || x >= px(z.x + z.w - TICK_MM)) && (y < px(z.y + TICK_MM) || y >= px(z.y + z.h - TICK_MM))
  if (corner || at(x, y) >= INK) continue
  dark++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
}
report(dark === 0, `zone ${z.x}–${z.x + z.w} × ${z.y}–${z.y + z.h} mm: ${dark} inked px (< ${INK}) outside the corner ticks` +
  (dark ? ` (bbox x ${(minX / pxPerMm).toFixed(1)}–${(maxX / pxPerMm).toFixed(1)}, y ${(minY / pxPerMm).toFixed(1)}–${(maxY / pxPerMm).toFixed(1)} mm)` : ''))

// 3. The furniture creates no ring candidate: the empty sheet must come back as NO_RING, nothing else
const m = measure(cv, image)
report(!m.ok && m.code === 'NO_RING', `measure(render): ${m.ok ? `OK?! d = ${m.diameterMm.toFixed(2)} mm` : `${m.code} — ${m.detail}`}`)

// 4. The 27.2 mm coin circle prints at 27.2 mm: centreline diameter along the row through its centre
{
  const d = COIN_CHECK[0].d, y = px(L.coinY)
  const runs: [number, number][] = []
  let start = -1
  for (let x = px(L.coinX - d / 2 - 2); x <= px(L.coinX + d / 2 + 2); x++) {
    const ink = at(x, y) < DARK
    if (ink && start < 0) start = x
    if (!ink && start >= 0) { runs.push([start, x - 1]); start = -1 }
  }
  const dia = runs.length === 2 ? ((runs[1][0] + runs[1][1]) / 2 - (runs[0][0] + runs[0][1]) / 2) / pxPerMm : NaN
  report(runs.length === 2 && Math.abs(dia - d) <= COIN_TOL_MM,
    `coin circle ${d} mm: ${runs.length} crossings at y = ${L.coinY} mm, centreline Ø ${Number.isNaN(dia) ? '—' : dia.toFixed(2)} mm (± ${COIN_TOL_MM})`)
}

gray.delete()
process.exit(failed ? 1 : 0)
