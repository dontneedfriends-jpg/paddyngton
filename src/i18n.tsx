import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { TranslationKey } from './translations/keys'
import en from './translations/en.json'
import es from './translations/es.json'
import ru from './translations/ru.json'

export type Language = 'en' | 'es' | 'ru'

export interface LanguageInfo {
  code: Language
  label: string
  nativeLabel: string
}

export const languages: LanguageInfo[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
]

type TranslationValue = string | { [key: string]: TranslationValue }

const translations: Record<Language, Record<string, TranslationValue>> = { en, es, ru }

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey | string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getNestedValue(obj: Record<string, TranslationValue>, path: string): string {
  const keys = path.split('.')
  let current: TranslationValue = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return path
    current = current[key]
    if (current === undefined) return path
  }
  return typeof current === 'string' ? current : path
}

function loadSavedLanguage(): Language {
  try {
    const s = localStorage.getItem('paddyngton-settings')
    if (s) {
      const parsed = JSON.parse(s)
      if (parsed.language && languages.some(l => l.code === parsed.language)) {
        return parsed.language as Language
      }
    }
  } catch {}
  return 'en'
}

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(loadSavedLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      const s = localStorage.getItem('paddyngton-settings')
      const settings = s ? JSON.parse(s) : {}
      settings.language = lang
      localStorage.setItem('paddyngton-settings', JSON.stringify(settings))
    } catch {}
  }, [])

  const t = useCallback((key: TranslationKey | string): string => {
    const langData = translations[language]
    if (!langData) return key
    return getNestedValue(langData as Record<string, TranslationValue>, key)
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}

export function useLanguage() {
  const { language, setLanguage } = useTranslation()
  return { language, setLanguage, languages }
}
