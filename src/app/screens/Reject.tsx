import type { Reject as R } from '../../cv/types'
import type { Photo } from '../state'
export function Reject({ outcome }: { outcome: R; photo?: Photo; onReset: () => void }) {
  return <pre>{JSON.stringify(outcome, null, 1)}</pre>
}
