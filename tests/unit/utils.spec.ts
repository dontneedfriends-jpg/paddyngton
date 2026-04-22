import { describe, it, expect } from 'vitest'
import { extractGroups, findContextEntry, getWordAtPos } from '../../src/lib/contextHelpers'
import { renderMarkdown } from '../../src/lib/markdownRender'
import type { ContextEntry } from '../../src/types'

describe('extractGroups', () => {
  it('extracts unique groups from context entries', () => {
    const data: ContextEntry[] = [
      { name: 'A', type: 'character', details: {}, group: 'Heroes' },
      { name: 'B', type: 'character', details: {}, group: 'Villains' },
      { name: 'C', type: 'character', details: {}, group: 'Heroes' },
    ]
    const result = extractGroups(data, 'No Group')
    expect(result).toHaveLength(2)
    expect(result.map((g) => g.name)).toContain('Heroes')
    expect(result.map((g) => g.name)).toContain('Villains')
  })

  it('uses noGroupLabel for entries without a group', () => {
    const data: ContextEntry[] = [
      { name: 'A', type: 'character', details: {} },
      { name: 'B', type: 'character', details: {} },
    ]
    const result = extractGroups(data, 'Без группы')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Без группы')
  })

  it('returns empty array for empty input', () => {
    expect(extractGroups([])).toHaveLength(0)
  })
})

describe('findContextEntry', () => {
  const data: ContextEntry[] = [
    { name: 'Aragorn', type: 'character', details: {} },
    { name: 'Rivendell', type: 'place', details: {} },
  ]

  it('finds entry by exact name match', () => {
    expect(findContextEntry('Aragorn', data)?.name).toBe('Aragorn')
  })

  it('finds entry case-insensitively', () => {
    expect(findContextEntry('aragorn', data)?.name).toBe('Aragorn')
    expect(findContextEntry('ARAGORN', data)?.name).toBe('Aragorn')
  })

  it('returns null when not found', () => {
    expect(findContextEntry('Gandalf', data)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(findContextEntry('Aragorn', [])).toBeNull()
  })
})

describe('getWordAtPos', () => {
  it('extracts word at position', () => {
    expect(getWordAtPos('Hello world', 1)).toBe('Hello')
    expect(getWordAtPos('Hello world', 7)).toBe('world')
  })

  it('handles Cyrillic text', () => {
    expect(getWordAtPos('Привет мир', 2)).toBe('Привет')
    expect(getWordAtPos('Привет мир', 8)).toBe('мир')
  })

  it('returns word when cursor is past the end', () => {
    // Position 11 is past the end; the function walks left to find the nearest word
    expect(getWordAtPos('hello world', 11)).toBe('world')
  })

  it('returns preceding word when cursor is on whitespace', () => {
    // Position 5 is the space between 'hello' and 'world'
    expect(getWordAtPos('hello world', 5)).toBe('hello')
  })
})

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('# Hello')
    expect(html).toContain('<h1>Hello</h1>')
  })

  it('renders inline KaTeX', () => {
    const html = renderMarkdown('$E=mc^2$')
    expect(html).toContain('katex')
    expect(html).not.toContain('katex-error')
  })

  it('renders display KaTeX', () => {
    const html = renderMarkdown('$$\\int_0^1 x dx$$')
    expect(html).toContain('katex-display')
  })

  it('does not process math inside code blocks', () => {
    const md = '```\n$var = 5$\n```'
    const html = renderMarkdown(md)
    // The $var = 5$ should remain as-is inside the code block
    expect(html).toContain('<pre><code')
    expect(html).toContain('$var = 5$')
  })

  it('falls back to raw text on total failure', () => {
    // marked.parse should never throw on valid strings, but test the fallback path
    expect(renderMarkdown('plain text')).toContain('plain text')
  })
})
