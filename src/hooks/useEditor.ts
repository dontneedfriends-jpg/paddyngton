import { useCallback, useRef, useMemo } from 'react'
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'
import { highlightActiveLine } from '@codemirror/view'
import { search } from '@codemirror/search'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import type { SyntaxNodeRef } from '@lezer/common'
import { FormatButton, Chapter } from '../types'
import { applyFormat, applyColor } from '../lib/formatEditor'
import { useUIStore } from '../store/useUIStore'
import { useBookStore } from '../store/useBookStore'
import { useSettingsStore } from '../store/useSettingsStore'

const markdownMarkerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }
    buildDecorations(view: EditorView) {
      const widgets: { from: number; to: number; value: Decoration }[] = []
      try {
        const tree = syntaxTree(view.state)
        tree.iterate({
          enter: (node: SyntaxNodeRef) => {
            const name = node.type.name
            const from = node.from
            const to = node.to
            if (name === 'StrongEmphasis' && to - from > 4) {
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(from, from + 2)
              )
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(to - 2, to)
              )
            } else if (name === 'Emphasis' && to - from > 2) {
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(from, from + 1)
              )
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(to - 1, to)
              )
            } else if (
              name === 'ATXHeading1' ||
              name === 'ATXHeading2' ||
              name === 'ATXHeading3'
            ) {
              const text = view.state.doc.sliceString(from, Math.min(to, from + 10))
              const hashes = text.match(/^#+ /)?.[0]?.length || 0
              if (hashes > 0) {
                widgets.push(
                  Decoration.mark({ class: 'md-faded-marker' }).range(from, from + hashes)
                )
              }
            } else if (name === 'Link') {
              const text = view.state.doc.sliceString(from, to)
              const bracketMatch = text.match(/\[([^\]]*)\]/)
              if (bracketMatch) {
                const bracketStart = text.indexOf('[')
                widgets.push(
                  Decoration.mark({ class: 'md-faded-marker' }).range(from + bracketStart, from + bracketStart + 1)
                )
                const bracketEnd = text.lastIndexOf(']')
                if (bracketEnd > bracketStart) {
                  widgets.push(
                    Decoration.mark({ class: 'md-faded-marker' }).range(from + bracketEnd, from + bracketEnd + 1)
                  )
                }
              }
            }
          },
        })
      } catch (e) {
        console.warn('Markdown markers plugin error:', e)
      }
      return Decoration.set(widgets)
    }
  },
  {
    decorations: (v: { decorations: DecorationSet }) => v.decorations,
  }
)

const typewriterPlugin = ViewPlugin.fromClass(
  class {
    private raf: number | null = null
    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = requestAnimationFrame(() => {
        this.raf = null
        const view = update.view
        const cursor = view.state.selection.main.head
        const coords = view.coordsAtPos(cursor)
        if (!coords) return
        const scroller = view.scrollDOM
        const scrollerRect = scroller.getBoundingClientRect()
        const cursorTop = coords.top - scrollerRect.top + scroller.scrollTop
        const target = cursorTop - scrollerRect.height / 2
        scroller.scrollTop = target
      })
    }
  }
)

const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }
    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      const text = view.state.doc.toString()
      const regex = /\[\[([^\]]+)\]\]/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const from = match.index
        const to = from + match[0].length
        builder.add(from, from + 2, Decoration.mark({ class: 'md-faded-marker' }))
        builder.add(from + 2, to - 2, Decoration.mark({ class: 'wiki-link' }))
        builder.add(to - 2, to, Decoration.mark({ class: 'md-faded-marker' }))
      }
      return builder.finish()
    }
  },
  { decorations: (v) => v.decorations }
)

