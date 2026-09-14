import type { MeasureResult, Timings as T } from '../../cv/types'
import type { Photo } from '../state'
import { Overlay } from '../components/Overlay'
import { SizeChips } from '../components/SizeChips'
import { Timings } from '../components/Timings'
import { CostLine } from '../components/CostLine'
import { GATES } from '../../cv/gates'

export function Result({ outcome: o, photo, fileTimings, onReset }: { outcome: MeasureResult; photo?: Photo; fileTimings: T; onReset: () => void }) {
  const checks: [string, string][] = [
    ['Marker found', `20 mm ArUco, ${o.markerSidePx.toFixed(0)} px wide → ${o.pxPerMm.toFixed(1)} px/mm`],
    ['Distance', `≈ ${(o.estDistanceMm / 10).toFixed(0)} cm (estimated from the marker size)`],
    ['Tilt', `≈ ${o.tiltDeg.toFixed(0)}° (hole axes ratio ${o.axesRatio.toFixed(3)}, limit ${GATES.MIN_AXES_RATIO})`],
    ['Sharpness', `score ${o.blurScore.toFixed(0)} (minimum ${GATES.BLUR_MIN_SCORE})`],
    ['Edge fit', `residual ${o.edgeResidualPx.toFixed(2)} px, ${o.edgeInliers}/64 edge points agree (limits ${GATES.EDGE_MAX_RESIDUAL_PX} px / ${GATES.EDGE_MIN_INLIERS})`],
  ]
  return (
    <section aria-labelledby="result-h" className="mt-8">
      <h2 id="result-h" className="text-xl font-semibold">Result</h2>
      <Overlay photo={photo} overlay={o.overlay} />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Inner diameter</p>
      <p className="num text-5xl font-medium leading-none">{o.diameterMm.toFixed(2)}<span className="text-2xl text-muted"> mm</span></p>
      <p className="num mt-1 text-lg text-muted">± {o.sigmaMm.toFixed(2)} mm</p>
      <SizeChips {...o.sizes} />
      <ul className="mt-4 space-y-1 text-sm">
        {checks.map(([k, v]) => (<li key={k}><span className="font-semibold text-accent-ink">✓ {k}</span> <span className="text-muted">— {v}</span></li>))}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold">How the ± was computed</summary>
        <p className="mt-1 text-muted">
          Edge localisation <span className="num">{o.sigmaParts.px.toFixed(2)}</span> mm ⊕ marker corners <span className="num">{o.sigmaParts.marker.toFixed(2)}</span> mm ⊕
          ring-height parallax <span className="num">{o.sigmaParts.parallax.toFixed(2)}</span> mm (band height 2 mm assumed, tilt ≥ 5° assumed), combined in quadrature. See Limits below.
        </p>
      </details>
      <Timings pipeline={o.timings} file={fileTimings} totalMs={o.totalMs} />
      <CostLine />
      <button type="button" onClick={onReset} className="mt-6 min-h-12 w-full rounded-md border border-ink px-6 font-semibold">Measure another</button>
    </section>
  )
}
