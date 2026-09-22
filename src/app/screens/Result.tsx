import type { MeasureResult, Photo, Timings as T } from '../../cv/types'
import { Overlay } from '../components/Overlay'
import { SizeChips } from '../components/SizeChips'
import { Timings } from '../components/Timings'
import { CostLine } from '../components/CostLine'
import { GATES } from '../../cv/gates'

export function Result({ outcome: o, photo, fileTimings, wallMs, engineInitMs, onReset }: { outcome: MeasureResult; photo?: Photo; fileTimings: T; wallMs: number; engineInitMs: number | null; onReset: () => void }) {
  const checks: [string, string][] = [
    ['Marker found', `20 mm ArUco, ${o.markerSidePx.toFixed(0)} px wide → ${o.pxPerMm.toFixed(1)} px/mm`],
    ['Tilt', `≈ ${o.tiltDeg.toFixed(0)}° (hole axes ratio ${o.axesRatio.toFixed(3)}, limit ${GATES.MIN_AXES_RATIO})`],
    ['Sharpness', `score ${o.blurScore.toFixed(0)} (minimum ${GATES.BLUR_MIN_SCORE})`],
    ['Edge fit', `residual ${o.edgeResidualPx.toFixed(2)} px, ${o.edgeInliers}/64 edge points agree (limits ${GATES.EDGE_MAX_RESIDUAL_PX} px / ${GATES.EDGE_MIN_INLIERS})`],
  ]
  return (
    <section aria-labelledby="result-h" className="mt-8">
      <h2 id="result-h" tabIndex={-1} className="text-xl font-semibold">Result</h2>
      <Overlay photo={photo} overlay={o.overlay} />
      <p className="label mt-4 text-muted">Inner diameter</p>
      <p className="num text-5xl font-medium leading-none">{o.diameterMm.toFixed(2)}<span className="text-2xl text-muted"> mm</span></p>
      <p className="num mt-1 text-lg text-muted">± {o.sigmaMm.toFixed(2)} mm</p>
      <SizeChips {...o.sizes} sigmaMm={o.sigmaMm} />
      <ul className="mt-4 space-y-1 text-sm">
        {checks.map(([k, v]) => (<li key={k}><span className="font-semibold text-accent-ink">✓ {k}</span> <span className="text-muted">— {v}</span></li>))}
        <li className="text-muted">Distance ≈ <span className="num">{(o.estDistanceMm / 10).toFixed(0)}</span> cm (estimate; assumes an uncropped phone photo)</li>
      </ul>
      <details className="group mt-3 text-sm">
        <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-semibold before:h-2 before:w-2 before:shrink-0 before:-rotate-45 before:border-b-2 before:border-r-2 before:border-current before:transition-transform before:content-[''] group-open:before:rotate-45">How the ± was computed</summary>
        <p className="mt-1 text-muted">
          Edge localisation <span className="num">{o.sigmaParts.px.toFixed(2)}</span> mm ⊕ marker corners <span className="num">{o.sigmaParts.marker.toFixed(2)}</span> mm ⊕
          ring-height parallax <span className="num">{o.sigmaParts.parallax.toFixed(2)}</span> mm (band height 2 mm assumed, tilt ≥ 5° assumed) ⊕
          out-of-roundness <span className="num">{o.sigmaParts.rim.toFixed(2)}</span> mm (rim circle {o.rimFitMm.toFixed(2)} mm vs the largest circle that passes), combined in quadrature. See Limits below.
        </p>
      </details>
      <Timings pipeline={o.timings} file={fileTimings} wallMs={wallMs} engineInitMs={engineInitMs} />
      <CostLine />
      <button type="button" onClick={onReset} className="mt-6 min-h-12 w-full rounded-md border border-ink px-6 font-semibold">Measure another</button>
    </section>
  )
}
