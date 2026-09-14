import { Fragment } from 'react'
import type { Timings as T } from '../../cv/types'
export function Timings({ pipeline, file, totalMs }: { pipeline: T; file: T; totalMs: number }) {
  const rows = [...Object.entries(file), ...Object.entries(pipeline)]
  const grand = totalMs + (file['file decode'] ?? 0)
  return (
    <details className="mt-4 rounded-md border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold">Processing time — <span className="num">{grand.toFixed(0)} ms</span> on this device</summary>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="num text-right">{v.toFixed(1)} ms</dd></Fragment>))}
      </dl>
      <p className="mt-2 text-xs text-muted">“opencv load” happens once per session; later photos skip it.</p>
    </details>
  )
}
