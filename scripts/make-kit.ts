import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from 'pdf-lib'
import { writeFileSync } from 'node:fs'
import { loadCv } from '../src/cv/opencv'
import { markerBits } from '../src/kit/marker-bits'
import * as K from '../src/kit/kit-geometry'
import { L } from './kit-layout'

const pt = (mm: number) => (mm * 72) / 25.4
const cv = await loadCv()
const bits = markerBits(cv)
const pdf = await PDFDocument.create()
pdf.setTitle('RINGMETER — Ring Kit (print at 100 %)')
pdf.setCreationDate(new Date('2026-09-14T00:00:00Z'))
pdf.setModificationDate(new Date('2026-09-14T00:00:00Z'))
pdf.setProducer('ringmeter make-kit')
pdf.setCreator('ringmeter')
const page = pdf.addPage([pt(K.SHEET.w), pt(K.SHEET.h)])
const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
// Pure K for the marker and every line a consumer printer must reproduce crisply; the accent is only zone furniture.
const ink = rgb(0, 0, 0), grey = rgb(0.6, 0.6, 0.6), accent = rgb(0.05, 0.58, 0.53)
const X = (mm: number) => pt(mm), Y = (mm: number) => pt(K.SHEET.h - mm)   // mm from the top-left of the sheet
const o = K.MARKER_ON_SHEET
const z = { x: o.x + K.ZONE.x, y: o.y + K.ZONE.y, w: K.ZONE.w, h: K.ZONE.h } // ring zone on the sheet, mm
const widthMm = (s: string, size: number, f: PDFFont = font) => (f.widthOfTextAtSize(s, size) * 25.4) / 72
const text = (s: string, x: number, y: number, size = 8, f: PDFFont = font, color: RGB = ink) => {
  const w = widthMm(s, size, f), top = y - size * 0.35 // the line's box: baseline y, one em (size pt ≈ size·0.35 mm) above it
  if (x + w > K.SHEET.w - L.rightMargin) throw new Error(`text runs past the right margin (${(x + w).toFixed(1)} mm): "${s}"`)
  if (x < z.x + z.w && x + w > z.x && top < z.y + z.h && y > z.y) throw new Error(`text intersects the ring zone (x ${x.toFixed(1)}–${(x + w).toFixed(1)}, y ${top.toFixed(1)}–${y.toFixed(1)} mm): "${s}"`)
  page.drawText(s, { x: X(x), y: Y(y), size, font: f, color })
}
const centred = (s: string, cx: number, y: number, size = 6, f: PDFFont = font, color: RGB = ink) => text(s, cx - widthMm(s, size, f) / 2, y, size, f, color)
// borderColor without color → outline only (pdf-lib fills black only when neither is given)
const circle = (x: number, y: number, d: number, stroke = 0.15, color: RGB = ink) => page.drawCircle({ x: X(x), y: Y(y), size: pt(d / 2), borderWidth: pt(stroke), borderColor: color })
const line = (x0: number, y0: number, x1: number, y1: number, thickness: number, color: RGB = ink) =>
  page.drawLine({ start: { x: X(x0), y: Y(y0) }, end: { x: X(x1), y: Y(y1) }, thickness: pt(thickness), color })

// Title + print instruction
text('RING KIT', 25, L.title, 16, bold)
text('Print at 100% / Actual size. Never "Fit to page" or "Shrink to fit". Check the scale with a coin before use.', 25, L.instruction, 8)

// 1. ArUco marker 20 mm at MARKER_ON_SHEET, cell = 20/6 mm; quiet zone kept empty by layout
const cell = K.MARKER_MM / 6
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (bits[r][c])
  page.drawRectangle({ x: X(o.x + c * cell), y: Y(o.y + (r + 1) * cell), width: pt(cell), height: pt(cell), color: ink })
// Caption in two short lines (≤ 28 mm) so it stays left of the zone, which starts 30 mm right of the marker origin
text('20 mm marker', o.x, L.markerCaption, 6, font, grey)
text('keep this margin clear', o.x, L.markerCaption2, 6, font, grey)

// 2. Ring zone: corner ticks only (nothing inside the zone)
const tick = 4
for (const [cx, cy, sx, sy] of [[z.x, z.y, 1, 1], [z.x + z.w, z.y, -1, 1], [z.x, z.y + z.h, 1, -1], [z.x + z.w, z.y + z.h, -1, -1]] as const) {
  line(cx, cy, cx + sx * tick, cy, 0.3, accent)
  line(cx, cy, cx, cy + sy * tick, 0.3, accent)
}
text('PLACE ONE RING FLAT INSIDE THESE CORNERS', z.x, z.y + z.h + 4, 7, bold, accent)

// 3. Scale check: coin circles + 100 mm bar
text('SCALE CHECK — the coin must fit the circle exactly (no white gap, no overlap)', 25, L.scaleHeading, 8, bold)
K.COIN_CHECK.forEach((coin, i) => { const cx = L.coinX + i * L.coinCol; circle(cx, L.coinY, coin.d, 0.2); text(`${coin.d.toFixed(1)} mm — ${coin.label}`, cx - 14, L.coinLabel, 6) })
line(25, L.bar, 25 + K.SCALE_BAR_MM, L.bar, 0.3)
for (let i = 0; i <= 10; i++) line(25 + i * 10, L.bar, 25 + i * 10, L.bar - (i % 5 ? 2 : 3.5), 0.2)
text('100 mm — if you have a ruler, it must read exactly 100', 25, L.barLabel, 6, font, grey)

// 4. Ring gauge: 15 circles, 5 per row, diameter centred under each
text('RING GAUGE — put the ring on the circles.', 25, L.gaugeHeading, 7, bold)
text('Largest circle fully visible inside the ring = lower bound; smallest circle the ring covers = upper bound.', 25, L.gaugeHeading + 4, 7)
K.GAUGE_CIRCLES_MM.forEach((d, i) => {
  const gx = L.gaugeX + (i % 5) * L.gaugeCol, gy = L.gaugeTop + Math.floor(i / 5) * L.gaugeRow
  circle(gx, gy, d); centred(d.toFixed(1), gx, gy + 13.5)
})

// 5. Cut-outs: same 0.15 mm stroke as the gauge; the printed diameter is the centreline of that stroke
text('CUT-OUTS — ground truth = printed diameter', 25, L.cutHeading, 7, bold)
K.CUTOUTS_MM.forEach((d, i) => { const gx = L.cutX + i * L.cutCol; circle(gx, L.cutY, d); centred(`cut-out ${d.toFixed(2)} mm — cut through the middle of the line`, gx, L.cutLabel) })

writeFileSync('public/ring-kit.pdf', await pdf.save({ updateFieldAppearances: false }))
console.log('public/ring-kit.pdf written')
