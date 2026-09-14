import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { loadCv } from '../src/cv/opencv'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { markerGeometry } from '../src/cv/gates'
import { MARKER_MM, MARKER_ON_SHEET } from '../src/kit/kit-geometry'

const DPI = 300, pxPerMm = DPI / 25.4
mkdirSync('testset/.cache', { recursive: true })
execSync(`pdftoppm -r ${DPI} -png -singlefile public/ring-kit.pdf testset/.cache/kit`)
const png = PNG.sync.read(readFileSync('testset/.cache/kit.png'))
const cv = await loadCv()
const gray = toGray(cv, { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height })
const q = detectMarker(cv, gray)
gray.delete()
if (!q) { console.error('FAIL: marker not detected on the rendered kit'); process.exit(1) }
const g = markerGeometry(q)
const expectSide = MARKER_MM * pxPerMm, expectX = MARKER_ON_SHEET.x * pxPerMm, expectY = MARKER_ON_SHEET.y * pxPerMm
const ok = Math.abs(g.sidePx - expectSide) < 1.5 && Math.abs(q[0][0] - expectX) < 3 && Math.abs(q[0][1] - expectY) < 3
console.log(`marker side ${g.sidePx.toFixed(1)} px (expect ${expectSide.toFixed(1)}), TL (${q[0][0].toFixed(0)}, ${q[0][1].toFixed(0)}) expect (${expectX.toFixed(0)}, ${expectY.toFixed(0)}) → ${ok ? 'OK' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
