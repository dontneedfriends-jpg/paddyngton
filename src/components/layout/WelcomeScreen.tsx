import React from 'react'
import { BookMarked, FileText, FolderOpen, Package } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookManager } from '../../hooks/useBookManager'

export const WelcomeScreen: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const bookManager = useBookManager(t)

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-logo">
          <BookMarked size={48} />
        </div>
        <h1 className="welcome-title">{t('app.title')}</h1>
        <p className="welcome-subtitle">{t('app.subtitle')}</p>
        <div className="welcome-tabs">
          <button className="welcome-tab active" onClick={() => setUI({ welcomeTab: 'create' })}>
            <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('app.welcome.newBook')}
          </button>
          <button className="welcome-tab" onClick={() => setUI({ welcomeTab: 'open' })}>
            <FolderOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {t('app.welcome.openBook')}
          </button>
        </div>
        <div className="welcome-panel">
          {(!ui.welcomeTab || ui.welcomeTab === 'create') ? (
            <div className="welcome-section">
              <button className="welcome-option" onClick={bookManager.createNewBook}>
                <span className="welcome-option-icon">
                  <FolderOpen size={24} />
                </span>
                <div>
                  <div className="welcome-option-title">New Book (Folder)</div>
                  <div className="welcome-option-desc">Create a new book in a folder on your computer</div>
                </div>
              </button>
              <button className="welcome-option" onClick={bookManager.createNewBearBook}>
                <span className="welcome-option-icon">
                  <Package size={24} />
                </span>
                <div>
                  <div className="welcome-option-title">New Book (.bear)</div>
                  <div className="welcome-option-desc">Create and save as a .bear archive file</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="welcome-section">
              <button className="welcome-option" onClick={bookManager.openBookFolder}>
                <span className="welcome-option-icon">
                  <FolderOpen size={24} />
                </span>
                <div>
                  <div className="welcome-option-title">Open Folder</div>
                  <div className="welcome-option-desc">Open an existing book from a folder</div>
                </div>
              </button>
              <button className="welcome-option" onClick={bookManager.openBearFile}>
                <span className="welcome-option-icon">
                  <Package size={24} />
                </span>
                <div>
                  <div className="welcome-option-title">Open .bear File</div>
                  <div className="welcome-option-desc">Open a .bear archive file</div>
                </div>
              </button>
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
