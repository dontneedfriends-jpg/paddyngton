import React, { useState } from 'react'
import './KanbanPanel.css'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import type { KanbanBoard } from '../../types'

const PRESET_COLORS = [
  { value: 'var(--accent)', name: 'Accent' },
  { value: 'var(--danger)', name: 'Urgent' },
  { value: 'var(--success)', name: 'Success' },
  { value: 'var(--purple)', name: 'Feature' },
  { value: 'var(--cool-gray)', name: 'Note' },
  { value: '#f59e0b', name: 'Warning' },
  { value: '#8b5cf6', name: 'Creative' },
  { value: '#ec4899', name: 'Personal' },
]

export const KanbanPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookManager = useBookManager(t)

  const [addingColId, setAddingColId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].value)

  const [editingCard, setEditingCard] = useState<{ colId: string; cardId: string } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor] = useState(PRESET_COLORS[0].value)

  if (!ui.showKanban || !activeBook) return null

  const kanban = activeBook.kanbanData

  const updateBoard = (patch: Partial<KanbanBoard>) => {
    bookManager.updateKanban({ ...kanban, ...patch })
  }

  const uniqueColors = Array.from(
    new Set(kanban.columns.flatMap((c) => c.cards.map((card) => card.color)))
  ).filter(Boolean)

  const startAdd = (colId: string) => {
    setAddingColId(colId)
    setEditingCard(null)
    setNewTitle('')
    setNewContent('')
    setNewColor(PRESET_COLORS[0].value)
  }

  const cancelAdd = () => {
    setAddingColId(null)
    setNewTitle('')
    setNewContent('')
  }

  const submitAdd = (colId: string) => {
    if (!newTitle.trim()) return
    updateBoard({
      columns: kanban.columns.map((c) =>
        c.id === colId
          ? {
              ...c,
              cards: [
                ...c.cards,
                {
                  id: Date.now().toString(),
                  title: newTitle.trim(),
                  content: newContent.trim(),
                  color: newColor,
                },
              ],
            }
          : c
      ),
    })
    cancelAdd()
  }

  const startEdit = (colId: string, card: { id: string; title: string; content: string; color: string }) => {
    setEditingCard({ colId, cardId: card.id })
    setAddingColId(null)
    setEditTitle(card.title)
    setEditContent(card.content)
    setEditColor(card.color || PRESET_COLORS[0].value)
  }

  const cancelEdit = () => {
    setEditingCard(null)
    setEditTitle('')
    setEditContent('')
  }

  const submitEdit = (colId: string, cardId: string) => {
    if (!editTitle.trim()) return
    updateBoard({
      columns: kanban.columns.map((c) =>
        c.id === colId
          ? {
              ...c,
              cards: c.cards.map((k) =>
                k.id === cardId
                  ? { ...k, title: editTitle.trim(), content: editContent.trim(), color: editColor }
                  : k
              ),
            }
          : c
      ),
    })
    cancelEdit()
  }

  const updateColorLabel = (color: string) => {
    const current = kanban.colorLabels?.[color] || ''
    setUI({
      inputDialog: {
        title: t('kanban.labelColor'),
        label: t('kanban.colorDescription'),
        defaultValue: current,
        onSubmit: (value) => {
          updateBoard({
            colorLabels: { ...(kanban.colorLabels || {}), [color]: value },
          })
        },
      },
    })
  }

  return (
    <div className="modal-overlay" onClick={() => setUI({ showKanban: false })}>
      <div className="kanban-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{t('kanban.boardLabel')} — {t('kanban.title')}</h2>
          <div className="panel-header-actions">
            <button
              className="btn btn-sm"
              onClick={() => {
                setUI({
                  inputDialog: {
                    title: t('kanban.addColumn'),
                    label: t('kanban.columnName') + ':',
                    defaultValue: '',
                    onSubmit: (name) => {
                      if (name) {
                        const newCol = { id: Date.now().toString(), name, cards: [] }
                        updateBoard({
                          columns: [...kanban.columns, newCol],
                        })
                      }
                    },
                  },
                })
              }}
            >
              <Plus size={14} /> {t('kanban.addColumn')}
            </button>
            <button className="btn-icon" onClick={() => setUI({ showKanban: false })}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Color Legend */}
        {uniqueColors.length > 0 && (
          <div className="kanban-legend">
            {uniqueColors.map((color) => (
              <button
                key={color}
                className="kanban-legend-item"
                onClick={() => updateColorLabel(color)}
                title={t('kanban.clickToLabel')}
              >
                <span className="kanban-legend-dot" style={{ background: color }} />
                <span className="kanban-legend-text">
                  {kanban.colorLabels?.[color] || t('kanban.clickToLabel')}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="kanban-body">
          <div className="kanban-columns">
            {kanban.columns.map((col) => (
              <div key={col.id} className="kanban-column">
                <div className="kanban-col-header">
                  <span>{col.name}</span>
                  <span className="kanban-count">{col.cards.length}</span>
                </div>
                <div className="kanban-cards">
                  {col.cards.map((card) => (
                    <div key={card.id}>
                      {editingCard?.cardId === card.id ? (
                        <div
                          className="kanban-card kanban-edit-form"
                          style={{ borderLeft: `4px solid ${editColor || 'var(--accent)'}` }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            placeholder={t('kanban.cardTitlePlaceholder')}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) submitEdit(col.id, card.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                          />
                          <textarea
                            className="form-textarea"
                            placeholder={t('kanban.cardContentPlaceholder')}
                            rows={2}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                          <div className="kanban-color-picker">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                className={`kanban-color-btn ${editColor === c.value ? 'active' : ''}`}
                                style={{ background: c.value }}
                                title={c.name}
                                onClick={() => setEditColor(c.value)}
                              />
                            ))}
                          </div>
                          <div className="kanban-add-actions">
                            <button className="btn btn-sm" onClick={cancelEdit}>
                              {t('kanban.cancel')}
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => submitEdit(col.id, card.id)}
                              disabled={!editTitle.trim()}
                            >
                              <Check size={14} /> {t('kanban.save')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="kanban-card"
                          style={{ borderLeft: `4px solid ${card.color || 'var(--accent)'}` }}
                        >
                          <div className="kanban-card-title">{card.title}</div>
                          {card.content && (
                            <div className="kanban-card-content">{card.content}</div>
                          )}
                          <div className="kanban-card-actions">
                            <button
                              className="btn-icon"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => startEdit(col.id, card)}
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              className="btn-icon"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => {
                                confirmAction(t('kanban.deleteCard'), () => {
                                  updateBoard({
                                    columns: kanban.columns.map((c) =>
                                      c.id === col.id
                                        ? { ...c, cards: c.cards.filter((k) => k.id !== card.id) }
                                        : c
                                    ),
                                  })
                                })
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                            <select
                              className="kanban-move"
                              style={{ fontSize: '11px', padding: '2px' }}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const cardData = col.cards.find((k) => k.id === card.id)!
                                  updateBoard({
                                    columns: kanban.columns.map((c) => {
                                      if (c.id === col.id)
                                        return { ...c, cards: c.cards.filter((k) => k.id !== card.id) }
                                      if (c.id === e.target.value)
                                        return { ...c, cards: [...c.cards, cardData] }
                                      return c
                                    }),
                                  })
                                  e.target.value = ''
                                }
                              }}
                            >
                              <option value="">{t('kanban.moveTo')}</option>
                              {kanban.columns
                                .filter((c) => c.id !== col.id)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Inline Add Card Form */}
                  {addingColId === col.id ? (
                    <div className="kanban-add-form">
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t('kanban.cardTitlePlaceholder')}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) submitAdd(col.id)
                          if (e.key === 'Escape') cancelAdd()
                        }}
                      />
                      <textarea
                        className="form-textarea"
                        placeholder={t('kanban.cardContentPlaceholder')}
                        rows={2}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                      <div className="kanban-color-picker">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            className={`kanban-color-btn ${newColor === c.value ? 'active' : ''}`}
                            style={{ background: c.value }}
                            title={c.name}
                            onClick={() => setNewColor(c.value)}
                          />
                        ))}
                      </div>
                      <div className="kanban-add-actions">
                        <button className="btn btn-sm" onClick={cancelAdd}>
                          {t('kanban.cancel')}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => submitAdd(col.id)}
                          disabled={!newTitle.trim()}
                        >
                          <Check size={14} /> {t('kanban.add')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm kanban-add-card-btn"
                      onClick={() => startAdd(col.id)}
                    >
                      <Plus size={14} /> {t('kanban.addCard')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
