import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { VersionSnapshot } from '../types'
import { useBookStore } from '../store/useBookStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useUIStore } from '../store/useUIStore'
import { saveAllBookData } from '../lib/bookIO'

export function useAutoSave() {
  const activeBook = useBookStore((s) => {
    const id = s.activeBookId
    return s.openBooks.find((b) => b.id === id) || null
  })
  const settings = useSettingsStore((s) => s.settings)
  const showToast = useUIStore((s) => s.showToast)
  const setUI = useUIStore((s) => s.set)

  useEffect(() => {
    if (!activeBook || settings.autoSnapshotMinutes <= 0) return
    const interval = setInterval(() => {
      ;(async () => {
        await saveAllBookData(activeBook)
        setUI({ lastSavedAt: Date.now() })
        try {
          await invoke<VersionSnapshot>('save_version_snapshot', {
            bookDir: activeBook.dir,
            label: `Auto-save ${new Date().toLocaleString()}`,
          })
          showToast('Auto-snapshot created', 'info')
        } catch {}
      })()
    }, settings.autoSnapshotMinutes * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeBook, settings.autoSnapshotMinutes, setUI, showToast])

  useEffect(() => {
    if (!activeBook) return
    const interval = setInterval(() => {
      saveAllBookData(activeBook).then(() => {
        setUI({ lastSavedAt: Date.now() })
        if (settings.autoSaveToast) showToast('Book auto-saved', 'info')
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [activeBook, settings.autoSaveToast, setUI, showToast])
}