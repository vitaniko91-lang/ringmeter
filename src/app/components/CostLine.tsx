export function CostLine() {
  return (
    <p className="mt-3 text-sm">
      <span className="font-semibold">Variable cost per image: <span className="num">$0.00</span>.</span> Measurement runs on your device — no API calls, no upload.
      Hosting is separate (static site: Vercel Hobby $0 / Pro $20 per month). One-time download of the vision engine (~4 MB compressed), then cached.
    </p>
  )
}
