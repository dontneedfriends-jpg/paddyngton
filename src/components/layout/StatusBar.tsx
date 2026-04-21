import React from 'react'
import { useTranslation } from '../../i18n'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useBookStore } from '../../store/useBookStore'
import { THEME_LABELS, THEME_ICONS } from '../../types'

export const StatusBar: React.FC = () => {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const activeChapter = activeBook?.chapters.find((c) => c.id === activeBook?.activeChapterId)
  const bookConfig = activeBook?.bookConfig

  return (
    <footer className="status-bar">
      <span className="status-item">
        {THEME_ICONS[settings.theme]} {THEME_LABELS[settings.theme]}
      </span>
      {activeChapter && (
        <>
          <span className="status-item">{activeChapter.name}</span>
          <span className="status-item" style={{ color: 'var(--cool-gray)', fontSize: '11px' }}>
            {activeChapter.code.split(/\s+/).filter(Boolean).length} words
          </span>
          <span className="status-spacer"></span>
          {activeChapter.isModified && <span className="status-badge">{t('status.modified')}</span>}
        </>
      )}
      {bookConfig && <span className="status-item">{bookConfig.genre}</span>}
      <span className="status-item">{settings.fontSize}px</span>
      <span className="status-item">{settings.fontFamily}</span>
    </footer>
  )
}
