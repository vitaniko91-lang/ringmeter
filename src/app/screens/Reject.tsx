import type { Reject as R, Photo } from '../../cv/types'
import { Overlay } from '../components/Overlay'

export function Reject({ outcome: o, photo, onReset }: { outcome: R; photo?: Photo; onReset: () => void }) {
  return (
    <section aria-labelledby="reject-h" className="mt-8 rounded-md border border-error p-4">
      <p className="num label text-error">Retake needed · {o.code}</p>
      <h2 id="reject-h" tabIndex={-1} className="mt-1 text-xl font-semibold">{o.hint}</h2>
      <p className="mt-2 text-sm text-muted">What we saw: {o.detail}. Processed in <span className="num">{o.totalMs.toFixed(0)} ms</span>.</p>
      {photo && (o.overlay.markerQuad || o.overlay.innerBoundary) && <Overlay photo={photo} overlay={o.overlay} />}
      <button type="button" onClick={onReset} className="mt-4 min-h-12 w-full rounded-md bg-ink px-6 font-semibold text-paper">Try again</button>
    </section>
  )
}
