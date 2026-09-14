import { useLayoutEffect, useRef } from 'react'
import type { Overlay as OverlayData, Photo } from '../../cv/types'

const MAX_W = 800
// Read once per page: the palette lives in index.css (@theme); the hex fallbacks mirror it.
let palette: { accent: string; ink: string } | null = null
const colors = () => {
  if (palette) return palette
  const css = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return (palette = { accent: read('--color-accent', '#0D9488'), ink: read('--color-ink', '#161412') })
}

export function Overlay({ photo, overlay }: { photo?: Photo; overlay: OverlayData }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const k = photo ? Math.min(1, MAX_W / photo.width) : 1
  const w = photo ? Math.round(photo.width * k) : 0, h = photo ? Math.round(photo.height * k) : 0
  useLayoutEffect(() => {
    const c = ref.current; if (!c || !photo) return
    const ctx = c.getContext('2d')!
    const { accent, ink } = colors()
    ctx.drawImage(photo.bitmap, 0, 0, w, h)
    const poly = (pts: [number, number][], color: string, width: number, close = true) => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); if (close) ctx.closePath()
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke()
    }
    if (overlay.markerQuad) poly(overlay.markerQuad, accent, 3)
    if (overlay.innerBoundary) poly(overlay.innerBoundary, accent, 3)
    if (overlay.scaleBar) {
      poly(overlay.scaleBar, ink, 3, false)
      const [a] = overlay.scaleBar
      const fontPx = Math.max(14, Math.round(w / 32))   // canvas px; the canvas is shown at ≤ 416 CSS px, so 14 px would render ~6 px
      ctx.font = `600 ${fontPx}px "IBM Plex Mono", monospace`; ctx.fillStyle = ink; ctx.fillText('10 mm', a[0] * k, a[1] * k - 6)
    }
  }, [photo, overlay, k, w, h])
  if (!photo) return null
  const drawn = [overlay.markerQuad && 'the detected marker', overlay.innerBoundary && 'the inner ring boundary'].filter(Boolean)
  const label = drawn.length ? `Photo with ${drawn.join(' and ')}` : 'Photo'
  return <canvas ref={ref} width={w} height={h} role="img" aria-label={label} className="mt-4 w-full rounded-md border border-line" />
}