const wikiLinkClickHandler = EditorView.domEventHandlers({
  mousedown(event) {
    const target = event.target as HTMLElement
    if (!target.closest('.wiki-link')) return
    event.preventDefault()
    const cmEl = target.closest('.cm-editor') as HTMLElement & { cm?: EditorView } | null
    const view = cmEl?.cm
    if (!view) return
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos == null) return
    const doc = view.state.doc.toString()
    const before = doc.lastIndexOf('[[', pos)
    const after = doc.indexOf(']]', pos)
    if (before === -1 || after === -1 || before > after) return
    const name = doc.slice(before + 2, after).trim()
    if (!name) return
    const bookState = useBookStore.getState()
    const activeBook = bookState.openBooks.find((b) => b.id === bookState.activeBookId)
    if (!activeBook) return
    const entry = activeBook.contextData.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    )
    if (entry) {
      useUIStore.getState().set({ wikiSelected: entry, showWiki: true })
    }
  },
})

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createCharacterHighlightPlugin(names: string[]) {
  const sorted = [...names].sort((a, b) => b.length - a.length)
  if (sorted.length === 0) {
    return ViewPlugin.fromClass(class {}, { decorations: () => Decoration.none })
  }
  const pattern = new RegExp(
    sorted.map((n) => `\\b${escapeRegExp(n)}\\b`).join('|'),
    'g'
  )
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }
      buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>()
        const text = view.state.doc.toString()
        let match: RegExpExecArray | null
        while ((match = pattern.exec(text)) !== null) {
          builder.add(
            match.index,
            match.index + match[0].length,
            Decoration.mark({ class: 'char-highlight' })
          )
        }
        return builder.finish()
      }
    },
    { decorations: (v) => v.decorations }
  )
}

export function useEditor() {
  const editorViewRef = useRef<EditorView | null>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const bgColorInputRef = useRef<HTMLInputElement>(null)
  const typewriterMode = useSettingsStore((s) => s.settings.typewriterMode)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const characterNames = activeBook?.contextData
    .filter((e) => e.type === 'character')
    .map((e) => e.name) ?? []
  const characterNamesKey = characterNames.join('\n')

  const handleFormat = useCallback((fmt: FormatButton) => {
    const view = editorViewRef.current
    if (!view) return
    if (fmt.type === 'fontFamily' || fmt.type === 'fontSize') return

    const uiState = useUIStore.getState()
    applyFormat(fmt, view, {
      selectedColor: uiState.selectedColor,
      selectedBgColor: uiState.selectedBgColor,
      setInputDialog: (d) => uiState.set({ inputDialog: d }),
      setSelectedColor: (c) => uiState.set({ selectedColor: c }),
      setSelectedBgColor: (c) => uiState.set({ selectedBgColor: c }),
    })
  }, [])

  const handleColor = useCallback((color: string, isBg: boolean) => {
    const view = editorViewRef.current
    if (!view) return
    applyColor(color, isBg, view)
  }, [])

  const handleEditorChange = useCallback((value: string) => {
    const bookState = useBookStore.getState()
    const activeBook = bookState.openBooks.find((b) => b.id === bookState.activeBookId)
    if (!activeBook) return
    const activeChapterId = activeBook.activeChapterId
    if (!activeChapterId) return
    bookState.updateActiveBook({
      chapters: activeBook.chapters.map((c: Chapter) =>
        c.id === activeChapterId
          ? { ...c, code: value, isModified: true }
          : c
      ),
    })
  }, [])

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
    return () => {
      editorViewRef.current = null
    }
  }, [])

  const characterHighlightPlugin = useMemo(
    () => createCharacterHighlightPlugin(characterNames),
    [characterNamesKey]
  )

  const editorExtensions = useMemo(
    () => [
      highlightActiveLine(),
      search({ top: false }),
      markdownMarkerPlugin,
      wikiLinkPlugin,
      wikiLinkClickHandler,
      characterHighlightPlugin,
      ...(typewriterMode ? [typewriterPlugin] : []),
    ],
    [typewriterMode, characterHighlightPlugin]
  )

  return {
    editorViewRef,
    colorInputRef,
    bgColorInputRef,
    editorExtensions,
    handleFormat,
    handleColor,
    handleEditorChange,
    handleEditorCreate,
  }
}
