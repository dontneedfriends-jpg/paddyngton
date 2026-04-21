import React from 'react'
import './Header.css'
import {
  Menu, Save, Package, StickyNote, CalendarDays, Globe, LayoutGrid,
  Clock, Search, Settings,
} from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'

export const Header: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const openBooks = useBookStore((s) => s.openBooks)
  const activeBookId = useBookStore((s) => s.activeBookId)
  const setActiveBookId = useBookStore((s) => s.setActiveBookId)
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const bookConfig = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))?.bookConfig
  const bookManager = useBookManager(t)

  return (
    <header className="header">
      <div className="header-left">
        <button className="btn btn-icon" onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })}>
          <Menu size={16} />
        </button>
        {bookConfig && (
          <div className="book-info-inline">
            <input
              type="text"
              className="book-info-title"
              value={bookConfig.title}
              onChange={(e) => updateActiveBook({ bookConfig: { ...bookConfig, title: e.target.value } })}
              onBlur={bookManager.saveBookConfig}
              title={t('settings.bookTitle')}
            />
            <input
              type="text"
              className="book-info-author"
              value={bookConfig.author}
              onChange={(e) => updateActiveBook({ bookConfig: { ...bookConfig, author: e.target.value } })}
              onBlur={bookManager.saveBookConfig}
              placeholder={t('settings.bookAuthor')}
            />
            <span className="book-info-genre">{bookConfig.bookType || bookConfig.genre}</span>
          </div>
        )}
      </div>
      <div className="header-center">
        {openBooks.length > 1 && (
          <div className="book-tabs">
            {openBooks.map((book) => (
              <div
                key={book.id}
                className={`book-tab ${book.id === activeBookId ? 'active' : ''}`}
                onClick={() => setActiveBookId(book.id)}
              >
                <span className="tab-name">{book.title}</span>
                {book.isModified && <span className="modified-dot">•</span>}
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    useBookStore.setState({
                      openBooks: openBooks.filter((b) => b.id !== book.id),
                      activeBookId: activeBookId === book.id ? openBooks.find((b) => b.id !== book.id)?.id || null : activeBookId,
                    })
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="header-right">
        <div className="toolbar-group">
          <button className="btn btn-primary btn-sm" onClick={bookManager.saveChapter} title={t('status.saved')}>
            <Save size={14} /> {t('header.save')}
          </button>
          <div className="toolbar-dropdown">
            <button className="btn btn-sm" onClick={() => setUI({ showBookDialog: true, bookDialogMode: 'save' })}>
              <Package size={14} /> .bear
            </button>
            <div className="toolbar-dropdown-content">
              <button onClick={() => bookManager.exportBook('docx')}>[DOCX]</button>
              <button onClick={() => bookManager.exportBook('pdf')}>[PDF]</button>
            </div>
          </div>
        </div>
        <div className="toolbar-divider" />
        <button className={`btn btn-icon ${ui.showNotes ? 'active' : ''}`} onClick={() => setUI({ showNotes: !ui.showNotes })} title="Notes">
          <StickyNote size={16} />
        </button>
        <button className={`btn btn-icon ${ui.showTimeline ? 'active' : ''}`} onClick={() => setUI({ showTimeline: !ui.showTimeline })} title="Timeline">
          <CalendarDays size={16} />
        </button>
        <button className={`btn btn-icon ${ui.showWorld ? 'active' : ''}`} onClick={() => setUI({ showWorld: !ui.showWorld })} title="World">
          <Globe size={16} />
        </button>
        <button className={`btn btn-icon ${ui.showKanban ? 'active' : ''}`} onClick={() => setUI({ showKanban: !ui.showKanban })} title="Kanban">
          <LayoutGrid size={16} />
        </button>
        <div className="toolbar-divider" />
        <button className="btn btn-icon" onClick={() => setUI({ showVersions: true })}>
          <Clock size={16} />
        </button>
        <button className="btn btn-icon" onClick={() => setUI({ showSearch: true })}>
          <Search size={16} />
        </button>
        <button className="btn btn-icon" onClick={() => setUI({ showSettings: true })}>
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
