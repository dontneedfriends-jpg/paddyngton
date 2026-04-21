import React from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'

export const KanbanPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookManager = useBookManager(t)

  if (!ui.showKanban || !activeBook) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showKanban: false })}>
      <div className="kanban-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>[Board] {t('kanban.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={() => {
              setUI({ inputDialog: { title: t('kanban.addColumn'), label: t('kanban.columnName') + ':', defaultValue: '', onSubmit: (name) => {
                if (name) {
                  const newCol = { id: Date.now().toString(), name, cards: [] }
                  bookManager.updateKanban({ columns: [...activeBook.kanbanData.columns, newCol] })
                }
              }} })
            }}><Plus size={14} /> {t('kanban.addColumn')}</button>
            <button className="btn-icon" onClick={() => setUI({ showKanban: false })}><X size={14} /></button>
          </div>
        </div>
        <div className="kanban-body">
          <div className="kanban-columns">
            {activeBook.kanbanData.columns.map(col => (
              <div key={col.id} className="kanban-column">
                <div className="kanban-col-header">
                  <span>{col.name}</span>
                  <span className="kanban-count">{col.cards.length}</span>
                </div>
                <div className="kanban-cards">
                  {col.cards.map(card => (
                    <div key={card.id} className="kanban-card" style={{ borderLeft: `4px solid ${card.color || 'var(--accent)'}` }}>
                      <div className="kanban-card-title">{card.title}</div>
                      {card.content && <div className="kanban-card-content">{card.content}</div>}
                      <div className="kanban-card-actions">
                        <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                          onClick={() => {
                            setUI({ inputDialog: { title: t('kanban.editCard'), label: t('kanban.cardTitle') + ':', defaultValue: card.title, onSubmit: (title) => {
                              setUI({ inputDialog: { title: t('kanban.cardContent'), label: t('kanban.cardContent') + ':', defaultValue: card.content, multiline: true, onSubmit: (content) => {
                                bookManager.updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                                  ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, title, content } : k)
                                } : c) })
                              }}})
                            }}})
                          }}><Pencil size={11} /></button>
                        <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                          onClick={() => {
                            confirmAction(t('kanban.deleteCard'), () => {
                              bookManager.updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                                ...c, cards: c.cards.filter(k => k.id !== card.id)
                              } : c) })
                            })
                          }}><Trash2 size={11} /></button>
                        <select className="kanban-move" style={{ fontSize: '11px', padding: '2px' }}
                          value="" onChange={e => {
                            if (e.target.value) {
                              const cardData = col.cards.find(k => k.id === card.id)!
                              bookManager.updateKanban({
                                columns: activeBook.kanbanData.columns.map(c => {
                                  if (c.id === col.id) return { ...c, cards: c.cards.filter(k => k.id !== card.id) }
                                  if (c.id === e.target.value) return { ...c, cards: [...c.cards, cardData] }
                                  return c
                                })
                              })
                              e.target.value = ''
                            }
                          }}>
                          <option value="">Move to...</option>
                          {activeBook.kanbanData.columns.filter(c => c.id !== col.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-sm" style={{ width: '100%', marginTop: '8px' }}
                  onClick={() => {
                    setUI({ inputDialog: { title: t('kanban.addCard'), label: t('kanban.cardTitle') + ':', defaultValue: '', onSubmit: (title) => {
                      if (title) {
                        setUI({ inputDialog: { title: t('kanban.cardContent'), label: t('kanban.cardContent') + ':', defaultValue: '', multiline: true, onSubmit: (content) => {
                          const colors = ['var(--accent)', 'var(--danger)', 'var(--success)', 'var(--purple)', 'var(--cool-gray)']
                          const color = colors[Math.floor(Math.random() * colors.length)]
                          bookManager.updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                            ...c, cards: [...c.cards, { id: Date.now().toString(), title, content, color }]
                          } : c) })
                        }}})
                      }
                    }}})
                  }}><Plus size={14} /> {t('kanban.addCard')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
