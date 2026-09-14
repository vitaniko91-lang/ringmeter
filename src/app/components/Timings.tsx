import { Fragment } from 'react'
import type { Timings as T } from '../../cv/types'
export function Timings({ pipeline, file, wallMs, engineInitMs }: { pipeline: T; file: T; wallMs: number; engineInitMs: number | null }) {
  const rows = [...Object.entries(file), ...Object.entries(pipeline)]
  return (
    <details className="group mt-4 rounded-md border border-line p-3">
      <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold before:h-2 before:w-2 before:shrink-0 before:-rotate-45 before:border-b-2 before:border-r-2 before:border-current before:transition-transform before:content-[''] group-open:before:rotate-45">
        <span>Tap to result — <span className="num">{wallMs} ms</span> on this device</span>
      </summary>
      <p className="mt-1 text-sm text-muted">Engine init (once per session): <span className="num">{engineInitMs == null ? '—' : engineInitMs.toFixed(0)} ms</span></p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="num text-right">{v.toFixed(1)} ms</dd></Fragment>))}
      </dl>
    </details>
  )
}
