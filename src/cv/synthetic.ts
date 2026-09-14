import type { CV } from './opencv'
import type { ImageLike } from './types'
import { MARKER_MM, MARKER_ID, ZONE } from '../kit/kit-geometry'
import { grayToImageLike } from './image'

export type SyntheticOpts = {
  pxPerMm?: number          // default 12
  innerMm?: number | null   // default 17.30; null = no ring
  outerMm?: number          // default innerMm + 4
  ringGray?: number         // default 110
  tilt?: 'none' | 'mild' | 'strong'
  blurPx?: number           // odd kernel, 0 = none
  noMarker?: boolean
  extraRing?: boolean       // second ring (inner 15.0) in the zone → MULTIPLE_RINGS
}

const W = 1400, H = 900
const ORIGIN_MM = { x: 15, y: 30 }                 // marker origin on the synthetic canvas
export const SYN_RING_CENTER_MM = { x: ZONE.x + ZONE.w / 2, y: ZONE.y + ZONE.h / 2 } // (60, 10) rel. marker

function disc(cv: CV, img: any, cxPx: number, cyPx: number, rPx: number, gray: number) {
  const SH = 4, F = 1 << SH
  // OpenCV rasterises a filled AA disc ~0.6 px larger than its nominal radius; compensate so the
  // 50 % intensity crossing lands at rPx in pixel-centre coordinates. Measured on the rendered radial
  // profile (recon/iso.mjs, re-measured at the Tasks 5–7 review): with −0.5 the crossing sits at
  // +0.09…+0.10 px, with −0.6 at ≈ 0.
  cv.circle(img, new cv.Point(Math.round(cxPx * F), Math.round(cyPx * F)), Math.round((rPx - 0.6) * F), new cv.Scalar(gray), -1, cv.LINE_AA, SH)
}

export function renderSynthetic(cv: CV, o: SyntheticOpts = {}): { image: ImageLike; truthMm: number | null } {
  const P = o.pxPerMm ?? 12
  const inner = o.innerMm === undefined ? 17.3 : o.innerMm
  const img = new cv.Mat(H, W, cv.CV_8UC1, new cv.Scalar(255))
  if (!o.noMarker) {
    const dict = cv.getPredefinedDictionary(cv.DICT_4X4_50)
    const mk = new cv.Mat()
    cv.generateImageMarker(dict, MARKER_ID, Math.round(MARKER_MM * P), mk, 1)
    dict.delete()
    const dst = img.roi(new cv.Rect(Math.round(ORIGIN_MM.x * P), Math.round(ORIGIN_MM.y * P), mk.cols, mk.rows))
    mk.copyTo(dst)
    dst.delete(); mk.delete()
  }
  const ring = (cxMm: number, cyMm: number, innerMm: number) => {
    const outer = o.outerMm ?? innerMm + 4
    disc(cv, img, (ORIGIN_MM.x + cxMm) * P, (ORIGIN_MM.y + cyMm) * P, (outer / 2) * P, o.ringGray ?? 110)
    disc(cv, img, (ORIGIN_MM.x + cxMm) * P, (ORIGIN_MM.y + cyMm) * P, (innerMm / 2) * P, 255)
  }
  if (inner !== null) ring(SYN_RING_CENTER_MM.x, SYN_RING_CENTER_MM.y, inner)
  if (o.extraRing) ring(SYN_RING_CENTER_MM.x + 22, SYN_RING_CENTER_MM.y + 18, 15.0)

  let out = img
  if (o.tilt && o.tilt !== 'none') {
    const src = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H])
    const dstPts = o.tilt === 'mild' ? [30, 20, W - 10, 5, W - 40, H - 15, 15, H - 30] : [40, 140, W - 40, 20, W - 40, H - 20, 40, H - 140] // strong: x-scale ≈ 0.94, y-scale ≈ 0.7 at the marker → side ratio < 0.97
    const dst = cv.matFromArray(4, 1, cv.CV_32FC2, dstPts)
    const M = cv.getPerspectiveTransform(src, dst)
    out = new cv.Mat()
    cv.warpPerspective(img, out, M, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255))
    src.delete(); dst.delete(); M.delete(); img.delete()
  }
  if (o.blurPx) cv.GaussianBlur(out, out, new cv.Size(o.blurPx, o.blurPx), 0)
  const image = grayToImageLike(cv, out)
  out.delete()
  return { image, truthMm: inner }
}
