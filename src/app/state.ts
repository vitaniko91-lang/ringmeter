import type { MeasureResult, Reject, Outcome, Timings } from '../cv/types'

export type Photo = { width: number; height: number; bitmap: ImageBitmap }
export type State =
  | { phase: 'idle' }
  | { phase: 'processing'; stage: string }
  | { phase: 'result'; outcome: MeasureResult; photo?: Photo; fileTimings: Timings }
  | { phase: 'reject'; outcome: Reject; photo?: Photo; fileTimings: Timings }
export type Action =
  | { type: 'start' } | { type: 'stage'; stage: string } | { type: 'reset' }
  | { type: 'done'; outcome: Outcome; photo?: Photo; fileTimings: Timings }

export const initial: State = { phase: 'idle' }

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'start': return { phase: 'processing', stage: 'starting' }
    case 'stage': return s.phase === 'processing' ? { phase: 'processing', stage: a.stage } : s
    case 'done': return a.outcome.ok
      ? { phase: 'result', outcome: a.outcome, photo: a.photo, fileTimings: a.fileTimings }
      : { phase: 'reject', outcome: a.outcome, photo: a.photo, fileTimings: a.fileTimings }
    case 'reset': return initial
  }
}
