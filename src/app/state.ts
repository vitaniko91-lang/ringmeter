import type { MeasureResult, Reject, Outcome, Photo, Timings } from '../cv/types'

export type State =
  | { phase: 'idle' }
  | { phase: 'processing'; stage: string }
  | { phase: 'result'; outcome: MeasureResult; photo?: Photo; fileTimings: Timings; wallMs: number; engineInitMs: number | null }
  | { phase: 'reject'; outcome: Reject; photo?: Photo; fileTimings: Timings; wallMs: number; engineInitMs: number | null }
export type Action =
  | { type: 'start' } | { type: 'stage'; stage: string } | { type: 'reset' }
  | { type: 'done'; outcome: Outcome; photo?: Photo; fileTimings: Timings; wallMs: number; engineInitMs: number | null }
  // wallMs: tap → outcome on the main thread; engineInitMs: worker boot → OpenCV ready, once per session (null if it never reported)

export const initial: State = { phase: 'idle' }

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'start': return { phase: 'processing', stage: 'starting' }
    case 'stage': return s.phase === 'processing' ? { phase: 'processing', stage: a.stage } : s
    case 'done': return a.outcome.ok
      ? { phase: 'result', outcome: a.outcome, photo: a.photo, fileTimings: a.fileTimings, wallMs: a.wallMs, engineInitMs: a.engineInitMs }
      : { phase: 'reject', outcome: a.outcome, photo: a.photo, fileTimings: a.fileTimings, wallMs: a.wallMs, engineInitMs: a.engineInitMs }
    case 'reset': return initial
  }
}
