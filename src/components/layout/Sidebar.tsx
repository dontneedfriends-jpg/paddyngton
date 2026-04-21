import React from 'react'
import './Sidebar.css'
import { User, MapPin, CalendarDays, Box, BookOpen, GitGraph } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'

export const Sidebar: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const bookManager = useBookManager(t)

  if (!ui.sidebarOpen || !activeBook) return null

  const chapters = activeBook.chapters
  const activeChapterId = activeBook.activeChapterId
  const contextData = activeBook.contextData
  const contextGroups = activeBook.contextGroups

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{t('sidebar.chapters')}</span>
      </div>
      <div className="chapter-list">
        {chapters.map((ch, i) => (
          <div
            key={ch.id}
            className={`chapter-item ${ch.id === activeChapterId ? 'active' : ''}`}
            onClick={() => updateActiveBook({ activeChapterId: ch.id })}
            onDoubleClick={() => bookManager.startRenameChapter(ch.id)}
          >
            <span className="chapter-number">{i + 1}</span>
            {ch.renaming ? (
              <input
                className="chapter-name-input"
                defaultValue={ch.name}
                autoFocus
                onBlur={(e) => bookManager.finishRenameChapter(ch.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') bookManager.finishRenameChapter(ch.id, (e.target as HTMLInputElement).value)
                  if (e.key === 'Escape')
                    updateActiveBook({ chapters: chapters.map((c) => (c.id === ch.id ? { ...c, renaming: false } : c)) })
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="chapter-name">{ch.name}</span>
            )}
            {ch.isModified && !ch.renaming && <span className="modified-dot">•</span>}
            <button
              className="chapter-delete"
              onClick={(e) => {
                e.stopPropagation()
                confirmAction(t('chapter.deleteConfirm'), () => bookManager.deleteChapter(ch.id))
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="btn btn-sm chapter-add" onClick={bookManager.addChapter}>
          +
        </button>
      </div>
      {contextData.length > 0 && (
        <div className="context-section">
          <div className="context-header">
            {t('sidebar.context')}
            <div className="context-header-right">
              <button
                className="btn btn-sm"
                onClick={() => {
                  const newEntry = { name: '', type: 'character' as const, details: {}, relations: [], notes: '' }
                  updateActiveBook({ contextData: [...contextData, newEntry] })
                  setUI({ showContextEditor: true })
                }}
              >
                +
              </button>
              <button className="btn btn-sm" onClick={() => setUI({ showWiki: true })}>
                <BookOpen size={14} />
              </button>
              <button className="btn btn-sm" onClick={() => setUI({ showMindMap: true })}>
                <GitGraph size={14} />
              </button>
            </div>
          </div>
          {contextGroups.map((g, gi) => {
            const items = contextData.filter((c) => (c.group || t('context.noGroup')) === g.name)
            return (
              <div key={gi}>
                <div className="context-group-label">{g.name}</div>
                {items.map((ctx, i) => (
                  <div
                    key={i}
                    className="context-item"
                    title={Object.entries(ctx.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                    onDoubleClick={() => setUI({ showContextEditor: true, mindMapEditEntry: ctx })}
                  >
                    <span className="context-icon">
                      {ctx.type === 'character' ? (
                        <User size={12} />
                      ) : ctx.type === 'place' ? (
                        <MapPin size={12} />
                      ) : ctx.type === 'date' ? (
                        <CalendarDays size={12} />
                      ) : (
                        <Box size={12} />
                      )}
                    </span>
                    <span className="context-name">{ctx.name}</span>
                    <button
                      className="context-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmAction(`Delete "${ctx.name}"?`, () => {
                          const d = contextData.filter((c) => c.name !== ctx.name)
                          updateActiveBook({ contextData: d })
                        })
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
