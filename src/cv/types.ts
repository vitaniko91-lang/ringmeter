export type Pt = [number, number]
export type Quad = [Pt, Pt, Pt, Pt]           // TL, TR, BR, BL in source-image px
export type ImageLike = { data: Uint8ClampedArray; width: number; height: number } // RGBA
export type Timings = Record<string, number>

export type RejectCode = 'BAD_FILE' | 'NO_MARKER' | 'TOO_FAR' | 'TILT' | 'BLUR' | 'NO_RING' | 'MULTIPLE_RINGS' | 'ELLIPTIC'

export const REJECT_HINT: Record<RejectCode, string> = {
  BAD_FILE: 'This file could not be decoded. Use a JPEG or PNG photo.',
  NO_MARKER: 'The 20 mm marker was not found. Keep the whole marker in the frame, flat and unobstructed.',
  TOO_FAR: 'Move closer — the marker must be at least ~1 cm wide on your screen (15–25 cm from the sheet).',
  TILT: 'The sheet looks tilted. Hold the phone parallel to the sheet, directly above it.',
  BLUR: 'The photo is blurry. Tap to focus on the ring, hold still, and shoot again.',
  NO_RING: 'No ring found inside the dashed zone. Place one ring flat inside the zone, not on the marker.',
  MULTIPLE_RINGS: 'More than one ring-like object is in the zone. Keep exactly one ring.',
  ELLIPTIC: 'The ring looks tilted (oval). Shoot from directly above.',
}

export type SizeReading = { eu: number; us: number; uk: string }

export type Overlay = { markerQuad?: Quad; innerBoundary?: Pt[]; scaleBar?: [Pt, Pt] }

export type MeasureResult = {
  ok: true
  diameterMm: number
  sigmaMm: number
  sigmaParts: { px: number; marker: number; parallax: number }
  axesRatio: number
  tiltDeg: number
  pxPerMm: number
  markerSidePx: number
  estDistanceMm: number
  blurScore: number
  sizes: { nominal: SizeReading; low: SizeReading; high: SizeReading; spans: boolean }
  overlay: Required<Overlay>
  timings: Timings
  totalMs: number
}

export type Reject = {
  ok: false
  code: RejectCode
  hint: string
  detail: string
  overlay: Overlay
  timings: Timings
  totalMs: number
}

export type Outcome = MeasureResult | Reject
