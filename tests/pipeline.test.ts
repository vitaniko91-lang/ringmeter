import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadCv, type CV } from '../src/cv/opencv'
import { renderSynthetic } from '../src/cv/synthetic'
import { toGray, grayToImageLike } from '../src/cv/image'
import { detectMarker } from '../src/cv/marker'
import { measure, blurScore, preBlurSigma, canonFootprint, DETECT_MAX_SIDE } from '../src/cv/pipeline'
import { SYN_RING_CENTER_MM } from '../src/cv/synthetic'

let cv: CV
beforeAll(async () => { cv = await loadCv() })

describe('measure()', () => {
  it('measures a 17.30 mm ring within 0.1 mm and reports sizes, timings, overlay', () => {
    const o = measure(cv, renderSynthetic(cv, { tilt: 'mild', blurPx: 5 }).image)
    if (!o.ok) throw new Error(`rejected: ${o.code} ${o.detail}`)
    expect(Math.abs(o.diameterMm - 17.3)).toBeLessThan(0.1)
    expect(o.sizes.nominal).toEqual({ eu: 54.5, us: 7, uk: 'N½' })
    expect(o.sigmaMm).toBeGreaterThan(0); expect(o.sigmaMm).toBeLessThan(0.6)
    expect(Object.keys(o.timings)).toEqual(['decode', 'marker', 'gates', 'rectify', 'ring', 'result'])
    expect(o.overlay.innerBoundary).toHaveLength(64)
    expect(o.overlay.markerQuad).toHaveLength(4)
    expect(o.totalMs).toBeLessThan(3000)
    expect(o.edgeInliers).toBeGreaterThanOrEqual(48)
    expect(o.edgeResidualPx).toBeLessThan(0.6)
  })
  it('measures the default synthetic (12 px/mm, ratio 1.2 → no pre-blur) within 0.1 mm', () => {
    const o = measure(cv, renderSynthetic(cv).image)
    if (!o.ok) throw new Error(`rejected: ${o.code} ${o.detail}`)
    expect(Math.abs(o.diameterMm - 17.3)).toBeLessThan(0.1)
  })
  it('takes the pre-blur + downscaled-detection path on a 24 px/mm source and still measures within 0.1 mm', () => {
    // 2× bicubic upscale of the default sheet: 2800 × 1800 px, marker ≈ 480 px → pxPerMm ≈ 24 (σ = 1.2), longest side > DETECT_MAX_SIDE
    const g = toGray(cv, renderSynthetic(cv).image), big = new cv.Mat()
    cv.resize(g, big, new cv.Size(0, 0), 2, 2, cv.INTER_CUBIC)
    const image = grayToImageLike(cv, big); g.delete(); big.delete()
    expect(Math.max(image.width, image.height)).toBeGreaterThan(DETECT_MAX_SIDE)
    const o = measure(cv, image)
    if (!o.ok) throw new Error(`rejected: ${o.code} ${o.detail}`)
    expect(o.pxPerMm).toBeGreaterThan(15)
    expect(preBlurSigma(o.pxPerMm)).toBeGreaterThan(0)
    expect(Math.abs(o.diameterMm - 17.3)).toBeLessThan(0.1)
    expect(o.overlay.markerQuad[0][0]).toBeCloseTo(2 * 179.5, 0) // corners mapped back to full resolution
  })
  it('NO_MARKER without a marker', () => expect(measure(cv, renderSynthetic(cv, { noMarker: true }).image)).toMatchObject({ ok: false, code: 'NO_MARKER' }))
  it('NO_RING with an empty zone', () => expect(measure(cv, renderSynthetic(cv, { innerMm: null }).image)).toMatchObject({ ok: false, code: 'NO_RING' }))
  it('MULTIPLE_RINGS with two rings', () => expect(measure(cv, renderSynthetic(cv, { extraRing: true }).image)).toMatchObject({ ok: false, code: 'MULTIPLE_RINGS' }))
  it('TILT under strong perspective', () => expect(measure(cv, renderSynthetic(cv, { tilt: 'strong' }).image)).toMatchObject({ ok: false, code: 'TILT' }))
  it('rejects a heavily blurred photo (BLUR, or NO_MARKER if the marker itself is lost)', () => {
    const o = measure(cv, renderSynthetic(cv, { blurPx: 21 }).image)
    expect(o.ok).toBe(false); if (!o.ok) expect(['BLUR', 'NO_MARKER']).toContain(o.code)
  })
  it('TOO_FAR on a tiny sheet', () => expect(measure(cv, renderSynthetic(cv, { pxPerMm: 6 }).image)).toMatchObject({ ok: false, code: 'TOO_FAR' }))
  it('EDGE_UNCLEAR when a shadow crescent displaces part of the inner rim', () => {
    // A 120° dark arc 2.5 px inside the true rim (thickness 3, gray 140) keeps the hole's outer contour
    // circular — the coarse blob survives — but the rays inside the arc lock onto the shadow's edge instead
    // of the rim, ~3 canonical px short of it, which MAD alone cannot clean up.
    const { image } = renderSynthetic(cv)
    const gray = toGray(cv, image)
    const cx = (15 + 60) * 12 - 0.5, cy = (30 + 10) * 12 - 0.5 // ring centre, source px (origin 15,30 mm; centre 60,10 mm; 12 px/mm)
    const rIn = (17.3 / 2) * 12 // inner rim radius, source px
    cv.ellipse(gray, new cv.Point(cx, cy), new cv.Size(rIn - 2.5, rIn - 2.5), 0, 0, 120, new cv.Scalar(140), 3, cv.LINE_AA)
    const o = measure(cv, grayToImageLike(cv, gray))
    gray.delete()
    expect(o.ok).toBe(false)
    if (!o.ok) { expect(o.code).toBe('EDGE_UNCLEAR'); expect(o.overlay.innerBoundary).toHaveLength(64) }
  })
  it('every reject carries the full timings prefix up to the failing stage', () => {
    const o = measure(cv, renderSynthetic(cv, { innerMm: null }).image)
    expect(o.ok).toBe(false)
    expect(Object.keys(o.timings)).toEqual(['decode', 'marker', 'gates', 'rectify', 'ring'])
    expect(o.overlay.markerQuad).toHaveLength(4)
  })
  it('converts an OpenCV integer throw into a reject', () => {
    const spy = vi.spyOn(cv, 'adaptiveThreshold').mockImplementationOnce(() => { throw 42 })
    try {
      const o = measure(cv, renderSynthetic(cv).image)
      expect(o.ok).toBe(false)
      if (!o.ok) { expect(o.code).toBe('INTERNAL_ERROR'); expect(o.detail).toContain('internal error'); expect(o.overlay.markerQuad).toHaveLength(4) }
    } finally { spy.mockRestore() }
  })
})

