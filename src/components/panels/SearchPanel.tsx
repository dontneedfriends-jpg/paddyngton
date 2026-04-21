import React, { useMemo } from 'react'
import './SearchPanel.css'
import { User, MapPin, CalendarDays, Box, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { Chapter } from '../../types'

export const SearchPanel: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const contextData = activeBook?.contextData || []
  const chapters = activeBook?.chapters || []

  const { entries: searchEntries, chapters: searchChapters } = useMemo(() => {
    if (!ui.searchQuery.trim() || ui.searchQuery.length < 2) return { entries: [], chapters: [] }
    const q = ui.searchQuery.toLowerCase()
    const entries = contextData.filter((e) => e.name.toLowerCase().includes(q))
    const chaptersWith: { chapter: Chapter; matches: number }[] = chapters
      .map((ch) => ({
        chapter: ch,
        matches: (ch.code.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
      }))
      .filter((c) => c.matches > 0)
    return { entries, chapters: chaptersWith }
  }, [ui.searchQuery, contextData, chapters])

  if (!ui.showSearch) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showSearch: false })}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>[Search] {t('search.title')}</h2>
          <button className="btn-icon" onClick={() => setUI({ showSearch: false })}>
            <X size={14} />
          </button>
        </div>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={t('search.placeholder')}
            value={ui.searchQuery}
            onChange={(e) => setUI({ searchQuery: e.target.value })}
            autoFocus
          />
        </div>
        <div className="search-results">
          {ui.searchQuery.length >= 2 && (
            <>
              {searchEntries.length > 0 && (
                <>
                  <div className="search-section-title">{t('search.context')}</div>
                  {searchEntries.map((e, i) => (
                    <div
                      key={i}
                      className="search-result-item"
                      onClick={() => setUI({ wikiSelected: e, showWiki: true, showSearch: false })}
                    >
                      <div className="search-result-entry">
                        <span className="search-result-entry-name">{e.name}</span>
                        <span className="search-result-type" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {e.type === 'character' ? <User size={12} /> : e.type === 'place' ? <MapPin size={12} /> : e.type === 'date' ? <CalendarDays size={12} /> : <Box size={12} />} {e.type}
                        </span>
                      </div>
                      {e.group && (
                        <div style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>
                          {t('wiki.group')}: {e.group}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
              {searchChapters.length > 0 && (
                <>
                  <div className="search-section-title">
                    {t('search.chapters')} ({searchChapters.reduce((a, c) => a + c.matches, 0)} {t('search.matches')})
                  </div>
                  {searchChapters.map((c, i) => (
                    <div
                      key={i}
                      className="search-result-item"
                      onClick={() => {
                        updateActiveBook({ activeChapterId: c.chapter.id })
                        setUI({ showSearch: false })
                      }}
                    >
                      <div className="search-result-entry">
                        <span className="search-result-entry-name">{c.chapter.name}</span>
                        <span className="search-result-type">
                          {c.matches} {t('search.occurrences')}
                        </span>
                      </div>
                      <div className="search-result-chapters">
                        {(() => {
                          const q = ui.searchQuery.toLowerCase()
                          const lines = c.chapter.code.split('\n')
                          const matches = lines.filter((l) => l.toLowerCase().includes(q)).slice(0, 3)
                          return matches.map((line, li) => (
                            <div key={li} className="search-result-chapter" style={{ color: 'var(--cool-gray)' }}>
                              ...{line.trim().substring(0, 80)}...
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {searchEntries.length === 0 && searchChapters.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>
                  {t('search.noResults')}
                </div>
              )}
            </>
          )}
          {ui.searchQuery.length < 2 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>
              {t('search.minChars')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
