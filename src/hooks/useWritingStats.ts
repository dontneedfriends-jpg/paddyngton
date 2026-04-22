import { useEffect, useRef } from 'react'
import { useBookStore } from '../store/useBookStore'
import { useSettingsStore } from '../store/useSettingsStore'

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10)
}

export function useWritingStats() {
  const prevWordsRef = useRef(0)
  const initializedRef = useRef(false)

  const activeBook = useBookStore((s) =>
    s.openBooks.find((b) => b.id === s.activeBookId)
  )
  const activeChapter = activeBook?.chapters.find(
    (c) => c.id === activeBook?.activeChapterId
  )
  const code = activeChapter?.code || ''
  const chapterId = activeChapter?.id

  // Reset word baseline when chapter changes
  useEffect(() => {
    prevWordsRef.current = countWords(code)
  }, [chapterId])

  // On mount: reset wordsToday if it's a new day
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const settings = useSettingsStore.getState().settings
    const today = getToday()
    if (settings.lastWritingDate !== today && settings.wordsToday > 0) {
      useSettingsStore.getState().updateSettings({ wordsToday: 0 })
    }
  }, [])

  // Track word count changes
  useEffect(() => {
    const currentWords = countWords(code)
    if (currentWords > prevWordsRef.current) {
      const added = currentWords - prevWordsRef.current
      const settings = useSettingsStore.getState().settings
      const today = getToday()

      if (settings.lastWritingDate !== today) {
        const isConsecutive = settings.lastWritingDate
          ? isYesterday(settings.lastWritingDate)
          : false
        useSettingsStore.getState().updateSettings({
          wordsToday: added,
          lastWritingDate: today,
          streak: isConsecutive ? settings.streak + 1 : 1,
        })
      } else {
        useSettingsStore.getState().updateSettings({
          wordsToday: settings.wordsToday + added,
        })
      }
    }
    prevWordsRef.current = currentWords
  }, [code])
}
