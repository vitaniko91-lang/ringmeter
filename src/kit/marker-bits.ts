import type { CV } from '../cv/opencv'
import { MARKER_ID } from './kit-geometry'
/** 6×6 cells (4×4 payload + 1-cell black border); true = black. Same generator the detector uses. */
export function markerBits(cv: CV): boolean[][] {
  const dict = cv.getPredefinedDictionary(cv.DICT_4X4_50)
  const mk = new cv.Mat()
  try {
    cv.generateImageMarker(dict, MARKER_ID, 6, mk, 1)
    const bits: boolean[][] = []
    for (let r = 0; r < 6; r++) { const row: boolean[] = []; for (let c = 0; c < 6; c++) row.push(mk.ucharPtr(r, c)[0] < 128); bits.push(row) }
    return bits
  } finally { mk.delete(); dict.delete() }
}
/**
 * The same 6×6 pattern as a constant, for renderers that must not load OpenCV (the on-screen kit runs on a spare
 * phone). tests/marker-bits.test.ts asserts it equals markerBits(cv), so it cannot drift from the detector's dictionary.
 */
export const MARKER_BITS: readonly (readonly boolean[])[] = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 0, 1],
  [1, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1],
].map((r) => r.map((b) => b === 1))
