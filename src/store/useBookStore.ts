import { create } from 'zustand'
import {
  BookInstance,
  BookConfig,
  Chapter,
  ContextEntry,
  ContextGroup,
  WorldEntry,
  KanbanBoard,
  Note,
  TimelineEntry,
} from '../types'

interface BookState {
  openBooks: BookInstance[]
  activeBookId: string | null

  setActiveBookId: (id: string | null) => void
  updateActiveBook: (patch: Partial<BookInstance>) => void
  updateChapter: (chapterId: string, patch: Partial<Chapter>) => void
  addBook: (book: BookInstance) => void
  removeBook: (dir: string) => void
  updateContextData: (data: ContextEntry[]) => void
  updateContextGroups: (groups: ContextGroup[]) => void
  updateWorldData: (data: WorldEntry[]) => void
  updateKanbanData: (data: KanbanBoard) => void
  updateNotes: (notes: Note[]) => void
  updateTimelineData: (data: TimelineEntry[]) => void
  updateBookConfig: (config: BookConfig) => void
}

export const useBookStore = create<BookState>((set, get) => ({
  openBooks: [],
  activeBookId: null,

  setActiveBookId: (id) => set({ activeBookId: id }),

  updateActiveBook: (patch) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, ...patch } : b
        ),
      }
    }),

  updateChapter: (chapterId, patch) =>
    set((state) => {
      if (!state.activeBookId) return state
      const book = state.openBooks.find((b) => b.id === state.activeBookId)
      if (!book) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId
            ? {
                ...b,
                chapters: b.chapters.map((c) =>
                  c.id === chapterId ? { ...c, ...patch } : c
                ),
              }
            : b
        ),
      }
    }),

  addBook: (book) =>
    set((state) => ({
      openBooks: [...state.openBooks.filter((b) => b.dir !== book.dir), book],
      activeBookId: book.id,
    })),

  removeBook: (dir) =>
    set((state) => ({
      openBooks: state.openBooks.filter((b) => b.dir !== dir),
    })),

  updateContextData: (data) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, contextData: data } : b
        ),
      }
    }),

  updateContextGroups: (groups) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, contextGroups: groups } : b
        ),
      }
    }),

  updateWorldData: (data) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, worldData: data } : b
        ),
      }
    }),

  updateKanbanData: (data) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, kanbanData: data } : b
        ),
      }
    }),

  updateNotes: (notes) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, notes } : b
        ),
      }
    }),

  updateTimelineData: (data) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, timelineData: data } : b
        ),
      }
    }),

  updateBookConfig: (config) =>
    set((state) => {
      if (!state.activeBookId) return state
      return {
        openBooks: state.openBooks.map((b) =>
          b.id === state.activeBookId ? { ...b, bookConfig: config } : b
        ),
      }
    }),
}))