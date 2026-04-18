import React, { useState, useMemo } from 'react'
import { TimelineEntry, ContextEntry } from '../../types'

interface TimelinePanelProps {
  timelineData: TimelineEntry[]
  contextData: ContextEntry[]
  onUpdate: (data: TimelineEntry[]) => void
  onClose: () => void
  t: (key: string) => string
  confirmAction: (message: string, onConfirm: () => void) => void
  onOpenWiki?: (entry: ContextEntry) => void
}

interface TimelineFormState {
  date: string
  endDate: string
  dateNote: string
  label: string
  color: string
  notes: string
  characterIds: string[]
}

const COLOR_PRESETS = ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5', '#d53f8c', '#718096']

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  timelineData,
  contextData,
  onUpdate,
  onClose,
  t,
  confirmAction,
  onOpenWiki
}) => {
  const [timelineForm, setTimelineForm] = useState<TimelineFormState | null>(null)
  const [contextSearch, setContextSearch] = useState('')
  const [showCharDropdown, setShowCharDropdown] = useState(false)

  const characters = useMemo(() => contextData.filter(c => c.type === 'character'), [contextData])

  const handleAddEvent = () => {
    setTimelineForm({ date: '', endDate: '', dateNote: '', label: '', color: '#e53e3e', notes: '', characterIds: [] })
    setContextSearch('')
  }

  const handleSubmitEvent = () => {
    if (timelineForm && timelineForm.date && timelineForm.label) {
      onUpdate([...timelineData, {
        id: Date.now().toString(),
        date: timelineForm.date,
        endDate: timelineForm.endDate || undefined,
        dateNote: timelineForm.dateNote || undefined,
        label: timelineForm.label,
        content: timelineForm.notes,
        color: timelineForm.color,
        notes: timelineForm.notes,
        characterIds: timelineForm.characterIds
      }])
      setTimelineForm(null)
      setContextSearch('')
    }
  }

  const handleEditEvent = (entry: TimelineEntry) => {
    setTimelineForm({
      date: entry.date,
      endDate: entry.endDate || '',
      dateNote: entry.dateNote || '',
      label: entry.label,
      color: entry.color,
      notes: entry.notes || '',
      characterIds: entry.characterIds || []
    })
    onUpdate(timelineData.filter(e => e.id !== entry.id))
  }

  const handleDeleteEvent = (id: string) => {
    confirmAction(t('timeline.deleteEvent'), () => {
      onUpdate(timelineData.filter(e => e.id !== id))
    })
  }

  const filteredCharacters = useMemo(() => {
    if (!contextSearch) return characters.slice(0, 5)
    return characters.filter(c => c.name.toLowerCase().includes(contextSearch.toLowerCase())).slice(0, 5)
  }, [characters, contextSearch])

  const sortedTimeline = useMemo(() => {
    return [...timelineData].sort((a, b) => a.date.localeCompare(b.date))
  }, [timelineData])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEntry[]> = {}
    sortedTimeline.forEach(entry => {
      if (!groups[entry.date]) groups[entry.date] = []
      groups[entry.date].push(entry)
    })
    return groups
  }, [sortedTimeline])

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b))

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setTimelineForm(null) }}>
      <div className="timeline-panel" onClick={e => e.stopPropagation()} style={{ width: '95vw', maxWidth: '1200px' }}>
        <div className="panel-header">
          <h2>📅 {t('timeline.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={handleAddEvent}>➕ {t('timeline.addEvent')}</button>
            <button className="btn-icon" onClick={() => { onClose(); setTimelineForm(null) }}>×</button>
          </div>
        </div>
        <div className="timeline-body" style={{ maxHeight: 'calc(85vh - 80px)', overflowY: 'auto' }}>
          {timelineForm && (
            <div className="timeline-form" style={{ background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--near-black)' }}>{t('timeline.newEvent')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.date')} *</label>
                  <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="Year 100, Day 1, 15th March" value={timelineForm.date} onChange={e => setTimelineForm(f => f ? { ...f, date: e.target.value } : null)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>End Date</label>
                  <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="Year 105 (optional)" value={timelineForm.endDate} onChange={e => setTimelineForm(f => f ? { ...f, endDate: e.target.value } : null)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>Date Note</label>
                  <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="e.g., The Great War era" value={timelineForm.dateNote} onChange={e => setTimelineForm(f => f ? { ...f, dateNote: e.target.value } : null)} />
                </div>
              </div>
              <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.eventLabel')} *</label>
                <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="What happened?" value={timelineForm.label} onChange={e => setTimelineForm(f => f ? { ...f, label: e.target.value } : null)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.color')}</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map(color => (
                      <div key={color} onClick={() => setTimelineForm(f => f ? { ...f, color } : null)}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', background: color, cursor: 'pointer', border: timelineForm.color === color ? '2px solid var(--near-black)' : '2px solid transparent' }} />
                    ))}
                    <input type="color" value={timelineForm.color} onChange={e => setTimelineForm(f => f ? { ...f, color: e.target.value } : null)} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.linkContext')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="Search characters..." value={contextSearch}
                      onChange={e => { setContextSearch(e.target.value); setShowCharDropdown(true) }}
                      onFocus={() => setShowCharDropdown(true)} />
                    {showCharDropdown && filteredCharacters.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--white)', border: '1px solid var(--border-gray)', borderRadius: '8px', marginTop: '2px', maxHeight: '140px', overflowY: 'auto', zIndex: 10 }}>
                        {filteredCharacters.map(c => (
                          <div key={c.name} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: timelineForm.characterIds.includes(c.name) ? 'var(--bg-secondary)' : 'transparent' }}
                            onClick={() => {
                              if (timelineForm && !timelineForm.characterIds.includes(c.name)) {
                                setTimelineForm(f => f ? { ...f, characterIds: [...f.characterIds, c.name] } : null)
                              }
                              setContextSearch('')
                              setShowCharDropdown(false)
                            }}>
                            <span>👤</span>
                            <span>{c.name}</span>
                            {c.group && <span style={{ fontSize: '10px', color: 'var(--cool-gray)' }}>({c.group})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {timelineForm.characterIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {timelineForm.characterIds.map(id => (
                        <span key={id} style={{ padding: '2px 8px', background: '#3182ce20', color: '#3182ce', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                          onClick={() => onOpenWiki && onOpenWiki(contextData.find(c => c.name === id)!)}>
                          👤 {id}
                          <button style={{ background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }} onClick={(e) => { e.stopPropagation(); setTimelineForm(f => f ? { ...f, characterIds: f.characterIds.filter(c => c !== id) } : null) }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.notes')}</label>
                <textarea className="form-textarea" style={{ fontSize: '13px', minHeight: '60px' }} placeholder="Additional details about this event..." value={timelineForm.notes} onChange={e => setTimelineForm(f => f ? { ...f, notes: e.target.value } : null)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={() => { setTimelineForm(null); setContextSearch('') }}>{t('dialogs.cancel')}</button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmitEvent}>{t('timeline.addEvent')}</button>
              </div>
            </div>
          )}
          {timelineData.length === 0 && !timelineForm ? (
            <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
              {t('timeline.noEvents')}
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '160px', minHeight: '200px' }}>
              <div style={{ position: 'absolute', left: '130px', top: 0, bottom: 0, width: '2px', background: 'var(--border-gray)' }} />
              {dateKeys.map(date => (
                <div key={date} style={{ marginBottom: '24px' }}>
                  <div style={{ position: 'absolute', left: '10px', width: '110px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-gray)', marginRight: '10px' }}>
                    {groupedByDate[date][0].dateNote || date}
                    {groupedByDate[date][0].endDate && <div style={{ fontSize: '10px', fontWeight: 400, color: 'var(--cool-gray)' }}>→ {groupedByDate[date][0].endDate}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {groupedByDate[date].map((entry, idx) => (
                      <div key={entry.id} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ position: 'absolute', left: '-30px', top: '14px', width: '12px', height: '12px', borderRadius: '50%', background: entry.color, border: '3px solid var(--bg-primary)', zIndex: 1, boxShadow: '0 0 0 2px var(--border-gray)' }} />
                        <div className="timeline-card" style={{
                          flex: 1,
                          borderLeftColor: entry.color || 'var(--accent)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-gray)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          marginLeft: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: entry.color }}>{entry.label}</span>
                            {entry.characterIds.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {entry.characterIds.map(id => {
                                  const ctx = contextData.find(c => c.name === id)
                                  return ctx ? (
                                    <span key={id} onClick={() => onOpenWiki && onOpenWiki(ctx)}
                                      style={{ padding: '2px 8px', background: '#3182ce20', color: '#3182ce', borderRadius: '12px', fontSize: '11px', cursor: 'pointer' }}>
                                      👤 {ctx.name}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                          {entry.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{entry.notes}</div>}
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleEditEvent(entry)}>✏️</button>
                            <button className="btn btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleDeleteEvent(entry.id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
