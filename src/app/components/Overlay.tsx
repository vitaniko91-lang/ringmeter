import { useEffect, useRef } from 'react'
import type { Overlay as OverlayData } from '../../cv/types'
import type { Photo } from '../state'

export function Overlay({ photo, overlay }: { photo?: Photo; overlay: OverlayData }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c || !photo) return
    const maxW = 800, k = Math.min(1, maxW / photo.width)
    c.width = Math.round(photo.width * k); c.height = Math.round(photo.height * k)
    const ctx = c.getContext('2d')!
    ctx.drawImage(photo.bitmap, 0, 0, c.width, c.height)
    const poly = (pts: [number, number][], color: string, width: number, close = true) => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); if (close) ctx.closePath()
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke()
    }
    if (overlay.markerQuad) poly(overlay.markerQuad, '#0D9488', 3)
    if (overlay.innerBoundary) poly(overlay.innerBoundary, '#0D9488', 3)
    if (overlay.scaleBar) {
      poly(overlay.scaleBar, '#161412', 3, false)
      const [a] = overlay.scaleBar
      const fontPx = Math.max(14, Math.round(c.width / 32))   // canvas px; the canvas is shown at ≤ 416 CSS px, so 14 px would render ~6 px
      ctx.font = `600 ${fontPx}px "IBM Plex Mono", monospace`; ctx.fillStyle = '#161412'; ctx.fillText('10 mm', a[0] * k, a[1] * k - 6)
    }
  }, [photo, overlay])
  if (!photo) return null
  return <canvas ref={ref} role="img" aria-label="Photo with detected marker and inner ring boundary" className="mt-4 w-full rounded-md border border-line" />
}
