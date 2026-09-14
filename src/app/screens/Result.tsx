import type { MeasureResult, Timings } from '../../cv/types'
import type { Photo } from '../state'
export function Result({ outcome }: { outcome: MeasureResult; photo?: Photo; fileTimings: Timings; onReset: () => void }) {
  return <pre>{JSON.stringify(outcome, null, 1)}</pre>
}
