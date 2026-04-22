import React from 'react'
import './BookDialog.css'
import { FolderOpen, Save, Package, X } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useBookManager } from '../../hooks/useBookManager'
import { useTranslation } from '../../i18n'

export const BookDialog: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const bookManager = useBookManager(t)

  if (!ui.showBookDialog) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showBookDialog: false })}>
      <div className="book-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>
            {ui.bookDialogMode === 'open' ? (
              <>
                <FolderOpen size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Open Book
              </>
            ) : (
              <>
                <Save size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Save Book As
              </>
            )}
          </h2>
          <button className="btn-icon" onClick={() => setUI({ showBookDialog: false })}>
            <X size={14} />
          </button>
        </div>
        <div className="book-dialog-body">
          {ui.bookDialogMode === 'open' ? (
            <>
              <button
                className="book-dialog-option"
                onClick={() => {
                  setUI({ showBookDialog: false })
                  bookManager.openBookFolder()
                }}
              >
                <span className="book-dialog-icon">
                  <FolderOpen size={24} />
                </span>
                <span className="book-dialog-label">{t('app.welcome.openFolder')}</span>
                <span className="book-dialog-desc">{t('app.welcome.openFolderDesc')}</span>
              </button>
              <button
                className="book-dialog-option"
                onClick={() => {
                  setUI({ showBookDialog: false })
                  bookManager.openBearFile()
                }}
              >
                <span className="book-dialog-icon">
                  <Package size={24} />
                </span>
                <span className="book-dialog-label">{t('app.welcome.openBearFile')}</span>
                <span className="book-dialog-desc">{t('app.welcome.openBearFileDesc')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="book-dialog-option"
                onClick={() => {
                  setUI({ showBookDialog: false })
                  bookManager.saveAsBear()
                }}
              >
                <span className="book-dialog-icon">
                  <Package size={24} />
                </span>
                <span className="book-dialog-label">{t('app.welcome.saveAsBear')}</span>
                <span className="book-dialog-desc">{t('app.welcome.saveAsBearDesc')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
