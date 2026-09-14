import { useEffect, useReducer, useRef, useState } from 'react'
import { reducer, initial } from './state'
import { REJECT_HINT, type Outcome, type Photo, type Timings } from '../cv/types'
import type { WorkerIn, WorkerOut } from '../worker/measure.worker'

type Last = { seq: number; outcome: Outcome; fileTimings: Timings; wallMs: number; engineInitMs: number | null }
declare global { interface Window { __ringmeter?: { seq: number; ready?: boolean; engineInitMs?: number; last?: Last } } }

const WATCHDOG_MS = 30_000        // per photo, re-armed on every progress message from the worker
const INIT_WATCHDOG_MS = 180_000  // a photo tapped before the engine is ready waits for the download + WASM compile first
// Evaluator hook (scripts/evaluate.ts opens /?eval=1); never on a plain production page.
const expose = () => import.meta.env.DEV || new URLSearchParams(location.search).has('eval')

export function useMeasure() {
  const [state, dispatch] = useReducer(reducer, initial)
  const [ready, setReady] = useState(false)
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const t0 = useRef(0)                                   // performance.now() at measureFile — wall clock the user actually waits
  const engineInitMs = useRef<number | null>(null)
  const readyRef = useRef(false)                         // mirror of `ready` for the worker handler / measureFile closures
  const inFlight = useRef(false)                         // a photo is queued or being measured
  const photoRef = useRef<Photo | undefined>(undefined)  // the one bitmap the app owns; closed on replace / reset
  const watchdog = useRef(0)

  const finish = (outcome: Outcome, photo: Photo | undefined, fileTimings: Timings) => {
    clearTimeout(watchdog.current); inFlight.current = false
    if (photoRef.current && photoRef.current !== photo) photoRef.current.bitmap.close()
    photoRef.current = photo
    const wallMs = t0.current ? +(performance.now() - t0.current).toFixed(0) : 0
    const init = engineInitMs.current
    dispatch({ type: 'done', outcome, photo, fileTimings, wallMs, engineInitMs: init })
    if (expose()) window.__ringmeter = { ...(window.__ringmeter ?? {}), seq: seq.current, last: { seq: seq.current, outcome, fileTimings, wallMs, engineInitMs: init } }
  }
  const fail = (detail: string) =>
    finish({ ok: false, code: 'INTERNAL_ERROR', hint: REJECT_HINT.INTERNAL_ERROR, detail, overlay: {}, timings: {}, totalMs: 0 }, undefined, {})
  const arm = (ms = WATCHDOG_MS) => {
    clearTimeout(watchdog.current)
    // bump seq BEFORE dispatching: a worker reply that arrives after the timeout has already fired now carries a
    // stale seq and is dropped by the onmessage handler instead of overwriting the timeout outcome.
    watchdog.current = window.setTimeout(() => { seq.current += 1; fail(`timed out after ${ms / 1000} s`) }, ms)
  }

  useEffect(() => {
    const w = new Worker(new URL('../worker/measure.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if ('ready' in m) {
        engineInitMs.current = m.engineInitMs; readyRef.current = true; setReady(true)
        if (inFlight.current) arm()   // a photo tapped before the engine was ready: its 30 s watchdog starts now, not at the tap
        if (expose()) window.__ringmeter = { ...(window.__ringmeter ?? { seq: seq.current }), ready: true, engineInitMs: m.engineInitMs }  // evaluator waits for this before the first upload
        return
      }
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
    inFlight.current = true
    arm(readyRef.current ? WATCHDOG_MS : INIT_WATCHDOG_MS)   // engine init (once per session) is not counted against the per-photo 30 s
    worker.current?.postMessage({ seq: seq.current, file } satisfies WorkerIn)
  }
  const reset = () => {
    clearTimeout(watchdog.current); inFlight.current = false
    photoRef.current?.bitmap.close(); photoRef.current = undefined
    dispatch({ type: 'reset' })
  }
  return { state, ready, measureFile, reset }
}
