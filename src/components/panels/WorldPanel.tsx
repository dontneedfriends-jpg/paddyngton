import React, { useState, useMemo } from 'react'
import './WorldPanel.css'
import { Plus, X, Search, Globe } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import { DEFAULT_WORLD_CATEGORIES } from '../../types'

export const WorldPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookManager = useBookManager(t)

  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCustomCategory, setNewCustomCategory] = useState('')
  const [customCategories, setCustomCategories] = useState<string[]>([])

  React.useEffect(() => {
    if (!activeBook) return
    const used = new Set(activeBook.worldData.map((e) => e.category))
    const predefined = new Set(DEFAULT_WORLD_CATEGORIES)
    setCustomCategories([...used].filter((c) => c && !predefined.has(c as any)))
  }, [activeBook])

  const worldData = activeBook?.worldData || []
  const contextData = activeBook?.contextData || []

  const filtered = useMemo(() => {
    return worldData.filter((entry) => {
      if (filterCategory && entry.category !== filterCategory) return false
      if (searchQuery && !entry.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [worldData, filterCategory, searchQuery])

  if (!ui.showWorld || !activeBook) return null

  const availableCategories = [...DEFAULT_WORLD_CATEGORIES, ...customCategories]

  const resetAddForm = () => {
    setNewTitle('')
    setNewCategory('')
    setNewCustomCategory('')
    setShowAddForm(false)
  }

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!title) return
    let category = newCategory
    if (category === '__new__' && newCustomCategory.trim()) {
      category = newCustomCategory.trim()
      if (!customCategories.includes(category)) {
        setCustomCategories([...customCategories, category])
      }
    }
    const entry = {
      id: Date.now().toString(),
      title,
      content: '',
      category: category || '',
      characterIds: [] as string[],
    }
    bookManager.updateWorld([...worldData, entry])
    resetAddForm()
  }

  return (
    <div className="modal-overlay" onClick={() => setUI({ showWorld: false })}>
      <div className="world-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2><Globe size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />{t('world.title')}</h2>
          <div className="panel-header-actions">
            <div className="world-search">
              <Search size={14} />
              <input
                type="text"
                placeholder={t('world.searchEntries')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={14} /> {t('world.addEntry')}
            </button>
            <button className="btn-icon" onClick={() => setUI({ showWorld: false })}><X size={14} /></button>
          </div>
        </div>

        {showAddForm && (
          <div className="world-add-form">
            <input
              type="text"
              className="form-input"
              placeholder={t('world.entryTitle')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <select
              className="form-input world-category-select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="">— {t('world.category')} —</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.startsWith('__') ? cat : t(`world.categories.${cat}` as any)}
                </option>
              ))}
              <option value="__new__">{t('world.newCategory')}</option>
            </select>
            {newCategory === '__new__' && (
              <input
                type="text"
                className="form-input"
                placeholder={t('world.newCategoryHint')}
                value={newCustomCategory}
                onChange={(e) => setNewCustomCategory(e.target.value)}
              />
            )}
            <div className="world-add-actions">
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <Plus size={14} /> {t('world.addEntry')}
              </button>
              <button className="btn btn-sm" onClick={resetAddForm}>{t('dialogs.cancel')}</button>
            </div>
          </div>
        )}

        <div className="world-category-filter">
          <button
            className={`world-filter-btn ${!filterCategory ? 'active' : ''}`}
            onClick={() => setFilterCategory('')}
          >
            {t('world.allCategories')}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              className={`world-filter-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            >
              {cat.startsWith('__') ? cat : t(`world.categories.${cat}` as any)}
              <span className="world-filter-count">
                {worldData.filter((e) => e.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        <div className="world-body">
          {filtered.length === 0 ? (
            <div className="world-empty">
              {searchQuery || filterCategory
                ? t('search.noResults')
                : t('world.noEntries')}
            </div>
          ) : (
            <div className="world-grid">
              {filtered.map((entry) => (
                <div key={entry.id} className="world-card">
                  <div className="world-card-header">
                    <span className="world-card-title">{entry.title}</span>
                    {entry.category && (
                      <span className="world-card-category" data-category={entry.category}>
                        {t(`world.categories.${entry.category}` as any)}
                      </span>
                    )}
                    <button
                      className="btn-icon btn-icon-sm"
                      onClick={() =>
                        confirmAction(t('world.deleteEntry'), () =>
                          bookManager.updateWorld(worldData.filter((e) => e.id !== entry.id))
                        )
                      }
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className="world-card-meta">
                    <input
                      type="text"
                      className="world-meta-input"
                      placeholder={t('world.datePlaceholder')}
                      value={entry.date || ''}
                      onChange={(e) =>
                        bookManager.updateWorld(
                          worldData.map((w) =>
                            w.id === entry.id ? { ...w, date: e.target.value } : w
                          )
                        )
                      }
                    />
                    <select
                      className="world-meta-select"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value
                        if (val && !(entry.characterIds || []).includes(val)) {
                          bookManager.updateWorld(
                            worldData.map((w) =>
                              w.id === entry.id
                                ? { ...w, characterIds: [...(w.characterIds || []), val] }
                                : w
                            )
                          )
                        }
                      }}
                    >
                      <option value="">+ {t('context.typeAbbr.character')}</option>
                      {contextData
                        .filter((c) => c.type === 'character' && !(entry.characterIds || []).includes(c.name))
                        .map((c) => (
                          <option key={c.name} value={c.name}>
                            {t('context.typeAbbr.character')} {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {(entry.characterIds || []).length > 0 && (
                    <div className="world-card-chars">
                      {(entry.characterIds || []).map((cid) => {
                        const char = contextData.find((c) => c.name === cid)
                        return char ? (
                          <span
                            key={cid}
                            className="world-char-badge"
                            onClick={() => setUI({ wikiSelected: char, showWiki: true })}
                          >
                            {char.name}
                            <button
                              className="world-char-remove"
                              onClick={(e) => {
                                e.stopPropagation()
                                bookManager.updateWorld(
                                  worldData.map((w) =>
                                    w.id === entry.id
                                      ? { ...w, characterIds: (w.characterIds || []).filter((id) => id !== cid) }
                                      : w
                                  )
                                )
                              }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}

                  <textarea
                    className="world-content"
                    value={entry.content}
                    placeholder={t('world.contentPlaceholder')}
                    onChange={(e) =>
                      bookManager.updateWorld(
                        worldData.map((w) =>
                          w.id === entry.id ? { ...w, content: e.target.value } : w
                        )
                      )
                    }
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
