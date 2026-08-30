/**
 * Reads the JSON emitted by `sanity tokens create` and writes the secret into .env.local
 * as SANITY_API_READ_TOKEN.
 *
 * The token value is never printed — only its length and prefix, enough to confirm it
 * landed without putting a credential into a terminal log or a transcript.
 *
 * Usage:
 *   npx sanity tokens create "<label>" --role viewer -y --json > .token.json
 *   node scripts/install-read-token.mjs .token.json
 *   rm .token.json
 */
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2]
if (!source) {
  console.error('usage: node scripts/install-read-token.mjs <token-json-file>')
  process.exit(1)
}

const raw = readFileSync(source, 'utf8')
// The CLI prints a telemetry banner before the JSON on first run; take the JSON object.
const start = raw.indexOf('{')
if (start === -1) {
  console.error('No JSON found in CLI output. Contents were not a token payload.')
  process.exit(1)
}

const payload = JSON.parse(raw.slice(start))
const token = payload.key ?? payload.token ?? payload.secret
if (typeof token !== 'string' || token.length < 20) {
  console.error('Could not find a token in the payload. Keys present:', Object.keys(payload).join(', '))
  process.exit(1)
}

let env = readFileSync('.env.local', 'utf8')
if (/^SANITY_API_READ_TOKEN=.+$/m.test(env)) {
  env = env.replace(/^SANITY_API_READ_TOKEN=.*$/m, `SANITY_API_READ_TOKEN=${token}`)
  console.log('Replaced existing SANITY_API_READ_TOKEN')
} else if (/^SANITY_API_READ_TOKEN=\s*$/m.test(env)) {
  env = env.replace(/^SANITY_API_READ_TOKEN=\s*$/m, `SANITY_API_READ_TOKEN=${token}`)
  console.log('Filled empty SANITY_API_READ_TOKEN')
} else {
  env = `${env.trimEnd()}\n\n# Viewer-scoped read token. Required since the dataset is private.\nSANITY_API_READ_TOKEN=${token}\n`
  console.log('Appended SANITY_API_READ_TOKEN')
}

writeFileSync('.env.local', env)
console.log(`token installed: ${token.length} chars, starts "${token.slice(0, 3)}"`)
console.log('label:', payload.label ?? '(none)', '| role:', payload.roles?.join(',') ?? payload.role ?? '(unknown)')