describe('blurScore', () => {
  it('drops by more than 5× between sharp and blurred', () => {
    const sharp = toGray(cv, renderSynthetic(cv).image), soft = toGray(cv, renderSynthetic(cv, { blurPx: 15 }).image)
    const s = blurScore(cv, sharp, detectMarker(cv, sharp)!), b = blurScore(cv, soft, detectMarker(cv, soft)!)
    expect(s).toBeGreaterThan(5 * b)
    sharp.delete(); soft.delete()
  })
})

describe('canonFootprint', () => {
  it('covers the marker and the ring centre, stays inside the image, and is smaller than the frame', () => {
    const gray = toGray(cv, renderSynthetic(cv).image)
    const quad = detectMarker(cv, gray)!
    const fp = canonFootprint(cv, quad, gray.cols, gray.rows, 5)
    gray.delete()
    expect(fp.x).toBeGreaterThanOrEqual(0); expect(fp.y).toBeGreaterThanOrEqual(0)
    expect(fp.x + fp.w).toBeLessThanOrEqual(1400); expect(fp.y + fp.h).toBeLessThanOrEqual(900)
    for (const [x, y] of quad) { expect(x).toBeGreaterThan(fp.x); expect(x).toBeLessThan(fp.x + fp.w); expect(y).toBeGreaterThan(fp.y); expect(y).toBeLessThan(fp.y + fp.h) }
    const ring = { x: (15 + SYN_RING_CENTER_MM.x) * 12, y: (30 + SYN_RING_CENTER_MM.y) * 12 } // synthetic origin (15, 30) mm at 12 px/mm
    expect(ring.x).toBeGreaterThan(fp.x); expect(ring.x).toBeLessThan(fp.x + fp.w); expect(ring.y).toBeGreaterThan(fp.y); expect(ring.y).toBeLessThan(fp.y + fp.h)
    expect(fp.w * fp.h).toBeLessThan(1400 * 900)
  })
})

describe('preBlurSigma', () => {
  it('is 0 up to 15 px/mm and 0.5·pxPerMm/10 above', () => {
    expect(preBlurSigma(8)).toBe(0)
    expect(preBlurSigma(12)).toBe(0)
    expect(preBlurSigma(15)).toBe(0)
    expect(preBlurSigma(16)).toBeCloseTo(0.8, 6)
    expect(preBlurSigma(24)).toBeCloseTo(1.2, 6)
    expect(preBlurSigma(40)).toBeCloseTo(2.0, 6)
  })
})
