// Prints every failing/warning audit from lh.json, so a sub-100 score names its cause.
import { readFileSync } from 'node:fs'

const lh = JSON.parse(readFileSync('lh.json', 'utf8'))

for (const cat of Object.values(lh.categories)) {
  const failures = cat.auditRefs
    .map((ref) => lh.audits[ref.id])
    .filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')

  if (failures.length === 0) continue
  console.log(`\n=== ${cat.title} (${Math.round(cat.score * 100)}) ===`)
  for (const a of failures) {
    console.log(`\n  [${a.score === 0 ? 'FAIL' : 'WARN'}] ${a.title}`)
    if (a.description) console.log(`    ${a.description.replace(/\[.*?\]\(.*?\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)}`)
    for (const item of (a.details?.items ?? []).slice(0, 4)) {
      const snippet = item.node?.snippet ?? item.node?.selector ?? item.source?.snippet ?? ''
      const explanation = item.node?.explanation ?? ''
      if (snippet) console.log(`      • ${String(snippet).replace(/\s+/g, ' ').slice(0, 160)}`)
      if (explanation) console.log(`        ${String(explanation).replace(/\s+/g, ' ').slice(0, 200)}`)
    }
  }
}
