import React from 'react'
import './WikiPanel.css'
import { BookOpen, User, MapPin, CalendarDays, Box, Pencil, Eye, GitGraph, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import { Relation, RELATION_COLORS } from '../../types'

const relationColors = RELATION_COLORS

export const WikiPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const bookManager = useBookManager(t)

  if (!ui.showWiki || !activeBook) return null
  const contextData = activeBook.contextData
  const contextGroups = activeBook.contextGroups || []

  return (
    <div className="modal-overlay" onClick={() => setUI({ showWiki: false })}>
      <div className="wiki-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2><BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('wiki.title')}</h2>
          <button className="btn-icon" onClick={() => setUI({ showWiki: false })}><X size={14} /></button>
        </div>
        <div className="wiki-body">
          <div className="wiki-sidebar">
            {contextGroups.map((g, gi) => {
              const items = contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
              return (
                <div key={gi} className="wiki-sidebar-section">
                  <div className="wiki-sidebar-title">{g.name}</div>
                  {items.map((item, i) => (
                    <div key={i} className={`wiki-sidebar-item ${ui.wikiSelected?.name === item.name ? 'active' : ''}`}
                      onClick={() => setUI({ wikiSelected: item })}>
                      <span>{item.type === 'character' ? '[C]' : item.type === 'place' ? '[P]' : item.type === 'date' ? '[D]' : '[I]'}</span>
                      {item.name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="wiki-content">
            {ui.wikiSelected ? (
              <>
                <div className="wiki-entry-header">
                  <span className="wiki-entry-icon">
                    {ui.wikiSelected.type === 'character' ? <User size={18} /> : ui.wikiSelected.type === 'place' ? <MapPin size={18} /> : ui.wikiSelected.type === 'date' ? <CalendarDays size={18} /> : <Box size={18} />}
                  </span>
                  <span className="wiki-entry-name">{ui.wikiSelected.name}</span>
                  <span className="wiki-entry-type">
                    {ui.wikiSelected.type === 'character' ? t('context.types.character') :
                     ui.wikiSelected.type === 'place' ? t('context.types.place') :
                     ui.wikiSelected.type === 'date' ? t('context.types.date') : t('context.types.item')}
                  </span>
                  <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                    onClick={() => setUI({ wikiEditMode: !ui.wikiEditMode })}>
                    {ui.wikiEditMode ? <><Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('context.view')}</> : <><Pencil size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('context.edit')}</>}
                  </button>
                </div>
                {ui.wikiSelected.group && (
                  <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '12px' }}>{t('wiki.group')}: {ui.wikiSelected.group}</div>
                )}
                {ui.wikiEditMode ? (
                  <div className="wiki-edit-form">
                    <div className="form-group"><label>{t('context.name')}</label>
                      <input type="text" className="form-input" value={ui.wikiSelected.name}
                        onChange={e => {
                          const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, name: e.target.value } : c)
                          updateActiveBook({ contextData: d })
                          setUI({ wikiSelected: { ...ui.wikiSelected!, name: e.target.value } })
                        }} />
                    </div>
                    <div className="form-group"><label>{t('context.group')}</label>
                      <input type="text" className="form-input" value={ui.wikiSelected.group || ''}
                        onChange={e => {
                          const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, group: e.target.value } : c)
                          updateActiveBook({ contextData: d })
                          setUI({ wikiSelected: { ...ui.wikiSelected!, group: e.target.value } })
                        }} />
                    </div>
                    <div className="form-group"><label>{t('context.notes') || 'Notes'}</label>
                      <textarea className="form-textarea" rows={4} value={ui.wikiSelected.notes || ''}
                        placeholder={t('context.notesPlaceholder') || 'Personal notes, ideas, drafts...'}
                        onChange={e => {
                          const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, notes: e.target.value } : c)
                          updateActiveBook({ contextData: d })
                          setUI({ wikiSelected: { ...ui.wikiSelected!, notes: e.target.value } })
                        }} />
                    </div>
                    <div className="form-group"><label>Properties</label>
                      {Object.entries(ui.wikiSelected.details).map(([k, v], i) => (
                        <div key={i} className="detail-row">
                          <input type="text" className="detail-key-input" value={k}
                            onChange={e => {
                              const nd: Record<string, string> = {}
                              Object.entries(ui.wikiSelected!.details).forEach(([kk, vv], idx) => { nd[idx === i ? e.target.value : kk] = vv })
                              const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                              updateActiveBook({ contextData: d })
                              setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                            }} />
                          <input type="text" className="detail-value-input" value={v}
                            onChange={e => {
                              const nd = { ...ui.wikiSelected!.details, [k]: e.target.value }
                              const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                              updateActiveBook({ contextData: d })
                              setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                            }} />
                          <button className="btn-icon" onClick={() => {
                            const nd: Record<string, string> = {}
                            Object.entries(ui.wikiSelected!.details).forEach(([kk, vv], idx) => { if (idx !== i) nd[kk] = vv })
                            const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                            updateActiveBook({ contextData: d })
                            setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                          }}><X size={12} /></button>
                        </div>
                      ))}
                      <button className="btn btn-sm" onClick={() => {
                        const key = `prop${Object.keys(ui.wikiSelected!.details).length + 1}`
                        const nd = { ...ui.wikiSelected!.details, [key]: '' }
                        const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                        updateActiveBook({ contextData: d })
                        setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                      }}>+ Add property</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="btn btn-primary" onClick={async () => { await bookManager.saveContext(); setUI({ wikiEditMode: false }) }}>
                        [Save] {t('context.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="wiki-detail-grid">
                      {Object.entries(ui.wikiSelected.details).filter(([, v]) => v).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <div className="wiki-detail-key">{k}</div>
                          <div className="wiki-detail-value">{v}</div>
                        </React.Fragment>
                      ))}
                    </div>
                    {ui.wikiSelected.notes && (
                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>NOTES</h4>
                        <div style={{ fontSize: '13px', color: 'var(--text)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap' }}>{ui.wikiSelected.notes}</div>
                      </div>
                    )}
                    {ui.wikiSelected.type === 'character' && (
                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>{t('wiki.relationships')}</h4>
                        {ui.wikiSelected.relations && ui.wikiSelected.relations.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ui.wikiSelected.relations.map((rel, i) => {
                              const relEntry = contextData.find(c => c.name === rel.name)
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 12px', borderLeft: `4px solid ${relationColors[rel.type]}` }}>
                                  <span style={{ fontSize: '12px' }}>{relEntry?.type === 'character' ? '[C]' : relEntry?.type === 'place' ? '[P]' : '[I]'}</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}
                                    onClick={() => relEntry && setUI({ wikiSelected: relEntry })}>
                                    {rel.name}
                                  </span>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: relationColors[rel.type] + '30', color: relationColors[rel.type], fontWeight: 600 }}>
                                    {t('relations.' + rel.type)}
                                  </span>
                                  <select
                                    value={rel.type}
                                    onChange={e => {
                                      const newType = e.target.value as Relation['type']
                                      const newD = contextData.map(c => c.name === ui.wikiSelected!.name
                                        ? { ...c, relations: c.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) }
                                        : c)
                                      updateActiveBook({ contextData: newD })
                                      setUI({ wikiSelected: { ...ui.wikiSelected!, relations: ui.wikiSelected!.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) } })
                                    }}
                                    style={{ marginLeft: 'auto', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-gray)', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <option value="ally">[Ally] {t('relations.friendly')}</option>
                                    <option value="family">[Family] {t('relations.family')}</option>
                                    <option value="romantic">[Love] {t('relations.romantic')}</option>
                                    <option value="neutral">[Neutral] {t('relations.neutral')}</option>
                                    <option value="rival">[Rival] {t('relations.rival')}</option>
                                    <option value="enemy">[Enemy] {t('relations.hostile')}</option>
                                  </select>
                                  <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                                    onClick={() => {
                                      const newD = contextData.map(c => c.name === ui.wikiSelected!.name
                                        ? { ...c, relations: c.relations?.filter(r => r.name !== rel.name) }
                                        : c)
                                      updateActiveBook({ contextData: newD })
                                      setUI({ wikiSelected: { ...ui.wikiSelected!, relations: ui.wikiSelected!.relations?.filter(r => r.name !== rel.name) } })
                                    }}><X size={12} /></button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--cool-gray)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px' }}>
                            {t('wiki.noRelationships')}
                          </div>
                        )}
                        <div style={{ marginTop: '8px' }}>
                           <button className="btn btn-sm" onClick={() => setUI({ showMindMap: true })}>
                             <GitGraph size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('wiki.openMindMap')}
                           </button>
                        </div>
                      </div>
                    )}
                    {ui.wikiSelected && activeBook && (() => {
                      const charName = ui.wikiSelected.name
                      const relatedEvents: { type: 'timeline' | 'world'; title: string; date?: string; endDate?: string; content: string }[] = []
                      activeBook.timelineData.forEach(t => {
                        if (t.characterIds.includes(charName)) {
                          relatedEvents.push({ type: 'timeline', title: t.label, date: t.date, endDate: t.endDate, content: t.content })
                        }
                      })
                      activeBook.worldData.forEach(w => {
                        if (w.characterIds?.includes(charName)) {
                          relatedEvents.push({ type: 'world', title: w.title, date: w.date, content: w.content })
                        }
                      })
                      if (relatedEvents.length > 0) {
                        return (
                          <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>EVENTS & CONNECTIONS</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {relatedEvents.map((ev, i) => (
                                <div key={i} style={{ background: 'var(--surface)', borderRadius: '8px', padding: '10px 12px', borderLeft: `4px solid ${ev.type === 'timeline' ? 'var(--danger)' : 'var(--success)'}` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '[D]' : '[W]'}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{ev.title}</span>
                                    {ev.date && <span style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{ev.date}{ev.endDate ? ` — ${ev.endDate}` : ''}</span>}
                                  </div>
                                  {ev.content && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.content}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                    <div className="wiki-cross-refs">
                      <h4>{t('wiki.related')}</h4>
                      {contextData.filter(e => e.type === 'character' && e.name !== ui.wikiSelected!.name).map((e, i) => (
                        <button key={i} className="wiki-ref-item"
                          onClick={() => setUI({ wikiSelected: e })}>
                          [C] {e.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>{t('wiki.selectItem')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
