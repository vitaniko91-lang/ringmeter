export function Processing({ stage }: { stage: string }) {
  return (
    <section aria-live="polite" className="mt-8 rounded-md border border-line p-4">
      <p className="num text-sm text-muted">processing</p>
      <p className="mt-1 text-lg font-medium">{stage}…</p>
      <p className="mt-2 text-sm text-muted">First run downloads the vision engine (~4 MB compressed) once; it is cached afterwards.</p>
    </section>
  )
}
