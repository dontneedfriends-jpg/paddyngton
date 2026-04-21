import React from 'react'
import { User, X, BookOpen, Map } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import { ContextEntry, Relation, RELATION_COLORS, CONTEXT_TEMPLATES } from '../../types'

const relationColors = RELATION_COLORS

export const ContextEditor: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const bookManager = useBookManager(t)

  if (!ui.showContextEditor || !activeBook) return null
  const contextData = activeBook.contextData

  return (
    <div className="modal-overlay" onClick={() => setUI({ showContextEditor: false, mindMapEditEntry: null })}>
      <div className="editor-panel context-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{t('context.title')}</h2>
          <div className="panel-header-actions">
            {ui.mindMapEditEntry && (
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} />{ui.mindMapEditEntry.name}</span>
            )}
            <button className="btn btn-sm" onClick={() => setUI({ showWiki: true })}><BookOpen size={12} /> Wiki</button>
            <button className="btn btn-sm" onClick={() => setUI({ showMindMap: true, mindMapEditEntry: null })}><Map size={12} /> Map</button>
            <button className="btn-icon" onClick={() => setUI({ showContextEditor: false, mindMapEditEntry: null })}><X size={14} /></button>
          </div>
        </div>
        <div className="panel-content">
          {ui.mindMapEditEntry && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--accent)', color: 'var(--near-white)', borderRadius: '8px', fontSize: '13px' }}>
              Editing: <strong>{ui.mindMapEditEntry.name}</strong>
              {ui.mindMapEditEntry.relations && ui.mindMapEditEntry.relations.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                  Relations: {ui.mindMapEditEntry.relations.map(r => `${r.name} (${t('relations.' + r.type)})`).join(', ')}
                </div>
              )}
            </div>
          )}
          <div className="context-list">
            {(ui.mindMapEditEntry ? [contextData.find(e => e.name === ui.mindMapEditEntry!.name) || contextData[0]] : contextData).filter(Boolean).map((ctx, i) => (
              <div key={i} className="context-card">
                <div className="context-card-header">
                  <input type="text" className="context-name-input" value={ctx!.name}
                    onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].name = e.target.value; updateActiveBook({ contextData: d }) }} />
                  <select className="context-type-select" value={ctx!.type}
                    onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].type = e.target.value as ContextEntry['type']; updateActiveBook({ contextData: d }) }}>
                    <option value="character">[C] {t('context.types.character')}</option>
                    <option value="place">[P] {t('context.types.place')}</option>
                    <option value="date">[D] {t('context.types.date')}</option>
                    <option value="item">[I] {t('context.types.item')}</option>
                  </select>
                  <input type="text" placeholder={t('context.group')} style={{ padding: '4px 8px', background: 'var(--white)', border: '1px solid var(--border-gray)', borderRadius: '6px', fontSize: '12px', width: '100px', color: 'var(--near-black)', fontFamily: 'inherit' }}
                    value={ctx!.group || ''} onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].group = e.target.value; updateActiveBook({ contextData: d }) }} />
                  {!ui.mindMapEditEntry && (
                    <button className="btn-icon" onClick={() => { const d = contextData.filter((_, idx) => idx !== i); updateActiveBook({ contextData: d }) }}><X size={12} /></button>
                  )}
                </div>
                {ctx!.type === 'character' && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginBottom: '4px', fontWeight: 600 }}>RELATIONS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {(ctx!.relations || []).map((rel, ri) => (
                        <span key={ri} className="relation-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: relationColors[rel.type], color: 'var(--near-white)', borderRadius: '12px', fontSize: '11px' }}>
                          [C] {rel.name}
                          <span style={{ opacity: 0.7, fontSize: '9px' }}>{t('relations.' + rel.type)}</span>
                          <button style={{ background: 'none', border: 'none', color: 'var(--near-white)', cursor: 'pointer', padding: '0', fontSize: '12px', lineHeight: 1 }} onClick={() => {
                            const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                            if (idx >= 0) d[idx].relations = (d[idx].relations || []).filter((r: Relation) => r.name !== rel.name)
                            updateActiveBook({ contextData: d })
                          }}><X size={10} /></button>
                        </span>
                      ))}
                      <button className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => {
                        setUI({ inputDialog: { title: 'Add Relation', label: 'Character name:', defaultValue: '', onSubmit: (name) => {
                          if (name && name.trim()) {
                            const relTypes: Relation['type'][] = ['ally', 'enemy', 'family', 'neutral', 'romantic', 'rival']
                            setUI({ inputDialog: { title: 'Relation Type', label: 'Select relation type:', defaultValue: 'ally', onSubmit: (type) => {
                              const relType = relTypes.includes(type as Relation['type']) ? type as Relation['type'] : 'neutral'
                              const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                              if (idx >= 0) {
                                if (!d[idx].relations) d[idx].relations = []
                                if (!d[idx].relations!.find((r: Relation) => r.name === name.trim())) d[idx].relations = [...d[idx].relations!, { name: name.trim(), type: relType }]
                              }
                              updateActiveBook({ contextData: d })
                            }}})
                          }
                        }}})
                      }}>[+] Rel</button>
                    </div>
                  </div>
                )}
                <div className="context-details">
                  {Object.entries(ctx!.details).map(([key, value], j) => (
                    <div key={j} className="detail-row">
                      <input type="text" className="detail-key-input" value={key} placeholder={t('context.property')}
                        onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) { const nd: Record<string, string> = {}; Object.entries(d[idx].details).forEach(([k, v], idx2) => { nd[idx2 === j ? e.target.value : k] = v }); d[idx].details = nd }; updateActiveBook({ contextData: d }) }} />
                      <input type="text" className="detail-value-input" value={value} placeholder="Value"
                        onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[key] = e.target.value; updateActiveBook({ contextData: d }) }} />
                      <button className="btn-icon" onClick={() => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) delete d[idx].details[key]; updateActiveBook({ contextData: d }) }}><X size={12} /></button>
                    </div>
                  ))}
                  <button className="btn btn-sm" onClick={() => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[`prop${Object.keys(ctx!.details).length + 1}`] = ''; updateActiveBook({ contextData: d }) }}>+ {t('context.addProperty')}</button>
                </div>
              </div>
            ))}
          </div>
          {!ui.mindMapEditEntry && (
            <>
              {!ui.showTemplateSelector ? (
                <button className="btn btn-primary" onClick={() => setUI({ showTemplateSelector: true })}>+ {t('context.add')}</button>
              ) : (
                <div className="template-selector">
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choose type</div>
                  <div className="template-types">
                    {(['character', 'place', 'date', 'item'] as const).map(type => {
                      const typeLabel = type === 'character' ? 'Character' : type === 'place' ? 'Place' : type === 'date' ? 'Date/Event' : 'Item'
                      return (
                        <button key={type} className="template-type-btn" onClick={() => {
                          setUI({ inputDialog: { title: `Add ${typeLabel}`, label: `${typeLabel} name:`, defaultValue: '', onSubmit: (name) => {
                            if (name && name.trim()) {
                              const details: Record<string, string> = {}
                              Object.keys(CONTEXT_TEMPLATES[type]).forEach(k => { details[k] = '' })
                              updateActiveBook({ contextData: [...contextData, { name: name.trim(), type, details, group: '', relations: [], notes: '' }] })
                            }
                            setUI({ showTemplateSelector: false })
                          }} })
                        }}>
                          <span style={{ fontSize: '24px' }}>{type === 'character' ? '[C]' : type === 'place' ? '[P]' : type === 'date' ? '[D]' : '[I]'}</span>
                          <span>{typeLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button className="btn btn-sm" style={{ marginTop: '8px' }} onClick={() => setUI({ showTemplateSelector: false })}>Cancel</button>
                </div>
              )}
            </>
          )}
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={async () => { await bookManager.saveContext(); setUI({ showContextEditor: false, mindMapEditEntry: null }) }}>{t('context.save')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
