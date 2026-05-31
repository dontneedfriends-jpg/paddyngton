import { useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { VersionSnapshot } from '../types'
import { useBookStore } from '../store/useBookStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useUIStore } from '../store/useUIStore'
import { saveAllBookData } from '../lib/bookIO'

function getActiveBook() {
  const state = useBookStore.getState()
  return state.openBooks.find((b) => b.id === state.activeBookId) || null
}

export function useAutoSave() {
  const activeBookId = useBookStore((s) => s.activeBookId)
  const settings = useSettingsStore((s) => s.settings)
  const showToast = useUIStore((s) => s.showToast)
  const setUI = useUIStore((s) => s.set)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (!activeBookId || settings.autoSnapshotMinutes <= 0) return
    const interval = setInterval(() => {
      const book = getActiveBook()
      if (!book) return
      ;(async () => {
        await saveAllBookData(book)
        setUI({ lastSavedAt: Date.now() })
        try {
          await invoke<VersionSnapshot>('save_version_snapshot', {
            bookDir: book.dir,
            label: `Auto-save ${new Date().toLocaleString()}`,
          })
          const s = settingsRef.current
          if (s.autoSaveToast) showToast('Auto-snapshot created', 'info')
        } catch {}
      })()
    }, settings.autoSnapshotMinutes * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeBookId, settings.autoSnapshotMinutes, setUI, showToast])

  useEffect(() => {
    if (!activeBookId) return
    const interval = setInterval(() => {
      const book = getActiveBook()
      if (!book) return
      saveAllBookData(book).then(() => {
        setUI({ lastSavedAt: Date.now() })
        const s = settingsRef.current
        if (s.autoSaveToast) showToast('Book auto-saved', 'info')
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [activeBookId, settings.autoSaveToast, setUI, showToast])
}