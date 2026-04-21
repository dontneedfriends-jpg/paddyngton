import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import { Clock, Save, FileText, Scissors, RotateCcw, BookOpen, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import { extractGroups } from '../../lib/contextHelpers'
import { VersionSnapshot, ContextEntry, BookConfig } from '../../types'

export const VersionsPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const openBooks = useBookStore((s) => s.openBooks)
  const activeBookId = useBookStore((s) => s.activeBookId)
  const bookManager = useBookManager(t)

  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [snapshotLabel, setSnapshotLabel] = useState('')

  useEffect(() => {
    if (!ui.showVersions || !activeBook) return
    const load = async () => {
      try {
        const snaps = await invoke<VersionSnapshot[]>('list_version_snapshots', { bookDir: activeBook.dir })
        setVersions(snaps)
      } catch (err) {
        console.error('Error loading versions:', err)
      }
    }
    load()
  }, [ui.showVersions, activeBook])

  const createSnapshot = async () => {
    if (!activeBook) return
    const label = snapshotLabel.trim() || new Date().toLocaleString()
    try {
      await bookManager.saveAllBookData()
      const snap = await invoke<VersionSnapshot>('save_version_snapshot', { bookDir: activeBook.dir, label })
      setVersions((prev) => [snap, ...prev])
      setSnapshotLabel('')
      useUIStore.getState().showToast('Snapshot created', 'success')
    } catch (err) {
      console.error('Error creating snapshot:', err)
      useUIStore.getState().showToast('Failed to create snapshot', 'error')
    }
  }

  const restoreSnapshot = async (snapshotId: string) => {
    if (!activeBook) return
    confirmAction('Restore this version? Current files will be overwritten.', async () => {
      try {
        const bookDir = activeBook.dir
        await invoke('restore_version_snapshot', { bookDir, snapshotId })
        useBookStore.setState({
          openBooks: openBooks.filter((b) => b.id !== activeBook.id),
          activeBookId: activeBookId === activeBook.id ? null : activeBookId,
        })
        let contextData: ContextEntry[] = []
        let bookConfig: BookConfig | null = null
        const contextPath = `${bookDir}/.context.json`
        const bookConfigPath = `${bookDir}/.book.json`
        if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
        if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
        const groups = extractGroups(contextData, t('context.noGroup'))
        bookManager.loadBook(bookDir, contextData, groups, bookConfig)
        useUIStore.getState().showToast('Version restored', 'success')
      } catch (err) {
        console.error('Error restoring snapshot:', err)
        useUIStore.getState().showToast('Failed to restore version', 'error')
      }
    })
  }

  if (!ui.showVersions) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showVersions: false })}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>
            <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Version History
          </h2>
          <button className="btn-icon" onClick={() => setUI({ showVersions: false })}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-gray)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Snapshot label (optional)"
            value={snapshotLabel}
            onChange={(e) => setSnapshotLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createSnapshot()
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={createSnapshot}>
            <Save size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Snapshot
          </button>
        </div>
        <div className="search-results">
          {versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>
              No snapshots yet. Save a snapshot to create a restore point.
            </div>
          ) : (
            versions.map((v, i) => (
              <div key={i} className="search-result-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div className="search-result-entry">
                    <span className="search-result-entry-name">{v.label}</span>
                    <span className="search-result-type">{v.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>
                      <FileText size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                      {v.word_count.toLocaleString()} words
                    </span>
                    <span>
                      <Scissors size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                      {v.char_count.toLocaleString()} chars
                    </span>
                    <span>
                      <BookOpen size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                      {v.chapter_count} chapters
                    </span>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => restoreSnapshot(v.id)}>
                  <RotateCcw size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
