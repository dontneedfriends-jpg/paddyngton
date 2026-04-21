import { ContextEntry, ContextGroup } from '../types'

export function extractGroups(
  data: ContextEntry[],
  noGroupLabel: string = 'No Group'
): ContextGroup[] {
  const seen = new Set<string>()
  const groups: ContextGroup[] = []
  for (const entry of data) {
    const g = entry.group || noGroupLabel
    if (!seen.has(g)) {
      seen.add(g)
      groups.push({ name: g, type: entry.type })
    }
  }
  return groups
}

export function findContextEntry(
  word: string,
  contextData: ContextEntry[]
): ContextEntry | null {
  const lower = word.toLowerCase()
  return contextData.find((c) => c.name.toLowerCase() === lower) || null
}

export function getWordAtPos(doc: string, pos: number): string {
  let start = pos,
    end = pos
  while (start > 0 && /[\w\u0400-\u04FF]/.test(doc[start - 1])) start--
  while (end < doc.length && /[\w\u0400-\u04FF]/.test(doc[end])) end++
  return doc.slice(start, end)
}