export function Landing() {
  return (
    <header>
      <p className="num text-xs font-semibold uppercase tracking-[0.15em] text-accent-ink">Ringmeter · prototype</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">Ring size from one photo</h1>
      <p className="mt-3 text-muted">Print a small calibration sheet, lay the ring next to the 20 mm marker, shoot from above. The inner diameter is measured on your phone — no typing, no manual calibration.</p>
      <ol className="mt-5 space-y-1 text-sm">
        <li><span className="num font-semibold">1</span> Print the Ring Kit at 100 % and check the scale with a coin</li>
        <li><span className="num font-semibold">2</span> Put one ring flat inside the marked zone</li>
        <li><span className="num font-semibold">3</span> Photograph from directly above, 15–25 cm away</li>
      </ol>
      <a href="/ring-kit.pdf" download className="mt-5 flex min-h-12 items-center justify-center rounded-md bg-ink px-6 font-semibold text-paper">Download Ring Kit (PDF, A4)</a>
    </header>
  )
}
