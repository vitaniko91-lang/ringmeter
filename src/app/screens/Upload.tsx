export function Upload({ onFile, busy }: { onFile: (f: File) => void; busy: boolean }) {
  return (
    <section aria-labelledby="upload-h" className="mt-10">
      <h2 id="upload-h" className="text-xl font-semibold">3 · Upload the photo</h2>
      <p className="mt-1 text-muted">Nothing leaves your phone — the photo is measured on-device.</p>
      <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-center rounded-md bg-accent-ink px-6 text-base font-semibold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        {busy ? 'Measuring…' : 'Take or choose a photo'}
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </label>
    </section>
  )
}
