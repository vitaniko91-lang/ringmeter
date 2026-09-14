import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from 'pdf-lib'
import { writeFileSync } from 'node:fs'
import { loadCv } from '../src/cv/opencv'
import { markerBits } from '../src/kit/marker-bits'
import * as K from '../src/kit/kit-geometry'

// Vertical layout of the A4 sheet, mm from the top edge. Only the marker position and the zone are geometry the
// detector depends on (kit-geometry.ts); everything else is print furniture and may move.
const L = {
  title: 15, instruction: 21,
  scaleHeading: 100, coinY: 117, coinLabel: 137, bar: 146, barLabel: 151,
  gaugeHeading: 160, gaugeTop: 176, gaugeRow: 26, gaugeCol: 36,
  cutHeading: 250, cutY: 264, cutLabel: 278,
  rightMargin: 12,
} as const

const pt = (mm: number) => (mm * 72) / 25.4
const cv = await loadCv()
const bits = markerBits(cv)
const pdf = await PDFDocument.create()
pdf.setTitle('RINGMETER — Ring Kit (print at 100 %)')
const page = pdf.addPage([pt(K.SHEET.w), pt(K.SHEET.h)])
const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
const ink = rgb(0.09, 0.08, 0.07), grey = rgb(0.6, 0.6, 0.6), accent = rgb(0.05, 0.58, 0.53)
const X = (mm: number) => pt(mm), Y = (mm: number) => pt(K.SHEET.h - mm)   // mm from the top-left of the sheet
const text = (s: string, x: number, y: number, size = 8, f: PDFFont = font, color: RGB = ink) => {
  const wMm = (f.widthOfTextAtSize(s, size) * 25.4) / 72
  if (x + wMm > K.SHEET.w - L.rightMargin) throw new Error(`text runs past the right margin (${(x + wMm).toFixed(1)} mm): "${s}"`)
  page.drawText(s, { x: X(x), y: Y(y), size, font: f, color })
}
// borderColor without color → outline only (pdf-lib fills black only when neither is given)
const circle = (x: number, y: number, d: number, stroke = 0.15, color: RGB = ink) => page.drawCircle({ x: X(x), y: Y(y), size: pt(d / 2), borderWidth: pt(stroke), borderColor: color })
const line = (x0: number, y0: number, x1: number, y1: number, thickness: number, color: RGB = ink) =>
  page.drawLine({ start: { x: X(x0), y: Y(y0) }, end: { x: X(x1), y: Y(y1) }, thickness: pt(thickness), color })

// Title + print instruction
text('RING KIT', 25, L.title, 16, bold)
text('Print at 100% / Actual size. Never "Fit to page" or "Shrink to fit". Check the scale with a coin before use.', 25, L.instruction, 8)

// 1. ArUco marker 20 mm at MARKER_ON_SHEET, cell = 20/6 mm; quiet zone kept empty by layout
const o = K.MARKER_ON_SHEET, cell = K.MARKER_MM / 6
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (bits[r][c])
  page.drawRectangle({ x: X(o.x + c * cell), y: Y(o.y + (r + 1) * cell), width: pt(cell), height: pt(cell), color: ink })
text('20 mm marker — keep this white margin clear', o.x, o.y + K.MARKER_MM + K.QUIET_ZONE_MM + 3, 6, font, grey)

// 2. Ring zone: corner ticks only (nothing inside the zone)
const z = { x: o.x + K.ZONE.x, y: o.y + K.ZONE.y, w: K.ZONE.w, h: K.ZONE.h }, tick = 4
for (const [cx, cy, sx, sy] of [[z.x, z.y, 1, 1], [z.x + z.w, z.y, -1, 1], [z.x, z.y + z.h, 1, -1], [z.x + z.w, z.y + z.h, -1, -1]] as const) {
  line(cx, cy, cx + sx * tick, cy, 0.3, accent)
  line(cx, cy, cx, cy + sy * tick, 0.3, accent)
}
text('PLACE ONE RING FLAT INSIDE THESE CORNERS', z.x, z.y + z.h + 4, 7, bold, accent)

// 3. Scale check: coin circles + 100 mm bar
text('SCALE CHECK — the coin must fit the circle exactly (no white gap, no overlap)', 25, L.scaleHeading, 8, bold)
let cx = 40
for (const coin of K.COIN_CHECK) { circle(cx, L.coinY, coin.d, 0.2); text(`${coin.d.toFixed(1)} mm — ${coin.label}`, cx - 14, L.coinLabel, 6); cx += 60 }
line(25, L.bar, 25 + K.SCALE_BAR_MM, L.bar, 0.3)
for (let i = 0; i <= 10; i++) line(25 + i * 10, L.bar, 25 + i * 10, L.bar - (i % 5 ? 2 : 3.5), 0.2)
text('100 mm — if you have a ruler, it must read exactly 100', 25, L.barLabel, 6, font, grey)

// 4. Ring gauge: 15 circles, 5 per row
text('RING GAUGE — put the ring on the circles.', 25, L.gaugeHeading, 7, bold)
text('Largest circle fully visible inside the ring = lower bound; smallest circle the ring covers = upper bound.', 25, L.gaugeHeading + 4, 7)
K.GAUGE_CIRCLES_MM.forEach((d, i) => {
  const gx = 40 + (i % 5) * L.gaugeCol, gy = L.gaugeTop + Math.floor(i / 5) * L.gaugeRow
  circle(gx, gy, d); text(d.toFixed(1), gx - 3.5, gy + 13.5, 6)
})

// 5. Cut-outs
text('CUT-OUTS — cut exactly on the line; ground truth = printed diameter', 25, L.cutHeading, 7, bold)
K.CUTOUTS_MM.forEach((d, i) => { const gx = 45 + i * 40; circle(gx, L.cutY, d, 0.3); text(`cut-out ${d.toFixed(2)} mm`, gx - 9, L.cutLabel, 6) })

writeFileSync('public/ring-kit.pdf', await pdf.save())
console.log('public/ring-kit.pdf written')
