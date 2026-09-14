import { useEffect, useReducer, useRef, useState } from 'react'
import { reducer, initial } from './state'
import { REJECT_HINT, type Outcome, type Photo, type Timings } from '../cv/types'
import type { WorkerIn, WorkerOut } from '../worker/measure.worker'

type Last = { seq: number; outcome: Outcome; fileTimings: Timings; wallMs: number; engineInitMs: number | null }
declare global { interface Window { __ringmeter?: { seq: number; last?: Last } } }

const WATCHDOG_MS = 30_000
// Evaluator hook (scripts/evaluate.ts opens /?eval=1); never on a plain production page.
const expose = () => import.meta.env.DEV || new URLSearchParams(location.search).has('eval')

export function useMeasure() {
  const [state, dispatch] = useReducer(reducer, initial)
  const [ready, setReady] = useState(false)
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const t0 = useRef(0)                                   // performance.now() at measureFile — wall clock the user actually waits
  const engineInitMs = useRef<number | null>(null)
  const photoRef = useRef<Photo | undefined>(undefined)  // the one bitmap the app owns; closed on replace / reset
  const watchdog = useRef(0)

  const finish = (outcome: Outcome, photo: Photo | undefined, fileTimings: Timings) => {
    clearTimeout(watchdog.current)
    if (photoRef.current && photoRef.current !== photo) photoRef.current.bitmap.close()
    photoRef.current = photo
    const wallMs = t0.current ? +(performance.now() - t0.current).toFixed(0) : 0
    const init = engineInitMs.current
    dispatch({ type: 'done', outcome, photo, fileTimings, wallMs, engineInitMs: init })
    if (expose()) window.__ringmeter = { seq: seq.current, last: { seq: seq.current, outcome, fileTimings, wallMs, engineInitMs: init } }
  }
  const fail = (detail: string) =>
    finish({ ok: false, code: 'INTERNAL_ERROR', hint: REJECT_HINT.INTERNAL_ERROR, detail, overlay: {}, timings: {}, totalMs: 0 }, undefined, {})
  const arm = () => { clearTimeout(watchdog.current); watchdog.current = window.setTimeout(() => fail(`timed out after ${WATCHDOG_MS / 1000} s`), WATCHDOG_MS) }

  useEffect(() => {
    const w = new Worker(new URL('../worker/measure.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if ('ready' in m) { engineInitMs.current = m.engineInitMs; setReady(true); return }
      if (m.seq !== seq.current) { if ('photo' in m) m.photo?.bitmap.close(); return }   // stale reply: drop it, but free the transferred bitmap
      if ('stage' in m) { arm(); dispatch({ type: 'stage', stage: m.stage }); return }    // progress re-arms the watchdog
      finish(m.outcome, m.photo, m.fileTimings)
    }
    w.onerror = (e) => fail(e.message ?? 'worker error')
    w.onmessageerror = () => fail('worker error')
    worker.current = w
    return () => { w.terminate(); clearTimeout(watchdog.current) }
  }, [])

  const measureFile = (file: File) => {
    seq.current += 1
    t0.current = performance.now()
    dispatch({ type: 'start' })
    arm()
    worker.current?.postMessage({ seq: seq.current, file } satisfies WorkerIn)
  }
  const reset = () => {
    clearTimeout(watchdog.current)
    photoRef.current?.bitmap.close(); photoRef.current = undefined
    dispatch({ type: 'reset' })
  }
  return { state, ready, measureFile, reset }
}
