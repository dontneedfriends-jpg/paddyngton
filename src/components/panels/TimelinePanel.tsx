import React, { useState } from 'react'
import { TimelineEntry, ContextEntry } from '../../types'

interface TimelinePanelProps {
  timelineData: TimelineEntry[]
  contextData: ContextEntry[]
  onUpdate: (data: TimelineEntry[]) => void
  onClose: () => void
  t: (key: string) => string
  confirmAction: (message: string, onConfirm: () => void) => void
}

interface TimelineFormState {
  date: string
  label: string
  color: string
  notes: string
  characterIds: string[]
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  timelineData,
  contextData,
  onUpdate,
  onClose,
  t,
  confirmAction
}) => {
  const [timelineForm, setTimelineForm] = useState<TimelineFormState | null>(null)
  const [contextSearch, setContextSearch] = useState('')

  const handleAddEvent = () => {
    setTimelineForm({ date: '', label: '', color: '#e53e3e', notes: '', characterIds: [] })
  }

  const handleSubmitEvent = () => {
    if (timelineForm && timelineForm.date && timelineForm.label) {
      const tag = `[${timelineForm.characterIds.join(', ')}]`
      const content = timelineForm.notes + (timelineForm.characterIds.length > 0 ? (timelineForm.notes ? '\n\n' : '') + tag : '')
      onUpdate([...timelineData, {
        id: Date.now().toString(),
        date: timelineForm.date,
        label: timelineForm.label,
        content,
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
      label: entry.label,
      color: entry.color,
      notes: entry.notes || '',
      characterIds: entry.characterIds
    })
    onUpdate(timelineData.filter(e => e.id !== entry.id))
  }

  const handleDeleteEvent = (id: string) => {
    confirmAction(t('timeline.deleteEvent'), () => {
      onUpdate(timelineData.filter(e => e.id !== id))
    })
  }

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setTimelineForm(null) }}>
      <div className="timeline-panel" onClick={e => e.stopPropagation()}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.date')} *</label>
                  <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="e.g., Year 100, Day 1" value={timelineForm.date} onChange={e => setTimelineForm(f => f ? { ...f, date: e.target.value } : null)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.color')}</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="color" value={timelineForm.color} onChange={e => setTimelineForm(f => f ? { ...f, color: e.target.value } : null)} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                    <input type="text" className="form-input" style={{ fontSize: '13px', flex: 1 }} value={timelineForm.color} onChange={e => setTimelineForm(f => f ? { ...f, color: e.target.value } : null)} />
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.eventLabel')} *</label>
                <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder="What happened?" value={timelineForm.label} onChange={e => setTimelineForm(f => f ? { ...f, label: e.target.value } : null)} />
              </div>
              <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.linkContext')}</label>
                <input type="text" className="form-input" style={{ fontSize: '13px' }} placeholder={t('timeline.search')} value={contextSearch} onChange={e => setContextSearch(e.target.value)} />
                {contextSearch && (
                  <div style={{ background: 'var(--white)', border: '1px solid var(--border-gray)', borderRadius: '8px', marginTop: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                    {contextData.filter(c => c.name.toLowerCase().includes(contextSearch.toLowerCase())).slice(0, 5).map(c => (
                      <div key={c.name} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => {
                          if (timelineForm && !timelineForm.characterIds.includes(c.name)) {
                            setTimelineForm(f => f ? { ...f, characterIds: [...f.characterIds, c.name] } : null)
                          }
                          setContextSearch('')
                        }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.type === 'character' ? '#3182ce20' : c.type === 'place' ? '#38a16920' : '#d69e2e20' }}>{c.type}</span>
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
                {timelineForm.characterIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {timelineForm.characterIds.map(id => (
                      <span key={id} style={{ padding: '2px 8px', background: 'var(--accent)', color: 'white', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {id}
                        <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }} onClick={() => setTimelineForm(f => f ? { ...f, characterIds: f.characterIds.filter(c => c !== id) } : null)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                <label style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('timeline.notes')}</label>
                <textarea className="form-textarea" style={{ fontSize: '13px', minHeight: '60px' }} placeholder="Additional notes..." value={timelineForm.notes} onChange={e => setTimelineForm(f => f ? { ...f, notes: e.target.value } : null)} />
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
            <div className="timeline-line">
              {timelineData.sort((a, b) => a.date.localeCompare(b.date)).map((entry) => (
                <div key={entry.id} className="timeline-entry">
                  <div className="timeline-marker" style={{ background: entry.color || 'var(--accent)' }} />
                  <div className="timeline-card" style={{ borderLeftColor: entry.color || 'var(--accent)' }}>
                    <div className="timeline-date">{entry.date}</div>
                    <div className="timeline-label">{entry.label}</div>
                    {entry.notes && <div className="timeline-content">{entry.notes}</div>}
                    {entry.characterIds.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {entry.characterIds.map(id => {
                          const ctx = contextData.find(c => c.name === id)
                          return ctx ? (
                            <span key={id} style={{ padding: '2px 8px', background: ctx.type === 'character' ? '#3182ce20' : ctx.type === 'place' ? '#38a16920' : '#d69e2e20', borderRadius: '12px', fontSize: '11px' }}>
                              {id}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                    <div className="timeline-actions">
                      <button className="btn btn-sm" onClick={() => handleEditEvent(entry)}>✏️</button>
                      <button className="btn btn-sm" onClick={() => handleDeleteEvent(entry.id)}>🗑️</button>
                    </div>
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
