import React from 'react'
import { Plus, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'

export const NotesPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookManager = useBookManager(t)

  if (!ui.showNotes || !activeBook) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showNotes: false })}>
      <div className="notes-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>[Notes] {t('notes.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={() => {
              setUI({ inputDialog: { title: t('notes.addNote'), label: t('notes.noteTitle') + ':', defaultValue: '', onSubmit: (title) => {
                if (title) {
                  bookManager.updateNotes([...activeBook.notes, { id: Date.now().toString(), title, content: '', createdAt: new Date().toISOString() }])
                }
              }} })
            }}><Plus size={14} /> {t('notes.addNote')}</button>
            <button className="btn-icon" onClick={() => setUI({ showNotes: false })}><X size={14} /></button>
          </div>
        </div>
        <div className="notes-body">
          {activeBook.notes.length === 0 ? (
            <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
              {t('notes.noNotes')}
            </div>
          ) : (
            <div className="notes-grid">
              {activeBook.notes.map(note => (
                <div key={note.id} className="note-card">
                  <div className="note-card-header">
                    <span className="note-title">{note.title}</span>
                    <button className="btn-icon" style={{ fontSize: '12px', padding: '2px' }}
                      onClick={() => {
                        confirmAction(t('notes.deleteNote'), () => bookManager.updateNotes(activeBook.notes.filter(n => n.id !== note.id)))
                      }}><X size={12} /></button>
                  </div>
                  <textarea className="note-content" value={note.content}
                    placeholder={t('context.notesPlaceholder')}
                    onChange={e => bookManager.updateNotes(activeBook.notes.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
