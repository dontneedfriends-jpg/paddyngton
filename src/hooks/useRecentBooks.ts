import { useCallback, useState, useEffect } from 'react'

const STORAGE_KEY = 'paddyngton-recent-books'

export interface RecentBook {
  dir: string
  title: string
  openedAt: number
}

function load(): RecentBook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function save(list: RecentBook[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)))
  } catch {}
}

export function useRecentBooks() {
  const [recent, setRecent] = useState<RecentBook[]>(load)

  const addRecent = useCallback((dir: string, title: string) => {
    setRecent((prev) => {
      const next = prev.filter((b) => b.dir !== dir)
      next.unshift({ dir, title, openedAt: Date.now() })
      const result = next.slice(0, 10)
      save(result)
      return result
    })
  }, [])

  const removeRecent = useCallback((dir: string) => {
    setRecent((prev) => {
      const result = prev.filter((b) => b.dir !== dir)
      save(result)
      return result
    })
  }, [])

  return { recent, addRecent, removeRecent }
}
