import type { CV } from './opencv'
import type { ImageLike } from './types'

export function toGray(cv: CV, img: ImageLike) {
  const rgba = cv.matFromImageData(img)
  const gray = new cv.Mat()
  cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY)
  rgba.delete()
  return gray
}
export function grayToImageLike(cv: CV, gray: any): ImageLike {
  const rgba = new cv.Mat()
  cv.cvtColor(gray, rgba, cv.COLOR_GRAY2RGBA)
  const out = { data: new Uint8ClampedArray(rgba.data), width: rgba.cols, height: rgba.rows }
  rgba.delete()
  return out
}
/** Bilinear sample with edge clamping on an 8-bit single-channel Mat. */
export function sampleBilinear(gray: any, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const p = (xx: number, yy: number) => gray.ucharPtr(Math.min(Math.max(yy, 0), gray.rows - 1), Math.min(Math.max(xx, 0), gray.cols - 1))[0]
  return (1 - fx) * (1 - fy) * p(x0, y0) + fx * (1 - fy) * p(x0 + 1, y0) + (1 - fx) * fy * p(x0, y0 + 1) + fx * fy * p(x0 + 1, y0 + 1)
}
