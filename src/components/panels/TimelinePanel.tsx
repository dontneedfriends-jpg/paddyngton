import React, { useState, useMemo } from 'react'
import './TimelinePanel.css'
import { Calendar, Plus, User, Pencil, Trash2, ArrowRight, Clock, X } from 'lucide-react'
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
    return [...timelineData].sort((a, b) => {
      const numA = parseFloat(a.date)
      const numB = parseFloat(b.date)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.date.localeCompare(b.date)
    })
  }, [timelineData])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEntry[]> = {}
    sortedTimeline.forEach(entry => {
      if (!groups[entry.date]) groups[entry.date] = []
      groups[entry.date].push(entry)
    })
    return groups
  }, [sortedTimeline])

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => {
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })

  return (
    <div className="modal-overlay" onClick={() => { onClose(); setTimelineForm(null) }}>
      <div className="timeline-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2><Calendar size={18} /> {t('timeline.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={handleAddEvent}><Plus size={14} /> {t('timeline.addEvent')}</button>
            <button className="btn-icon" onClick={() => { onClose(); setTimelineForm(null) }}><X size={16} /></button>
          </div>
        </div>
        <div className="timeline-body">
          {timelineForm && (
            <div className="timeline-form-card">
              <h3 className="timeline-form-title">{t('timeline.newEvent')}</h3>
              <div className="timeline-form-grid">
                <div className="timeline-form-group">
                  <label className="required">{t('timeline.date')}</label>
                  <input type="text" className="timeline-form-input" placeholder={t('timeline.datePlaceholder')} value={timelineForm.date} onChange={e => setTimelineForm(f => f ? { ...f, date: e.target.value } : null)} />
                </div>
                <div className="timeline-form-group">
                  <label>{t('timeline.endDate')}</label>
                  <input type="text" className="timeline-form-input" placeholder={t('timeline.endDatePlaceholder')} value={timelineForm.endDate} onChange={e => setTimelineForm(f => f ? { ...f, endDate: e.target.value } : null)} />
                </div>
                <div className="timeline-form-group">
                  <label>{t('timeline.dateNote')}</label>
                  <input type="text" className="timeline-form-input" placeholder={t('timeline.dateNotePlaceholder')} value={timelineForm.dateNote} onChange={e => setTimelineForm(f => f ? { ...f, dateNote: e.target.value } : null)} />
                </div>
              </div>
              <div className="timeline-form-group" style={{ marginBottom: '12px' }}>
                <label className="required">{t('timeline.eventLabel')}</label>
                <input type="text" className="timeline-form-input" placeholder={t('timeline.labelPlaceholder')} value={timelineForm.label} onChange={e => setTimelineForm(f => f ? { ...f, label: e.target.value } : null)} />
              </div>
              <div className="timeline-form-grid-2">
                <div className="timeline-form-group">
                  <label>{t('timeline.color')}</label>
                  <div className="timeline-color-grid">
                    {COLOR_PRESETS.map(color => (
                      <div key={color} onClick={() => setTimelineForm(f => f ? { ...f, color } : null)}
                        className={`timeline-color-swatch ${timelineForm.color === color ? 'active' : ''}`}
                        style={{ background: color }} />
                    ))}
                    <input type="color" value={timelineForm.color} onChange={e => setTimelineForm(f => f ? { ...f, color: e.target.value } : null)} className="timeline-color-picker" />
                  </div>
                </div>
                <div className="timeline-form-group">
                  <label>{t('timeline.linkContext')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="timeline-form-input" placeholder={t('timeline.searchPlaceholder')} value={contextSearch}
                      onChange={e => { setContextSearch(e.target.value); setShowCharDropdown(true) }}
                      onFocus={() => setShowCharDropdown(true)} />
                    {showCharDropdown && filteredCharacters.length > 0 && (
                      <div className="timeline-char-dropdown">
                        {filteredCharacters.map(c => (
                          <div key={c.name} className={`timeline-char-option ${timelineForm.characterIds.includes(c.name) ? 'selected' : ''}`}
                            onClick={() => {
                              if (timelineForm && !timelineForm.characterIds.includes(c.name)) {
                                setTimelineForm(f => f ? { ...f, characterIds: [...f.characterIds, c.name] } : null)
                              }
                              setContextSearch('')
                              setShowCharDropdown(false)
                            }}>
                            <User size={12} />
                            <span>{c.name}</span>
                            {c.group && <span style={{ fontSize: '10px', color: 'var(--cool-gray)' }}>({c.group})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {timelineForm.characterIds.length > 0 && (
                    <div className="timeline-char-tags">
                      {timelineForm.characterIds.map(id => (
                        <span key={id} className="timeline-char-tag"
                          onClick={() => onOpenWiki && onOpenWiki(contextData.find(c => c.name === id)!)}>
                          <User size={10} /> {id}
                          <button onClick={(e) => { e.stopPropagation(); setTimelineForm(f => f ? { ...f, characterIds: f.characterIds.filter(c => c !== id) } : null) }}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="timeline-form-group" style={{ marginBottom: '12px' }}>
                <label>{t('timeline.notes')}</label>
                <textarea className="timeline-form-textarea" placeholder={t('timeline.notesPlaceholder')} value={timelineForm.notes} onChange={e => setTimelineForm(f => f ? { ...f, notes: e.target.value } : null)} />
              </div>
              <div className="timeline-form-actions">
                <button className="btn btn-sm" onClick={() => { setTimelineForm(null); setContextSearch('') }}>{t('dialogs.cancel')}</button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmitEvent}>{t('timeline.addEvent')}</button>
              </div>
            </div>
          )}
          {timelineData.length === 0 && !timelineForm ? (
            <div className="timeline-empty">
              {t('timeline.noEvents')}
            </div>
          ) : (
            <div className="timeline-track">
              <div className="timeline-track-line" />
              {dateKeys.map(date => (
                <div key={date} className="timeline-date-section">
                  <div className="timeline-date-badge">
                    <div className="timeline-date-main">
                      {groupedByDate[date][0].dateNote || date}
                    </div>
                    {groupedByDate[date][0].endDate && (
                      <div className="timeline-date-end">
                        <ArrowRight size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {groupedByDate[date][0].endDate}
                      </div>
                    )}
                  </div>
                  <div className={`timeline-date-dot ${groupedByDate[date][0].endDate ? 'range' : ''}`} style={{ background: groupedByDate[date][0].color }} />
                  <div className="timeline-events-row">
                    {groupedByDate[date].map((entry) => (
                      <div key={entry.id} className="timeline-card">
                        {entry.endDate && (
                          <div className="timeline-range-badge">
                            <Clock size={10} /> {entry.date} — {entry.endDate}
                          </div>
                        )}
                        <div className="timeline-card-header">
                          <span className="timeline-card-label" style={{ color: entry.color }}>{entry.label}</span>
                          <div className="timeline-card-actions">
                            <button className="timeline-card-btn" onClick={() => handleEditEvent(entry)}><Pencil size={12} /></button>
                            <button className="timeline-card-btn" onClick={() => handleDeleteEvent(entry.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {entry.notes && <div className="timeline-card-note">{entry.notes}</div>}
                        {entry.characterIds.length > 0 && (
                          <div className="timeline-card-chars">
                            {entry.characterIds.map(id => {
                              const ctx = contextData.find(c => c.name === id)
                              return ctx ? (
                                <span key={id} className="timeline-card-char" onClick={() => onOpenWiki && onOpenWiki(ctx)}>
                                  <User size={10} /> {ctx.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
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
