import { useCallback, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { lineNumbers, highlightActiveLine } from '@codemirror/view'
import { search } from '@codemirror/search'
import { syntaxTree } from '@codemirror/language'
import { ViewPlugin, Decoration } from '@codemirror/view'
import { FormatButton } from '../types'
import { applyFormat, applyColor } from '../lib/formatEditor'

const markdownMarkerPlugin = ViewPlugin.fromClass(
  class {
    decorations: any
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }
    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }
    buildDecorations(view: EditorView) {
      const widgets: any[] = []
      try {
        const tree = syntaxTree(view.state)
        tree.iterate({
          enter: (node: any) => {
            const name = node.type.name
            const from = node.from
            const to = node.to
            if (name === 'StrongEmphasis' && to - from > 4) {
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(
                  from,
                  from + 2
                )
              )
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(
                  to - 2,
                  to
                )
              )
            } else if (name === 'Emphasis' && to - from > 2) {
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(
                  from,
                  from + 1
                )
              )
              widgets.push(
                Decoration.mark({ class: 'md-faded-marker' }).range(
                  to - 1,
                  to
                )
              )
            } else if (
              name === 'ATXHeading1' ||
              name === 'ATXHeading2' ||
              name === 'ATXHeading3'
            ) {
              const text = view.state.doc.sliceString(
                from,
                Math.min(to, from + 10)
              )
              const hashes = text.match(/^#+ /)?.[0]?.length || 0
              if (hashes > 0) {
                widgets.push(
                  Decoration.mark({ class: 'md-faded-marker' }).range(
                    from,
                    from + hashes
                  )
                )
              }
            } else if (name === 'Link') {
              const text = view.state.doc.sliceString(from, to)
              const bracketMatch = text.match(/\[([^\]]*)\]/)
              if (bracketMatch) {
                const bracketStart = text.indexOf('[')
                widgets.push(
                  Decoration.mark({ class: 'md-faded-marker' }).range(
                    from + bracketStart,
                    from + bracketStart + 1
                  )
                )
                const bracketEnd = text.lastIndexOf(']')
                if (bracketEnd > bracketStart) {
                  widgets.push(
                    Decoration.mark({ class: 'md-faded-marker' }).range(
                      from + bracketEnd,
                      from + bracketEnd + 1
                    )
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
    decorations: (v: any) => v.decorations,
  }
)

export const editorExtensions = [
  highlightActiveLine(),
  search({ top: false }),
  markdownMarkerPlugin,
]

export function useEditor(setInputDialog: (d: any) => void) {
  const editorViewRef = useRef<EditorView | null>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const bgColorInputRef = useRef<HTMLInputElement>(null)

  const handleFormat = useCallback(
    (fmt: FormatButton) => {
      const view = editorViewRef.current
      if (!view) return
      if (fmt.type === 'fontFamily' || fmt.type === 'fontSize') return

      const ui = useUIStore_getSelectedColors()
      applyFormat(fmt, view, {
        selectedColor: ui.selectedColor,
        selectedBgColor: ui.selectedBgColor,
        setInputDialog,
        setSelectedColor: useUIStore_setSelectedColor,
        setSelectedBgColor: useUIStore_setSelectedBgColor,
      })
    },
    [setInputDialog]
  )

  const handleColor = useCallback(
    (color: string, isBg: boolean) => {
      const view = editorViewRef.current
      if (!view) return
      applyColor(color, isBg, view)
    },
    []
  )

  const handleEditorChange = useCallback(
    (value: string, activeChapterId: string | null, chapters: any[], updateActiveBook: (patch: any) => void) => {
      if (!activeChapterId) return
      updateActiveBook({
        chapters: chapters.map((c: any) =>
          c.id === activeChapterId
            ? { ...c, code: value, isModified: true }
            : c
        ),
      })
    },
    []
  )

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
    return () => {
      editorViewRef.current = null
    }
  }, [])

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

import { useUIStore } from '../store/useUIStore'

function useUIStore_getSelectedColors() {
  return {
    selectedColor: useUIStore.getState().selectedColor,
    selectedBgColor: useUIStore.getState().selectedBgColor,
  }
}

function useUIStore_setSelectedColor(c: string) {
  useUIStore.getState().set({ selectedColor: c })
}

function useUIStore_setSelectedBgColor(c: string) {
  useUIStore.getState().set({ selectedBgColor: c })
}