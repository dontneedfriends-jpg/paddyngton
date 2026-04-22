import { create } from 'zustand'
import { AppSettings, ThemeName, DEFAULT_SETTINGS, THEME_ORDER } from '../types'

const STORAGE_KEY = 'paddyngton-settings'

function loadSettings(): AppSettings {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const parsed = JSON.parse(s) as Partial<AppSettings>
      // Fix invalid themes from old versions (galaxy, aurora, forest, etc.)
      if (parsed.theme && !THEME_ORDER.includes(parsed.theme as ThemeName)) {
        parsed.theme = 'light'
      }
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function persist(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

interface SettingsState {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  cycleTheme: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettings(),
  updateSettings: (patch) =>
    set((state) => {
      const next = { ...state.settings, ...patch }
      persist(next)
      return { settings: next }
    }),
  cycleTheme: () =>
    set((state) => {
      const idx = THEME_ORDER.indexOf(state.settings.theme)
      const next = { ...state.settings, theme: THEME_ORDER[(idx + 1) % THEME_ORDER.length] as ThemeName }
      persist(next)
      return { settings: next }
    }),
}))