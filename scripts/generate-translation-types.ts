import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function flattenKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = []
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'string') {
        keys.push(newKey)
      } else if (v && typeof v === 'object') {
        keys.push(...flattenKeys(v, newKey))
      }
    }
  }
  return keys
}

const enPath = resolve('src/translations/en.json')
const en = JSON.parse(readFileSync(enPath, 'utf-8'))
const keys = flattenKeys(en)

const union = keys.map((k) => `  | '${k}'`).join('\n')

const output = `// Auto-generated from en.json. Do not edit manually.
// Run: npx tsx scripts/generate-translation-types.ts

export type TranslationKey =
${union}
`

const outPath = resolve('src/translations/keys.ts')
writeFileSync(outPath, output)
console.log(`Generated ${keys.length} translation keys → ${outPath}`)
