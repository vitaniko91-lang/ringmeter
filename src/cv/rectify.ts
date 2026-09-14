import type { CV } from './opencv'
import type { Pt, Quad } from './types'
import { CANON_SIZE_PX, MARKER_CANON_PX } from '../kit/kit-geometry'

export type Rectified = { canon: any; H: any; Hinv: any; delete(): void }

/** Warp the source gray image so the marker lands on MARKER_CANON_PX (10 px/mm). */
export function rectify(cv: CV, gray: any, quad: Quad): Rectified {
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flat())
  const dst = cv.matFromArray(4, 1, cv.CV_32FC2, MARKER_CANON_PX.flatMap((p) => [p.x, p.y]))
  const H = cv.getPerspectiveTransform(src, dst)
  const canon = new cv.Mat()
  cv.warpPerspective(gray, canon, H, new cv.Size(CANON_SIZE_PX.w, CANON_SIZE_PX.h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255))
  const Hinv = new cv.Mat()
  cv.invert(H, Hinv, cv.DECOMP_LU)
  src.delete(); dst.delete()
  return { canon, H, Hinv, delete() { canon.delete(); H.delete(); Hinv.delete() } }
}

/** Map canonical px points back to source-image px. */
export function canonToSource(cv: CV, Hinv: any, pts: Pt[]): Pt[] {
  const src = cv.matFromArray(pts.length, 1, cv.CV_32FC2, pts.flat())
  const dst = new cv.Mat()
  cv.perspectiveTransform(src, dst, Hinv)
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) out.push([dst.data32F[i * 2], dst.data32F[i * 2 + 1]])
  src.delete(); dst.delete()
  return out
}
