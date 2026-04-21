import { invoke } from '@tauri-apps/api/core'
import { VersionSnapshot } from '../types'
import { useBookStore } from '../store/useBookStore'
import { useUIStore } from '../store/useUIStore'

export function useVersions() {
  const openBooks = useBookStore((s) => s.openBooks)
  const activeBookId = useBookStore((s) => s.activeBookId)
  const showToast = useUIStore((s) => s.showToast)

  const loadVersions = async (): Promise<VersionSnapshot[]> => {
    const book = openBooks.find((b) => b.id === activeBookId)
    if (!book) return []
    try {
      return await invoke<VersionSnapshot[]>('list_version_snapshots', {
        bookDir: book.dir,
      })
    } catch (err) {
      console.error('Error loading versions:', err)
      return []
    }
  }

  const createSnapshot = async (label: string): Promise<VersionSnapshot | null> => {
    const book = openBooks.find((b) => b.id === activeBookId)
    if (!book) return null
    try {
      const snap = await invoke<VersionSnapshot>('save_version_snapshot', {
        bookDir: book.dir,
        label: label || new Date().toLocaleString(),
      })
      showToast('Snapshot created', 'success')
      return snap
    } catch (err) {
      console.error('Error creating snapshot:', err)
      showToast('Failed to create snapshot', 'error')
      return null
    }
  }

  const restoreSnapshot = async (snapshotId: string): Promise<boolean> => {
    const book = openBooks.find((b) => b.id === activeBookId)
    if (!book) return false
    try {
      await invoke('restore_version_snapshot', { snapshotId, bookDir: book.dir })
      showToast('Version restored', 'success')
      return true
    } catch (err) {
      console.error('Error restoring snapshot:', err)
      showToast('Failed to restore version', 'error')
      return false
    }
  }

  return { loadVersions, createSnapshot, restoreSnapshot }
}