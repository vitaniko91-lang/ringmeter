import type { SizeReading } from '../../cv/types'
const fmt = (s: SizeReading) => ({ eu: String(s.eu), us: String(s.us), uk: s.uk })
export function SizeChips({ nominal, low, high, spans }: { nominal: SizeReading; low: SizeReading; high: SizeReading; spans: boolean }) {
  const n = fmt(nominal), l = fmt(low), h = fmt(high)
  const cell = (label: string, key: 'eu' | 'us' | 'uk') => (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="num text-xl font-medium sm:text-2xl">{spans && l[key] !== h[key] ? `${l[key]}–${h[key]}` : n[key]}</div>
    </div>
  )
  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-2">{cell('EU / ISO', 'eu')}{cell('US', 'us')}{cell('UK', 'uk')}</div>
      {spans && <p className="mt-2 text-sm text-muted">The uncertainty band crosses a size boundary, so both neighbouring sizes are shown.</p>}
    </div>
  )
}
