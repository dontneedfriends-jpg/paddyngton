import { useEffect, useRef } from 'react'
import { undo, redo } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { useUIStore } from '../store/useUIStore'
import { useSettingsStore } from '../store/useSettingsStore'

interface ShortcutActions {
  createNewBook: () => void
  saveChapter: () => void
  addChapter: () => void
  editorViewRef: React.RefObject<EditorView | null>
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const showCommandPalette = useUIStore((s) => s.showCommandPalette)
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (inInput && !e.ctrlKey && !e.metaKey) return

      const ui = useUIStore.getState()

      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyK') {
          e.preventDefault()
          useUIStore.getState().set({
            showCommandPalette: true,
            commandQuery: '',
          })
        } else if (e.code === 'KeyO' && !e.shiftKey) {
          e.preventDefault()
          useUIStore.getState().set({
            showBookDialog: true,
            bookDialogMode: 'open',
          })
        } else if (e.code === 'KeyO' && e.shiftKey) {
          e.preventDefault()
          actionsRef.current.createNewBook()
        } else if (e.code === 'KeyS') {
          e.preventDefault()
          actionsRef.current.saveChapter()
        } else if (e.code === 'KeyN' && !e.shiftKey) {
          e.preventDefault()
          actionsRef.current.addChapter()
        } else if (e.code === 'KeyB') {
          e.preventDefault()
          useUIStore.getState().set({ sidebarOpen: !ui.sidebarOpen })
        } else if (e.code === 'KeyT') {
          e.preventDefault()
          useSettingsStore.getState().cycleTheme()
        } else if (e.code === 'KeyF' && e.shiftKey) {
          e.preventDefault()
          useUIStore.getState().set({ showSearch: true, searchQuery: '' })
        } else if (e.code === 'Comma') {
          e.preventDefault()
          useUIStore.getState().set({ showSettings: true })
        } else if (e.code === 'KeyZ' && !e.shiftKey) {
          e.preventDefault()
          if (actionsRef.current.editorViewRef.current) undo(actionsRef.current.editorViewRef.current)
        } else if (
          e.code === 'KeyY' ||
          (e.code === 'KeyZ' && e.shiftKey)
        ) {
          e.preventDefault()
          if (actionsRef.current.editorViewRef.current) redo(actionsRef.current.editorViewRef.current)
        } else if (e.code === 'KeyC' && !inInput) {
          e.preventDefault()
          document.execCommand('copy')
        } else if (e.code === 'KeyV' && !inInput) {
          e.preventDefault()
          document.execCommand('paste')
        } else if (e.code === 'KeyX' && !inInput) {
          e.preventDefault()
          document.execCommand('cut')
        }
      }
      if (e.code === 'Escape') {
        useUIStore.getState().set({ showCommandPalette: false })
        useUIStore.getState().closeAllPanels()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (showCommandPalette && inputRef.current) inputRef.current.focus()
  }, [showCommandPalette])

  return { inputRef }
}