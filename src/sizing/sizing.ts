import type { SizeReading } from '../cv/types'

export const SIZING_SOURCE = {
  name: 'ISO 8653:2016 (EU/ISO = inner circumference in mm) with US and UK/AU columns from the comparison table in Wikipedia “Ring size”',
  url: 'https://en.wikipedia.org/wiki/Ring_size',
  formulas: {
    eu: 'EU = π × d (mm)',
    us: 'US size s: circumference C = 2.55 × s + 36.5 mm → s = (C − 36.5) / 2.55',
    uk: 'UK/AU index i: circumference C = 37.5 + 1.25 × i (size C = 40 mm; A = 0 … Z = 25); half sizes = +0.5 index',
  },
  rounding: 'Each scale is rounded to the nearest half size. When the ±σ band crosses a size boundary both sizes are shown.',
}

export const roundHalf = (v: number) => Math.round(v * 2) / 2
export const circumferenceMm = (d: number) => Math.PI * d

export function euSize(d: number) { return roundHalf(circumferenceMm(d)) }
export function usSize(d: number) { return roundHalf((circumferenceMm(d) - 36.5) / 2.55) }
export function ukSize(d: number): string {
  const idx = Math.min(25.5, Math.max(0, roundHalf((circumferenceMm(d) - 37.5) / 1.25)))
  const letter = String.fromCharCode(65 + Math.floor(idx))
  return idx % 1 === 0 ? letter : `${letter}½`
}
export function sizesFor(d: number): SizeReading { return { eu: euSize(d), us: usSize(d), uk: ukSize(d) } }

export function sizeRange(d: number, sigma: number) {
  const nominal = sizesFor(d), low = sizesFor(d - sigma), high = sizesFor(d + sigma)
  const spans = low.eu !== high.eu || low.us !== high.us || low.uk !== high.uk
  return { nominal, low, high, spans }
}
