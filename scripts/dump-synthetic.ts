import { writeFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import { loadCv } from '../src/cv/opencv'
import { renderSynthetic, type SyntheticOpts } from '../src/cv/synthetic'

const cv = await loadCv()
mkdirSync('testset/.cache', { recursive: true })
const cases: Record<string, SyntheticOpts> = { 'syn-17.30': { tilt: 'mild', blurPx: 5 }, 'syn-two-rings': { extraRing: true }, 'syn-no-marker': { noMarker: true } }
for (const [name, opts] of Object.entries(cases)) {
  const { image } = renderSynthetic(cv, opts)
  const png = new PNG({ width: image.width, height: image.height })
  png.data = Buffer.from(image.data.buffer)
  writeFileSync(`testset/.cache/${name}.png`, PNG.sync.write(png))
  console.log(`testset/.cache/${name}.png`)
}
