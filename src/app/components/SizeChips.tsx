import type { SizeReading } from '../../cv/types'
const fmt = (s: SizeReading) => ({ eu: String(s.eu), us: String(s.us), uk: s.uk })
export function SizeChips({ nominal, low, high, spans, sigmaMm }: { nominal: SizeReading; low: SizeReading; high: SizeReading; spans: boolean; sigmaMm: number }) {
  const n = fmt(nominal), l = fmt(low), h = fmt(high)
  const cell = (label: string, key: 'eu' | 'us' | 'uk') => (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="label text-muted">{label}</div>
      <div className="num text-xl font-medium sm:text-2xl">{n[key]}</div>
      {spans && l[key] !== h[key] && <div className="num text-xs text-muted">{l[key]}–{h[key]}</div>}
    </div>
  )
  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-2">{cell('EU / ISO', 'eu')}{cell('US', 'us')}{cell('UK', 'uk')}</div>
      {spans && <p className="mt-2 text-sm text-muted">At ±<span className="num">{sigmaMm.toFixed(2)}</span> mm the reading spans <span className="num">{l.eu}–{h.eu}</span>; <span className="num">{n.eu}</span> is the centre.</p>}
    </div>
  )
}
