// Every value is millimetres on the printed sheet unless suffixed _PX.
// Origin (0,0) = top-left corner of the marker's black border. +x right, +y down.
export const MARKER_MM = 20
export const MARKER_ID = 0            // ArUco DICT_4X4_50
export const QUIET_ZONE_MM = 4        // white margin required around the marker
export const ZONE = { x: 30, y: -20, w: 60, h: 60 } as const   // ring placement zone
export const RING_DIAMETER_MM = { min: 12, max: 26 } as const
export const GAUGE_CIRCLES_MM = Array.from({ length: 15 }, (_, i) => 15 + i * 0.5)
export const CUTOUTS_MM = [16.5, 18.0] as const
export const COIN_CHECK = [
  { label: 'Rp 500 aluminium (2003 / 2016)', d: 27.2 },
  { label: 'Rp 500 aluminium-bronze (1991–2003)', d: 24.0 },
] as const
export const SCALE_BAR_MM = 100
export const SHEET = { w: 210, h: 297 } as const          // A4 portrait
export const MARKER_ON_SHEET = { x: 25, y: 45 } as const   // where the marker origin sits on the sheet

// Canonical rectified frame: CANON_PX_PER_MM px per mm, covering CANON_ORIGIN_MM … +CANON_SIZE_MM
export const CANON_PX_PER_MM = 10
export const CANON_ORIGIN_MM = { x: -5, y: -25 } as const
export const CANON_SIZE_MM = { w: 100, h: 70 } as const
export const CANON_SIZE_PX = { w: CANON_SIZE_MM.w * CANON_PX_PER_MM, h: CANON_SIZE_MM.h * CANON_PX_PER_MM } as const

export function mmToCanon(p: { x: number; y: number }) {
  return { x: (p.x - CANON_ORIGIN_MM.x) * CANON_PX_PER_MM, y: (p.y - CANON_ORIGIN_MM.y) * CANON_PX_PER_MM }
}
export function canonToMm(p: { x: number; y: number }) {
  return { x: p.x / CANON_PX_PER_MM + CANON_ORIGIN_MM.x, y: p.y / CANON_PX_PER_MM + CANON_ORIGIN_MM.y }
}
/** Marker corners in canonical px, ArUco order: TL, TR, BR, BL. */
export const MARKER_CANON_PX = [
  mmToCanon({ x: 0, y: 0 }), mmToCanon({ x: MARKER_MM, y: 0 }),
  mmToCanon({ x: MARKER_MM, y: MARKER_MM }), mmToCanon({ x: 0, y: MARKER_MM }),
] as const
/** Ring zone rectangle in canonical px. */
export const ZONE_CANON_PX = (() => {
  const tl = mmToCanon({ x: ZONE.x, y: ZONE.y })
  return { x: tl.x, y: tl.y, w: ZONE.w * CANON_PX_PER_MM, h: ZONE.h * CANON_PX_PER_MM }
})()
