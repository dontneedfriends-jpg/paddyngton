import React from 'react'
import './SettingsPanel.css'
import { Check, X, RefreshCw } from 'lucide-react'
import { fetch } from '@tauri-apps/plugin-http'
import { useTranslation, Language } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useBookStore } from '../../store/useBookStore'
import { useBookManager } from '../../hooks/useBookManager'
import {
  ThemeName,
  THEME_LABELS,
  THEME_ICONS,
  BOOK_TYPES,
} from '../../types'

export const SettingsPanel: React.FC = () => {
  const { t, language, setLanguage } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const bookConfig = activeBook?.bookConfig || null
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const bookManager = useBookManager(t)

  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'es', label: 'Español' },
  ]

  if (!ui.showSettings) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showSettings: false })}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{t('settings.title')}</h2>
          <button className="btn-icon" onClick={() => setUI({ showSettings: false })}><X size={14} /></button>
        </div>
        <div className="settings-tabs">
          {[t('settings.tabs.appearance'), t('settings.tabs.book'), t('settings.tabs.about')].map((tab, i) => (
            <div key={i} className={`settings-tab ${ui.settingsTab === i ? 'active' : ''}`} onClick={() => setUI({ settingsTab: i })}>{tab}</div>
          ))}
        </div>
        <div className="settings-body">
          {ui.settingsTab === 0 && (
            <>
              <div className="setting-section">
                <h3>{t('settings.themes')}</h3>
                <div className="theme-grid">
                  {(Object.keys(THEME_LABELS) as ThemeName[]).map(th => (
                    <button key={th} className={`theme-option ${settings.theme === th ? 'active' : ''}`} onClick={() => updateSettings({ theme: th })}>
                      {THEME_ICONS[th]} {THEME_LABELS[th]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-section">
                <h3>{t('settings.language')}</h3>
                <div className="theme-grid">
                  {langOptions.map(l => (
                    <button key={l.value} className={`theme-option ${language === l.value ? 'active' : ''}`}
                      onClick={() => setLanguage(l.value as Language)}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-section">
                <h3>{t('settings.autoSave') || 'Auto Save & Snapshots'}</h3>
                <div className="form-group"><label>{t('settings.autoSnapshotMinutes') || 'Auto-snapshot interval (minutes, 0 = off)'}</label>
                  <input type="number" className="form-input" min="0" max="1440" value={settings.autoSnapshotMinutes}
                    onChange={e => updateSettings({ autoSnapshotMinutes: Math.max(0, Math.min(1440, parseInt(e.target.value) || 0)) })} />
                </div>
                <div className="form-group"><label>{t('settings.showAutoSaveToast') || 'Show toast on auto-save'}</label>
                  <label className="toggle-label"><input type="checkbox" checked={settings.autoSaveToast} onChange={e => updateSettings({ autoSaveToast: e.target.checked })} /> {t('settings.autoSaveToastEnabled') || 'Enabled'}</label>
                </div>
              </div>
            </>
          )}
          {ui.settingsTab === 1 && bookConfig && (
            <div className="setting-section">
              <h3>{t('settings.bookInfo')}</h3>
              <div className="form-group"><label>{t('settings.bookTitle')}</label>
                <input type="text" className="form-input" value={bookConfig.title}
                  onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, title: e.target.value } })} />
              </div>
              <div className="form-group"><label>{t('settings.bookAuthor')}</label>
                <input type="text" className="form-input" value={bookConfig.author}
                  onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, author: e.target.value } })} />
              </div>
              <div className="form-group"><label>{t('settings.bookType')}</label>
                <select className="form-input" value={bookConfig.bookType || 'Novel'}
                  onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, bookType: e.target.value } })}>
                  {BOOK_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t('settings.bookGenre')}</label>
                <input type="text" className="form-input" value={bookConfig.genre}
                  onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, genre: e.target.value } })} />
              </div>
              <div className="form-group"><label>{t('settings.bookDescription')}</label>
                <textarea className="form-textarea" value={bookConfig.description}
                  onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, description: e.target.value } })} />
              </div>
              <button className="btn btn-primary" onClick={async () => { await bookManager.saveBookConfig() }}>[Save] {t('settings.bookSave')}</button>
            </div>
          )}
          {ui.settingsTab === 1 && !bookConfig && (
            <div className="setting-section"><p style={{ color: 'var(--cool-gray)', fontSize: '13px' }}>{t('settings.noBookOpen')}</p></div>
          )}
              {ui.settingsTab === 2 && (
            <div className="setting-about-section">
              <div className="about-header">
                <div className="about-logo">📖</div>
                <div className="about-app-name">Paddyngton</div>
                <div className="about-version">{ui.currentVersion || '...'}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <button className="btn btn-sm" onClick={async () => {
                  setUI({ updateLoading: true, updateAvailable: null })
                  try {
                    const resp = await fetch('https://github.com/dontneedfriends-jpg/paddyngton/releases/latest/download/latest.json', {
                      headers: { 'Accept': 'application/json' }
                    })
                    if (resp.ok) {
                      const data = await resp.json()
                      const remoteVersion = data.version as string
                      const localVersion = ui.currentVersion || '0.0.0'
                      const parseVersion = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
                      const isNewer = (() => {
                        const r = parseVersion(remoteVersion)
                        const l = parseVersion(localVersion)
                        for (let i = 0; i < Math.max(r.length, l.length); i++) {
                          const rv = r[i] || 0
                          const lv = l[i] || 0
                          if (rv > lv) return true
                          if (rv < lv) return false
                        }
                        return false
                      })()
                      if (isNewer) {
                        setUI({ updateAvailable: remoteVersion, updateLoading: false })
                      } else {
                        setUI({ updateAvailable: null, updateLoading: false })
                      }
                    } else {
                      setUI({ updateLoading: false })
                      alert('Update check failed: HTTP ' + resp.status)
                    }
                  } catch (e) {
                    console.error('Manual update check failed:', e)
                    setUI({ updateLoading: false })
                    alert('Update check failed: ' + (e as Error).message)
                  }
                }}>
                  <RefreshCw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Check for updates
                </button>
                {ui.updateLoading && (
                  <span style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>Checking...</span>
                )}
              </div>

              {ui.updateAvailable && !ui.updateLoading && (
                <div className="about-update-box">
                  <span className="about-update-label">[New] {t('about.updateAvailable').replace('{version}', ui.updateAvailable)}</span>
                  <button className="about-update-btn" onClick={async () => {
                    try {
                      const resp = await fetch('https://github.com/dontneedfriends-jpg/paddyngton/releases/latest/download/latest.json')
                      const data = await resp.json()
                      const downloadUrl = data.url as string
                      const { open } = await import('@tauri-apps/plugin-shell')
                      await open(downloadUrl)
                    } catch (e) {
                      alert('Error: ' + e)
                    }
                  }}>{t('about.updateNow')}</button>
                </div>
              )}

              {!ui.updateAvailable && !ui.updateLoading && (
                <div className="about-up-to-date"><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('about.upToDate')}</div>
              )}

              <div className="about-tagline">{t('about.tagline')}</div>

              <div className="about-tech-stack">
                <div className="about-tech-item">Tauri 2.0</div>
                <div className="about-tech-item">React 19</div>
                <div className="about-tech-item">CodeMirror 6</div>
              </div>

              <div className="about-shortcuts">
                <div className="about-shortcuts-title">{t('about.shortcuts')}</div>
                <div className="about-shortcuts-grid">
                  <div className="about-shortcut"><kbd>Ctrl+K</kbd><span>{t('about.commands')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+N</kbd><span>{t('about.newChapter')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+O</kbd><span>{t('about.openBook')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+S</kbd><span>{t('about.save')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+B</kbd><span>{t('about.sidebar')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+T</kbd><span>{t('about.theme')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+,</kbd><span>{t('about.settings')}</span></div>
                  <div className="about-shortcut"><kbd>Ctrl+Z/Y</kbd><span>{t('about.undoRedo')}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
