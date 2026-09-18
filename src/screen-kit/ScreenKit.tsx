import { useEffect, useRef, useState } from 'react'
import { MARKER_BITS } from '../kit/marker-bits'
import { COIN_CHECK, MARKER_MM, QUIET_ZONE_MM, RING_DIAMETER_MM, ZONE } from '../kit/kit-geometry'

// The Ring Kit shown on a spare phone instead of printed. Every geometry value is millimetres on the glass; one
// calibrated factor (CSS px per mm) turns them into pixels. The detector sees the same 20 mm ArUco marker and the same
// ring zone as on paper (src/kit/kit-geometry.ts), so the measuring app is unchanged.

/** ISO/IEC 7810 ID-1 — every bank / ID / SIM-holder card. Its long edge is the most precise reference a phone owner has at hand. */
const CARD = { w: 85.6, h: 53.98, r: 3.18 } as const
const COIN = COIN_CHECK[0]
const STORAGE_KEY = 'ringmeter.screen-kit.pxPerMm'
const DEFAULT_PX_PER_MM = 6.1            // a typical phone: ≈410 CSS px across ≈66 mm of glass. Calibration replaces it.
const SCALE_RANGE = { min: 3, max: 15 } as const
const KIT = { x: -QUIET_ZONE_MM, y: ZONE.y, w: ZONE.x + ZONE.w + QUIET_ZONE_MM, h: ZONE.h } as const   // extent around the marker origin, mm
const GAUGE_STEP = { coarse: 0.5, fine: 0.1 } as const
const CHROME_HIDE_MS = 4000

type View = 'calibrate' | 'marker' | 'gauge' | 'blank'
const VIEWS: { id: View; label: string }[] = [
  { id: 'calibrate', label: 'Calibrate' }, { id: 'marker', label: 'Marker' }, { id: 'gauge', label: 'Gauge' }, { id: 'blank', label: 'Blank' },
]

function loadScale(): number | null {
  try { const v = Number(localStorage.getItem(STORAGE_KEY)); return v >= SCALE_RANGE.min && v <= SCALE_RANGE.max ? v : null } catch { return null }
}
function saveScale(v: number) { try { localStorage.setItem(STORAGE_KEY, String(v)) } catch { /* private mode: this session still works */ } }

function useMedia(query: string) {
  const [m, setM] = useState(() => matchMedia(query).matches)
  useEffect(() => { const mq = matchMedia(query); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on) }, [query])
  return m
}
/** Pinch-zoom multiplies every CSS px: the marker would no longer be 20 mm. We never block zoom (a11y) — we warn. */
function useZoomed() {
  const [z, setZ] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return
    const on = () => setZ(Math.abs(vv.scale - 1) > 0.01); on()
    vv.addEventListener('resize', on); return () => vv.removeEventListener('resize', on)
  }, [])
  return z
}
/** The glass must not go dark mid-photo. Re-requested when the tab returns, since the OS releases the lock on hide. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => { try { lock = (await navigator.wakeLock?.request('screen')) ?? null } catch { /* unsupported or denied: the user keeps the screen awake by hand */ } }
    const onVis = () => { if (document.visibilityState === 'visible') void request() }
    void request(); document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); void lock?.release() }
  }, [])
}

/** The ArUco marker, drawn on a canvas at integer device pixels per cell edge so no seam or anti-aliased fringe appears. */
function Marker({ s, x, y }: { s: number; x: number; y: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const css = MARKER_MM * s, dpr = devicePixelRatio || 1, px = Math.round(css * dpr)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px); ctx.fillStyle = '#000'
    const edge = (i: number) => Math.round((i * px) / 6)
    MARKER_BITS.forEach((row, r) => row.forEach((black, col) => { if (black) ctx.fillRect(edge(col), edge(r), edge(col + 1) - edge(col), edge(r + 1) - edge(r)) }))
  }, [px])
  return <canvas ref={ref} width={px} height={px} aria-label={`${MARKER_MM} mm ArUco marker`} style={{ position: 'absolute', left: x, top: y, width: css, height: css }} />
}

/** Ring zone corner ticks, as on the printed sheet: nothing else may be drawn inside the zone. */
function ZoneTicks({ s, x, y }: { s: number; x: number; y: number }) {
  const tick = 4 * s, w = Math.max(1, 0.3 * s), color = 'var(--color-accent)'
  const z = { x: x + ZONE.x * s, y: y + ZONE.y * s, w: ZONE.w * s, h: ZONE.h * s }
  const corners = [[z.x, z.y, 1, 1], [z.x + z.w, z.y, -1, 1], [z.x, z.y + z.h, 1, -1], [z.x + z.w, z.y + z.h, -1, -1]] as const
  return <>{corners.map(([cx, cy, sx, sy], i) => (
    <span key={i} aria-hidden="true">
      <span style={{ position: 'absolute', background: color, left: sx > 0 ? cx : cx - tick, top: sy > 0 ? cy : cy - w, width: tick, height: w }} />
      <span style={{ position: 'absolute', background: color, left: sx > 0 ? cx : cx - w, top: sy > 0 ? cy : cy - tick, width: w, height: tick }} />
    </span>
  ))}</>
}

