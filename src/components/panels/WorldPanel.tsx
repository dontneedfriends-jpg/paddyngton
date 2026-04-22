import React from 'react'
import './WorldPanel.css'
import { Plus, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'

export const WorldPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookManager = useBookManager(t)

  if (!ui.showWorld || !activeBook) return null
  const contextData = activeBook.contextData || []

  return (
    <div className="modal-overlay" onClick={() => setUI({ showWorld: false })}>
      <div className="world-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>[World] {t('world.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={() => {
              setUI({ inputDialog: { title: t('world.addEntry'), label: t('world.entryTitle') + ':', defaultValue: '', onSubmit: (title) => {
                if (title) {
                  setUI({ inputDialog: { title: t('world.category'), label: t('world.categoryHint') + ':', defaultValue: '', onSubmit: (category) => {
                    bookManager.updateWorld([...activeBook.worldData, { id: Date.now().toString(), title, content: '', category, characterIds: [] }])
                  }}})
                }
              }}})
            }}><Plus size={14} /> {t('world.addEntry')}</button>
            <button className="btn-icon" onClick={() => setUI({ showWorld: false })}><X size={14} /></button>
          </div>
        </div>
        <div className="world-body">
          {activeBook.worldData.length === 0 ? (
            <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
              {t('world.noEntries')}
            </div>
          ) : (
            <div className="world-grid">
              {activeBook.worldData.map(entry => (
                <div key={entry.id} className="world-card">
                  <div className="world-card-header">
                    <span className="world-card-title">{entry.title}</span>
                    {entry.category && <span className="world-card-category">{entry.category}</span>}
                    {entry.date && <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '6px' }}>{entry.date}</span>}
                    <button className="btn-icon" style={{ fontSize: '12px', padding: '2px', marginLeft: 'auto' }}
                      onClick={() => {
                        confirmAction(t('world.deleteEntry'), () => bookManager.updateWorld(activeBook.worldData.filter(e => e.id !== entry.id)))
                      }}><X size={12} /></button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input type="text" placeholder={t('world.datePlaceholder')}
                      value={entry.date || ''}
                      onChange={e => bookManager.updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, date: e.target.value } : w))}
                      style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-gray)', background: 'var(--bg-secondary)', color: 'var(--text)', width: '100px' }}
                    />
                    <select
                      value=""
                      onChange={e => {
                        if (e.target.value && !entry.characterIds?.includes(e.target.value)) {
                          bookManager.updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, characterIds: [...(w.characterIds || []), e.target.value] } : w))
                        }
                        e.target.value = ''
                      }}
                      style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-gray)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer' }}>
                      <option value="">+ Link character</option>
                      {contextData.filter(c => c.type === 'character' && !entry.characterIds?.includes(c.name)).map(c => (
                        <option key={c.name} value={c.name}>{t('context.typeAbbr.character')} {c.name}</option>
                      ))}
                    </select>
                    {(entry.characterIds || []).map(cid => {
                      const char = contextData.find(c => c.name === cid)
                      return char ? (
                        <span key={cid} style={{ fontSize: '10px', background: 'var(--accent)', color: 'var(--near-white)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setUI({ wikiSelected: char, showWiki: true })}>
                          {t('context.typeAbbr.character')} {char.name}
                          <button style={{ background: 'none', border: 'none', color: 'var(--near-white)', cursor: 'pointer', padding: 0, marginLeft: '2px', lineHeight: 1 }}
                            onClick={(e) => { e.stopPropagation(); bookManager.updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, characterIds: (w.characterIds || []).filter(id => id !== cid) } : w)) }}><X size={10} /></button>
                        </span>
                      ) : null
                    })}
                  </div>
                  <textarea className="world-content" value={entry.content}
                    placeholder={t('world.contentPlaceholder')}
                    onChange={e => bookManager.updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, content: e.target.value } : w))}
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
