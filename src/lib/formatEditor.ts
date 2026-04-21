import { FormatButton } from '../types'
import { MARKER_CLOSERS } from '../constants'
import { EditorView } from '@codemirror/view'

export function getCloseMarker(marker: string): string {
  return MARKER_CLOSERS[marker] || marker
}

export function applyFormat(
  fmt: FormatButton,
  view: EditorView,
  options: {
    selectedColor: string
    selectedBgColor: string
    setInputDialog: (d: {
      title: string
      label: string
      defaultValue: string
      multiline?: boolean
      onSubmit: (value: string) => void
    } | null) => void
    setSelectedColor: (c: string) => void
    setSelectedBgColor: (c: string) => void
  }
): void {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const doc = view.state.doc

  switch (fmt.type) {
    case 'sep':
      return

    case 'line': {
      const line = doc.lineAt(from)
      const lineText = doc.sliceString(line.from, line.to)
      const prefix = fmt.value || ''
      if (lineText.startsWith(prefix)) {
        const newText = lineText.slice(prefix.length)
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: newText },
          selection: { anchor: line.from },
        })
      } else {
        view.dispatch({
          changes: { from: line.from, insert: prefix },
          selection: { anchor: from + prefix.length },
        })
      }
      break
    }

    case 'block': {
      const insert = fmt.value || '\n---\n'
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
      })
      break
    }

    case 'wrap': {
      const marker = fmt.value || ''
      const closeMarker = getCloseMarker(marker)
      if (selected) {
        view.dispatch({
          changes: {
            from,
            to,
            insert: marker + selected + closeMarker,
          },
          selection: {
            anchor: from + marker.length,
            head: from + marker.length + selected.length,
          },
        })
      } else {
        const placeholder = 'text'
        const insert = marker + placeholder + closeMarker
        view.dispatch({
          changes: { from, to, insert },
          selection: {
            anchor: from + marker.length,
            head: from + marker.length + placeholder.length,
          },
        })
      }
      break
    }

    case 'align': {
      const align = fmt.value || 'left'
      const line = doc.lineAt(from)
      const lineText = doc.sliceString(line.from, line.to)
      const wrapped = `<div align="${align}">${lineText}</div>`
      view.dispatch({
        changes: {
          from: line.from,
          to: line.to,
          insert: wrapped,
        },
        selection: { anchor: line.from + `<div align="${align}">`.length },
      })
      break
    }

    case 'codeblock': {
      if (selected) {
        view.dispatch({
          changes: {
            from,
            to,
            insert: '```\n' + selected + '\n```',
          },
          selection: {
            anchor: from + 4,
            head: from + 4 + selected.length,
          },
        })
      } else {
        view.dispatch({
          changes: { from, to, insert: '```\n\n```' },
          selection: { anchor: from + 4 },
        })
      }
      break
    }

    case 'color': {
      const colorInput = document.querySelector<HTMLInputElement>(
        'input[type="color"].color-input-hidden'
      )
      colorInput?.click()
      break
    }

    case 'bgColor': {
      const bgColorInput = document.querySelector<HTMLInputElement>(
        'input[type="color"].bgcolor-input-hidden'
      )
      bgColorInput?.click()
      break
    }

    case 'link': {
      options.setInputDialog({
        title: 'Insert Link',
        label: 'Enter URL:',
        defaultValue: selected ? '' : 'https://',
        onSubmit: (url) => {
          if (!url) return
          const v = view
          const { from: f, to: t } = v.state.selection.main
          const text = v.state.sliceDoc(f, t) || 'link text'
          v.dispatch({
            changes: { from: f, to: t, insert: `[${text}](${url})` },
            selection: { anchor: f, head: f + text.length + url.length + 4 },
          })
        },
      })
      break
    }

    case 'fontFamily':
    case 'fontSize':
      break
  }

  view.focus()
}

export function applyColor(
  color: string,
  isBg: boolean,
  view: EditorView
): void {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const prop = isBg ? 'background-color' : 'color'
  if (selected) {
    const insert = `<span style="${prop}:${color}">${selected}</span>`
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from, head: from + insert.length },
    })
  } else {
    const placeholder = 'text'
    const insert = `<span style="${prop}:${color}">${placeholder}</span>`
    view.dispatch({
      changes: { from, to, insert },
      selection: {
        anchor: from + `<span style="${prop}:${color}">`.length,
        head: from + insert.length - `</span>`.length,
      },
    })
  }
  view.focus()
}