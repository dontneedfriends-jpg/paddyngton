import React from 'react'
import './WelcomeScreen.css'
import { BookMarked, FileText, FolderOpen, Package, X, Clock, Feather, BookOpen, Film, ScrollText } from 'lucide-react'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookManager } from '../../hooks/useBookManager'
import { useRecentBooks } from '../../hooks/useRecentBooks'
import { extractGroups } from '../../lib/contextHelpers'

const TEMPLATES = [
  { key: 'Novel', icon: BookOpen, label: 'Novel', desc: 'Long-form fiction' },
  { key: 'Short Story', icon: Feather, label: 'Short Story', desc: 'Compact narrative' },
  { key: 'Screenplay', icon: Film, label: 'Screenplay', desc: 'Script format' },
  { key: 'Non-fiction', icon: ScrollText, label: 'Non-fiction', desc: 'Essays & articles' },
]

export const WelcomeScreen: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const bookManager = useBookManager(t)
  const { recent, removeRecent } = useRecentBooks()

  const openRecent = async (dir: string) => {
    try {
      let ctxData: any[] = []
      let bConfig: any = null
      if (await exists(`${dir}/.context.json`))
        ctxData = JSON.parse(await readTextFile(`${dir}/.context.json`))
      if (await exists(`${dir}/.book.json`))
        bConfig = JSON.parse(await readTextFile(`${dir}/.book.json`))
      bookManager.loadBook(dir, ctxData, extractGroups(ctxData, t('context.noGroup')), bConfig)
    } catch (err) {
      console.error('Error opening recent book:', err)
    }
  }

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        {/* Hero */}
        <div className="welcome-hero">
          <svg className="welcome-hero-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="45" height="80" rx="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/>
            <rect x="65" y="20" width="45" height="80" rx="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/>
            <line x1="60" y1="20" x2="60" y2="100" stroke="var(--accent)" strokeWidth="2"/>
            <path d="M30 45h20M30 55h20M30 65h15" stroke="var(--cool-gray)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M70 45h20M70 55h20M70 65h15" stroke="var(--cool-gray)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M85 15l10-10M85 15l-5-2M85 15l-2-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="welcome-title">{t('app.title')}</h1>
          <p className="welcome-subtitle">{t('app.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="welcome-tabs">
          <button className={`welcome-tab ${(!ui.welcomeTab || ui.welcomeTab === 'create') ? 'active' : ''}`} onClick={() => setUI({ welcomeTab: 'create' })}>
            <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('app.welcome.newBook')}
          </button>
          <button className={`welcome-tab ${ui.welcomeTab === 'open' ? 'active' : ''}`} onClick={() => setUI({ welcomeTab: 'open' })}>
            <FolderOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('app.welcome.openBook')}
          </button>
        </div>

        {/* Panel */}
        <div className="welcome-panel">
          {(!ui.welcomeTab || ui.welcomeTab === 'create') ? (
            <div className="welcome-section">
              {/* Templates */}
              <div className="welcome-templates">
                {TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon
                  return (
                    <button key={tmpl.key} className="welcome-template-card" onClick={() => bookManager.createNewBook(tmpl.key)}>
                      <Icon size={24} className="welcome-template-icon" />
                      <div className="welcome-template-title">{tmpl.label}</div>
                      <div className="welcome-template-desc">{tmpl.desc}</div>
                    </button>
                  )
                })}
              </div>
              <div className="welcome-divider" />
              <button className="welcome-option" onClick={bookManager.createNewBearBook}>
                <span className="welcome-option-icon"><Package size={24} /></span>
                <div>
                  <div className="welcome-option-title">{t('app.welcome.newBearBook')}</div>
                  <div className="welcome-option-desc">{t('app.welcome.newBearBookDesc')}</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="welcome-section">
              <button className="welcome-option" onClick={bookManager.openBookFolder}>
                <span className="welcome-option-icon"><FolderOpen size={24} /></span>
                <div>
                  <div className="welcome-option-title">{t('app.welcome.openFolder')}</div>
                  <div className="welcome-option-desc">{t('app.welcome.openFolderDesc')}</div>
                </div>
              </button>
              <button className="welcome-option" onClick={bookManager.openBearFile}>
                <span className="welcome-option-icon"><Package size={24} /></span>
                <div>
                  <div className="welcome-option-title">{t('app.welcome.openBearFile')}</div>
                  <div className="welcome-option-desc">{t('app.welcome.openBearFileDesc')}</div>
                </div>
              </button>
              {recent.length > 0 && (
                <>
                  <div className="welcome-divider" />
                  <div className="welcome-recent-title">{t('app.welcome.recentBooks')}</div>
                  <div className="welcome-recent-list">
                    {recent.map((book) => (
                      <div key={book.dir} className="welcome-recent-item">
                        <button className="welcome-recent-info" onClick={() => openRecent(book.dir)}>
                          <BookMarked size={16} />
                          <span className="welcome-recent-name">{book.title}</span>
                          <span className="welcome-recent-date">
                            <Clock size={12} />
                            {new Date(book.openedAt).toLocaleDateString()}
                          </span>
                        </button>
                        <button className="welcome-recent-remove" onClick={() => removeRecent(book.dir)} title={t('app.welcome.removeFromRecent')}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="welcome-hint">
          <p>Ctrl+Shift+F — {t('commands.search').toLowerCase()}</p>
        </div>
      </div>
    </div>
  )
}
