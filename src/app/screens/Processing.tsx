export function Processing({ stage, ready }: { stage: string; ready: boolean }) {
  return (
    <section className="mt-8 rounded-md border border-line p-4">
      <p className="num text-sm text-muted">processing</p>
      <p className="mt-1 text-lg font-medium">{ready ? `${stage}…` : 'Loading the vision engine (once per session)…'}</p>
      <p className="mt-2 text-sm text-muted">First run downloads the vision engine (~4 MB compressed) once; it is cached afterwards.</p>
    </section>
  )
}