const hairline = () => 1 / (devicePixelRatio || 1)

export default function ScreenKit() {
  const [scale, setScale] = useState(() => loadScale())
  const s = scale ?? DEFAULT_PX_PER_MM
  const [view, setView] = useState<View>(() => (loadScale() ? 'marker' : 'calibrate'))
  const [gauge, setGauge] = useState(18)
  const [chrome, setChrome] = useState(true)
  const portrait = useMedia('(orientation: portrait)')
  const zoomed = useZoomed()
  useWakeLock()

  const instrument = view !== 'calibrate'
  useEffect(() => {
    if (!instrument || !chrome) return
    const t = setTimeout(() => setChrome(false), CHROME_HIDE_MS); return () => clearTimeout(t)
  }, [instrument, chrome, view])
  const bump = (factor: number) => { const v = Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, s * factor)); setScale(v); saveScale(v) }
  const step = (d: number) => setGauge((g) => Math.round(Math.min(RING_DIAMETER_MM.max, Math.max(RING_DIAMETER_MM.min, g + d)) * 10) / 10)
  const fullscreen = () => void document.documentElement.requestFullscreen?.().catch(() => { /* iOS Safari: no page fullscreen; the kit still works */ })

  const toolbar = (
    <div className={`fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 px-3 py-2 text-sm transition-opacity ${instrument && !chrome ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-hidden={instrument && !chrome}>
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" onClick={() => { setView(v.id); setChrome(true) }} aria-pressed={view === v.id}
            className={`min-h-10 rounded-md px-3 font-semibold ${view === v.id ? 'bg-ink text-paper' : 'border border-line'}`}>{v.label}</button>
        ))}
        <button type="button" onClick={fullscreen} className="min-h-10 rounded-md border border-line px-3">Fullscreen</button>
        <span className="num ml-auto text-xs text-muted">{s.toFixed(2)} px/mm{scale ? '' : ' · not calibrated'}</span>
      </div>
    </div>
  )
  const zoomBanner = zoomed && (
    <p role="alert" className="fixed inset-x-0 top-0 z-20 bg-error px-4 py-2 text-center text-sm font-semibold text-white">Page is pinch-zoomed — every size is wrong. Zoom back out to 100 %.</p>
  )

  if (view === 'calibrate') {
    // One long edge of the card is the reference: a bar of CARD.w with end ticks, horizontal on a landscape screen,
    // vertical on a portrait one (85.6 mm does not fit across a phone). The coin circle is the no-card fallback.
    const hl = hairline(), bar = CARD.w * s, tick = 6 * s, pad = 4 * s
    const barSvg = portrait
      ? <svg className="shrink-0" width={tick + pad * 2} height={bar + pad * 2} aria-label={`card long edge ${CARD.w} mm, vertical`}>
          <line x1={pad + tick / 2} y1={pad} x2={pad + tick / 2} y2={pad + bar} stroke="#000" strokeWidth={hl} />
          <line x1={pad} y1={pad} x2={pad + tick} y2={pad} stroke="#000" strokeWidth={Math.max(1, 0.3 * s)} />
          <line x1={pad} y1={pad + bar} x2={pad + tick} y2={pad + bar} stroke="#000" strokeWidth={Math.max(1, 0.3 * s)} />
        </svg>
      : <svg className="shrink-0" width={bar + pad * 2} height={tick + pad * 2} aria-label={`card long edge ${CARD.w} mm, horizontal`}>
          <line x1={pad} y1={pad + tick / 2} x2={pad + bar} y2={pad + tick / 2} stroke="#000" strokeWidth={hl} />
          <line x1={pad} y1={pad} x2={pad} y2={pad + tick} stroke="#000" strokeWidth={Math.max(1, 0.3 * s)} />
          <line x1={pad + bar} y1={pad} x2={pad + bar} y2={pad + tick} stroke="#000" strokeWidth={Math.max(1, 0.3 * s)} />
        </svg>
    const coinSvg = (
      <svg className="shrink-0" width={(COIN.d + 4) * s} height={(COIN.d + 4) * s} aria-label={`coin circle ${COIN.d} mm`}>
        <circle cx="50%" cy="50%" r={(COIN.d / 2) * s} fill="none" stroke="#000" strokeWidth={hl} />
      </svg>
    )
    const controls = (
      <div className="flex min-w-0 flex-col gap-2">
        {/* Slider for the coarse fit (the default can be 20 % off on an old phone), buttons for the last 0.2 % */}
        <label className="flex items-center gap-3 text-xs text-muted">
          <span className="whitespace-nowrap">smaller</span>
          <input type="range" min={SCALE_RANGE.min} max={SCALE_RANGE.max} step={0.01} value={s} aria-label="scale, CSS px per mm"
            onChange={(e) => { const v = Number(e.target.value); setScale(v); saveScale(v) }} className="w-full accent-accent" />
          <span className="whitespace-nowrap">bigger</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => bump(1 / 1.01)} className="min-h-11 min-w-14 rounded-md border border-line text-sm font-semibold">−1 %</button>
          <button type="button" onClick={() => bump(1 / 1.002)} className="min-h-11 min-w-14 rounded-md border border-line text-sm">−0.2 %</button>
          <button type="button" onClick={() => bump(1.002)} className="min-h-11 min-w-14 rounded-md border border-line text-sm">+0.2 %</button>
          <button type="button" onClick={() => bump(1.01)} className="min-h-11 min-w-14 rounded-md border border-line text-sm font-semibold">+1 %</button>
          <button type="button" onClick={() => { if (!scale) { setScale(s); saveScale(s) } setView('marker') }} className="min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-paper">Done → Marker</button>
        </div>
        <label className="num flex items-center gap-2 text-xs text-muted">
          <input type="number" inputMode="decimal" step={0.001} min={SCALE_RANGE.min} max={SCALE_RANGE.max} value={Number(s.toFixed(3))} aria-label="CSS px per mm"
            onChange={(e) => { const v = Number(e.target.value); if (v >= SCALE_RANGE.min && v <= SCALE_RANGE.max) { setScale(v); saveScale(v) } }}
            className="num w-24 rounded-md border border-line bg-white px-2 py-1 text-sm text-ink" />
          CSS px / mm · {(s * 25.4 * (devicePixelRatio || 1)).toFixed(0)} ppi — or type the value from the phone's spec: ppi ÷ 25.4 ÷ {devicePixelRatio || 1}
        </label>
        <p className="text-xs text-muted">
          Nothing is dragged on the drawing itself — the slider and the buttons resize it. <strong>Bank card:</strong> long edge along the line, one corner on a tick; resize until the far corner meets the other tick.
          <strong> Or a Rp 500 coin</strong> ({COIN.d} mm) filling the circle with no gap and no overlap. Each ± press is tiny on purpose (1 % ≈ 1 mm of the line) — watch the number. Full brightness, 100 % zoom.
        </p>
      </div>
    )
    return (
      <div className="fixed inset-0 overflow-auto bg-white">
        {zoomBanner}
        <div className={`flex gap-3 p-2 pb-28 ${portrait ? 'flex-row' : 'flex-col'}`}>
          {barSvg}
          <div className={`flex gap-3 ${portrait ? 'flex-col' : 'flex-row'}`}>
            {coinSvg}
            {controls}
          </div>
        </div>
        {toolbar}
      </div>
    )
  }

  const originX = (0 - KIT.x) * s, originY = (0 - KIT.y) * s   // marker origin inside the kit box, px
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white" onClick={() => setChrome((c) => !c)}>
      {zoomBanner}
      {view === 'marker' && (
        <div style={{ position: 'relative', width: KIT.w * s, height: KIT.h * s, transform: portrait ? 'rotate(90deg)' : undefined }}>
          <Marker s={s} x={originX} y={originY} />
          <ZoneTicks s={s} x={originX} y={originY} />
        </div>
      )}
      {view === 'gauge' && (
        <div className={`flex items-center gap-6 ${portrait ? 'flex-col' : 'flex-row'}`} onClick={(e) => e.stopPropagation()}>
          <svg className="shrink-0" width={(RING_DIAMETER_MM.max + 6) * s} height={(RING_DIAMETER_MM.max + 6) * s} aria-label={`gauge circle ${gauge.toFixed(1)} mm`}>
            <circle cx="50%" cy="50%" r={(gauge / 2) * s} fill="none" stroke="#000" strokeWidth={hairline()} />
          </svg>
          <div className="flex max-w-xs flex-col items-center gap-3">
            <p className="num text-4xl font-semibold" aria-live="polite">{gauge.toFixed(1)} mm</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => step(-GAUGE_STEP.coarse)} className="min-h-11 min-w-14 rounded-md border border-line font-semibold">−0.5</button>
              <button type="button" onClick={() => step(-GAUGE_STEP.fine)} className="min-h-11 min-w-14 rounded-md border border-line">−0.1</button>
              <button type="button" onClick={() => step(GAUGE_STEP.fine)} className="min-h-11 min-w-14 rounded-md border border-line">+0.1</button>
              <button type="button" onClick={() => step(GAUGE_STEP.coarse)} className="min-h-11 min-w-14 rounded-md border border-line font-semibold">+0.5</button>
            </div>
            <p className="text-center text-xs text-muted">Ring on the circle. <strong>L</strong> = largest diameter still fully visible inside the hole; <strong>U</strong> = smallest the ring covers. Note both.</p>
          </div>
        </div>
      )}
      {instrument && !chrome && <span className="sr-only">Tap anywhere to show the controls</span>}
      {toolbar}
    </div>
  )
}
