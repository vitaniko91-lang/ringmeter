import { useEffect, useReducer, useRef } from 'react'
import { reducer, initial } from './state'
import type { WorkerIn, WorkerOut } from '../worker/measure.worker'

declare global { interface Window { __ringmeter?: { seq: number; last?: WorkerOut } } }

export function useMeasure() {
  const [state, dispatch] = useReducer(reducer, initial)
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  useEffect(() => {
    const w = new Worker(new URL('../worker/measure.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      if (e.data.seq !== seq.current) return
      if ('stage' in e.data) dispatch({ type: 'stage', stage: e.data.stage })
      else {
        dispatch({ type: 'done', outcome: e.data.outcome, photo: e.data.photo, fileTimings: e.data.fileTimings })
        window.__ringmeter = { seq: e.data.seq, last: e.data }   // hook for scripts/evaluate.ts
      }
    }
    worker.current = w
    return () => w.terminate()
  }, [])
  const measureFile = (file: File) => {
    seq.current += 1
    dispatch({ type: 'start' })
    worker.current?.postMessage({ seq: seq.current, file } satisfies WorkerIn)
  }
  return { state, measureFile, reset: () => dispatch({ type: 'reset' }) }
}
