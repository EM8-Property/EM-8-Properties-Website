/**
 * Summarises lh.json: category scores and whether the resource budgets held.
 *
 * The image budget is the guardrail against the old site's central failure — 10-20MB
 * camera originals — so it is reported explicitly rather than buried in a JSON blob.
 */
import { readFileSync } from 'node:fs'

const lh = JSON.parse(readFileSync('lh.json', 'utf8'))

console.log('=== Lighthouse ===')
console.log('url:', lh.finalDisplayedUrl ?? lh.finalUrl)
for (const cat of Object.values(lh.categories)) {
  const score = cat.score === null ? 'n/a' : Math.round(cat.score * 100)
  console.log(`  ${cat.title.padEnd(16)} ${String(score).padStart(3)}`)
}

const budget = lh.audits?.['performance-budget']
console.log('')
console.log('=== Resource budget ===')
const items = budget?.details?.items ?? []
if (items.length === 0) {
  console.log('  no budget overages reported')
} else {
  for (const i of items) {
    console.log(
      `  OVER: ${i.label ?? i.resourceType} — ${Math.round((i.size ?? 0) / 1024)}KB, over by ${Math.round((i.sizeOverBudget ?? 0) / 1024)}KB`,
    )
  }
}

// Actual transfer sizes by type, budget or not — the number that matters at cutover.
const summary = lh.audits?.['resource-summary']?.details?.items ?? []
console.log('')
console.log('=== Transfer sizes ===')
for (const r of summary) {
  console.log(`  ${String(r.label ?? r.resourceType).padEnd(14)} ${String(r.requestCount).padStart(3)} req  ${String(Math.round((r.transferSize ?? 0) / 1024)).padStart(5)} KB`)
}
