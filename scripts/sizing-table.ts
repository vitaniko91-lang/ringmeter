import { writeFileSync } from 'node:fs'
import { sizesFor, SIZING_SOURCE } from '../src/sizing/sizing'
const rows = []
for (let d = 14; d <= 22.0001; d += 0.5) { const s = sizesFor(d); rows.push(`| ${d.toFixed(1)} | ${(Math.PI * d).toFixed(1)} | ${s.eu} | ${s.us} | ${s.uk} |`) }
writeFileSync('docs/sizing-table.md', `# Sizing table\n\nSource: ${SIZING_SOURCE.name} — ${SIZING_SOURCE.url}\n\n- ${SIZING_SOURCE.formulas.eu}\n- ${SIZING_SOURCE.formulas.us}\n- ${SIZING_SOURCE.formulas.uk}\n- Rounding: ${SIZING_SOURCE.rounding}\n\n| Inner Ø mm | Circumference mm | EU/ISO | US | UK |\n|---|---|---|---|---|\n${rows.join('\n')}\n`)
console.log('docs/sizing-table.md written')
