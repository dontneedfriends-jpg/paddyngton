import React, { useEffect, useState } from 'react'
import './StatusBar.css'
import { useTranslation } from '../../i18n'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useBookStore } from '../../store/useBookStore'
import { useUIStore } from '../../store/useUIStore'
import { THEME_LABELS, THEME_ICONS } from '../../types'
import { Flame, Clock, Save, Target } from 'lucide-react'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatAgo(timestamp: number | null, t: (k: string) => string): string {
  if (!timestamp) return ''
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 10) return t('status.savedJustNow')
  if (seconds < 60) return t('status.savedSecondsAgo').replace('{n}', String(seconds))
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('status.savedMinutesAgo').replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  return t('status.savedHoursAgo').replace('{n}', String(hours))
}

export const StatusBar: React.FC = () => {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const activeChapter = activeBook?.chapters.find((c) => c.id === activeBook?.activeChapterId)
  const bookConfig = activeBook?.bookConfig
  const lastSavedAt = useUIStore((s) => s.lastSavedAt)

  const [sessionTime, setSessionTime] = useState(0)
  const [tick, setTick] = useState(0)

  // Session timer
  useEffect(() => {
    if (!activeChapter) {
      setSessionTime(0)
      return
    }
    const interval = setInterval(() => setSessionTime((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeChapter?.id])

  // Re-render every 10s to update "saved X ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const wordCount = activeChapter
    ? activeChapter.code.split(/\s+/).filter(Boolean).length
    : 0

  const progress = Math.min(100, Math.round((settings.wordsToday / settings.sessionTarget) * 100))
  const targetReached = settings.wordsToday >= settings.sessionTarget

  return (
    <footer className="status-bar">
      <span className="status-item">
        {THEME_ICONS[settings.theme]} {THEME_LABELS[settings.theme]}
      </span>

      {activeChapter && (
        <>
          <span className="status-item">
            <Clock size={12} />
            {formatDuration(sessionTime)}
          </span>

          <span className="status-item">{activeChapter.name}</span>

          <span className="status-item" style={{ color: 'var(--cool-gray)', fontSize: '11px' }}>
            {wordCount} {t('status.words')}
          </span>

          <span className="status-target">
            <Target size={12} />
            <span className="status-target-bar-bg">
              <span
                className="status-target-bar-fill"
                style={{ width: `${progress}%`, background: targetReached ? 'var(--success)' : 'var(--accent)' }}
              />
            </span>
            <span className="status-target-text">
              {settings.wordsToday} / {settings.sessionTarget}
            </span>
            {targetReached && <span className="status-target-done">✓</span>}
          </span>

          {settings.streak > 0 && (
            <span className="status-streak">
              <Flame size={12} />
              {settings.streak}
            </span>
          )}

          <span className="status-spacer"></span>

          {lastSavedAt && (
            <span className="status-save-indicator">
              <Save size={12} />
              {formatAgo(lastSavedAt, t)}
            </span>
          )}

          {activeChapter.isModified && (
            <span className="status-badge">{t('status.modified')}</span>
          )}
        </>
      )}

      {bookConfig && <span className="status-item">{bookConfig.genre}</span>}
      <span className="status-item">{settings.fontSize}px</span>
      <span className="status-item">{settings.fontFamily}</span>
    </footer>
  )
}
