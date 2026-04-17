import { AppSettings, DEFAULT_SETTINGS } from '../types'

export function loadSettings(): AppSettings {
  try {
    const s = localStorage.getItem('paddyngton-settings')
    if (s) {
      const parsed = JSON.parse(s)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem('paddyngton-settings', JSON.stringify(settings))
  } catch {}
}

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS }
}
