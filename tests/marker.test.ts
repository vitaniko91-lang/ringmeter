import { describe, it, expect, beforeAll } from 'vitest'
import { loadCv, type CV } from '../src/cv/opencv'
import { renderSynthetic } from '../src/cv/synthetic'
import { toGray } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { markerGeometry } from '../src/cv/gates'

let cv: CV
beforeAll(async () => { cv = await loadCv() })

describe('marker detection', () => {
  it('finds id 0 on a flat synthetic sheet with ~240 px side', () => {
    const gray = toGray(cv, renderSynthetic(cv).image)
    const q = detectMarker(cv, gray); gray.delete()
    expect(q).not.toBeNull()
    expect(markerGeometry(q!).sidePx).toBeCloseTo(240, 0)
  })
  it('still finds it under mild perspective and blur', () => {
    const gray = toGray(cv, renderSynthetic(cv, { tilt: 'mild', blurPx: 5 }).image)
    expect(detectMarker(cv, gray)).not.toBeNull(); gray.delete()
  })
  it('returns null when there is no marker', () => {
    const gray = toGray(cv, renderSynthetic(cv, { noMarker: true }).image)
    expect(detectMarker(cv, gray)).toBeNull(); gray.delete()
  })
  it('returns null when two sheets (two id-0 markers) are in the frame', () => {
    const gray = toGray(cv, renderSynthetic(cv).image)
    const two = new cv.Mat(gray.rows, 2 * gray.cols, cv.CV_8UC1, new cv.Scalar(255)) // 2800 × 900
    for (const x of [0, gray.cols]) { const dst = two.roi(new cv.Rect(x, 0, gray.cols, gray.rows)); gray.copyTo(dst); dst.delete() }
    gray.delete()
    expect(detectMarker(cv, two)).toBeNull(); two.delete()
  })
})
