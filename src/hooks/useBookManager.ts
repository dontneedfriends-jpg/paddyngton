import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import {
  exists,
  readTextFile,
  mkdir,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import {
  BookConfig,
  BookInstance,
  Chapter,
  ContextEntry,
  ContextGroup,
} from '../types'
import { useBookStore } from '../store/useBookStore'
import { useUIStore } from '../store/useUIStore'
import { extractGroups } from '../lib/contextHelpers'
import {
  loadBookData,
  saveAllBookData,
  saveContext as saveContextFile,
  saveBookConfig as saveBookConfigFile,
  saveWorldData as saveWorldDataFile,
  saveKanbanData as saveKanbanDataFile,
  saveNotes as saveNotesFile,
  saveTimelineData as saveTimelineDataFile,
  saveChapterFile,
} from '../lib/bookIO'

export function useBookManager(t: (key: string) => string) {
  const {
    openBooks,
    activeBookId,
    updateActiveBook,
    addBook,
  } = useBookStore()
  const showToast = useUIStore((s) => s.showToast)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const setInputDialog = useUIStore((s) => s.set)

  const activeBook = openBooks.find((b) => b.id === activeBookId) || null
  const chapters = activeBook?.chapters || []
  const activeChapterId = activeBook?.activeChapterId || null
  const activeChapter = chapters.find((c) => c.id === activeChapterId) || null
  const contextData = activeBook?.contextData || []
  const contextGroups = activeBook?.contextGroups || []
  const bookConfig = activeBook?.bookConfig || null

  const loadBook = useCallback(
    async (
      dir: string,
      ctxData: ContextEntry[],
      groups: ContextGroup[],
      bConfig: BookConfig | null
    ) => {
      const book = await loadBookData(dir, bConfig, ctxData, groups, t)
      addBook(book)
      useUIStore.getState().set({ showWiki: false, wikiSelected: null })
    },
    [addBook, t]
  )

  const createNewBook = useCallback(async () => {
    const selected = await open({ directory: true })
    if (!selected) return
    const bookDir = selected as string
    const defaultContext: ContextEntry[] = [
      {
        name: 'Main Character',
        type: 'character',
        details: {
          Age: '',
          Gender: '',
          Occupation: '',
          Personality: '',
          Status: 'Alive',
        },
        relations: [],
        notes: '',
      },
      {
        name: 'Setting',
        type: 'place',
        details: {
          Type: '',
          Location: '',
          Description: '',
          Atmosphere: '',
        },
        notes: '',
      },
    ]
    const bConfig: BookConfig = {
      title: 'New Book',
      author: 'Author',
      genre: 'Novel',
      bookType: 'Novel',
      description: '',
      createdAt: new Date().toISOString(),
      chapters: [],
    }
    try {
      await mkdir(bookDir, { recursive: true })
      await writeTextFile(
        `${bookDir}/.context.json`,
        JSON.stringify(defaultContext, null, 2)
      )
      await writeTextFile(
        `${bookDir}/.book.json`,
        JSON.stringify(bConfig, null, 2)
      )
      loadBook(bookDir, defaultContext, extractGroups(defaultContext), bConfig)
    } catch (err) {
      console.error('Error creating book:', err)
    }
  }, [loadBook])

  const openBookFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true })
      if (!selected) return
      const dir = Array.isArray(selected) ? selected[0] : selected
      let ctxData: ContextEntry[] = []
      let bConfig: BookConfig | null = null
      const contextPath = `${dir}/.context.json`
      const bookConfigPath = `${dir}/.book.json`
      if (await exists(contextPath))
        ctxData = JSON.parse(await readTextFile(contextPath))
      if (await exists(bookConfigPath))
        bConfig = JSON.parse(await readTextFile(bookConfigPath))
      const groups = extractGroups(ctxData, t('context.noGroup'))
      loadBook(dir, ctxData, groups, bConfig)
    } catch (err) {
      console.error('Error opening book:', err)
    }
  }, [loadBook, t])

  const createNewBearBook = useCallback(async () => {
    const path = await save({
      filters: [{ name: 'Bear Book', extensions: ['bear'] }],
      defaultPath: 'New Book.bear',
    })
    if (!path) return
    try {
      const tempDir = `${path}_temp`
      await mkdir(tempDir, { recursive: true })
      const defaultContext: ContextEntry[] = [
        {
          name: 'Main Character',
          type: 'character',
          details: {
            Age: '',
            Gender: '',
            Occupation: '',
            Personality: '',
            Status: 'Alive',
          },
          relations: [],
          notes: '',
        },
        {
          name: 'Setting',
          type: 'place',
          details: {
            Type: '',
            Location: '',
            Description: '',
            Atmosphere: '',
          },
          notes: '',
        },
      ]
      const bConfig: BookConfig = {
        title: 'New Book',
        author: 'Author',
        genre: 'Novel',
        bookType: 'Novel',
        description: '',
        createdAt: new Date().toISOString(),
        chapters: [],
      }
      await writeTextFile(
        `${tempDir}/.context.json`,
        JSON.stringify(defaultContext, null, 2)
      )
      await writeTextFile(
        `${tempDir}/.book.json`,
        JSON.stringify(bConfig, null, 2)
      )
      await invoke('save_bear', { bookDir: tempDir, bearPath: path })
      const extractedDir = await invoke<string>('open_bear', { bearPath: path })
      let ctxData: ContextEntry[] = []
      let bConfigLoaded: BookConfig | null = null
      if (await exists(`${extractedDir}/.context.json`))
        ctxData = JSON.parse(
          await readTextFile(`${extractedDir}/.context.json`)
        )
      if (await exists(`${extractedDir}/.book.json`))
        bConfigLoaded = JSON.parse(
          await readTextFile(`${extractedDir}/.book.json`)
        )
      const groups = extractGroups(ctxData, t('context.noGroup'))
      loadBook(extractedDir, ctxData, groups, bConfigLoaded)
    } catch (err) {
      console.error('Error creating bear book:', err)
    }
  }, [loadBook, t])

  const openBearFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Bear Book', extensions: ['bear'] }],
      })
      if (!selected) return
      const tempDir = await invoke<string>('open_bear', {
        bearPath: selected as string,
      })
      let ctxData: ContextEntry[] = []
      let bConfig: BookConfig | null = null
      if (await exists(`${tempDir}/.context.json`))
        ctxData = JSON.parse(await readTextFile(`${tempDir}/.context.json`))
      if (await exists(`${tempDir}/.book.json`))
        bConfig = JSON.parse(await readTextFile(`${tempDir}/.book.json`))
      const groups = extractGroups(ctxData, t('context.noGroup'))
      loadBook(tempDir, ctxData, groups, bConfig)
    } catch (err) {
      console.error('Error opening .bear file:', err)
    }
  }, [loadBook, t])

  const saveAsBear = useCallback(async () => {
    if (!activeBook) return
    const path = await save({
      filters: [{ name: 'Bear Book', extensions: ['bear'] }],
      defaultPath: `${activeBook.title.replace(
        /[^a-zA-Z0-9а-яА-ЯёЁ]/g,
        '_'
      )}.bear`,
    })
    if (!path) return
    try {
      await invoke('save_bear', { bookDir: activeBook.dir, bearPath: path })
    } catch (err) {
      console.error('Error saving .bear file:', err)
    }
  }, [activeBook])

  const saveAsFolder = useCallback(async () => {
    if (!activeBook) return
    const selected = await open({ directory: true })
    if (!selected) return
    try {
      await invoke('save_bear', {
        bookDir: activeBook.dir,
        bearPath: `${selected}/${activeBook.title}.bear`,
      })
    } catch (err) {
      console.error('Error saving as folder:', err)
    }
  }, [activeBook])

  const exportBook = useCallback(
    async (format: 'docx' | 'pdf') => {
      if (!activeBook || !activeBook.chapters) return
      if (format === 'docx') {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
          await import('docx')
        const paragraphs: Paragraph[] = []
        paragraphs.push(
          new Paragraph({
            text: activeBook.title,
            heading: HeadingLevel.TITLE,
          })
        )
        paragraphs.push(
          new Paragraph({
            text: 'Оглавление',
            heading: HeadingLevel.HEADING_1,
          })
        )
        for (const ch of activeBook.chapters) {
          paragraphs.push(
            new Paragraph({
              text: `${activeBook.chapters.indexOf(ch) + 1}. ${ch.name}`,
            })
          )
        }
        paragraphs.push(new Paragraph({ text: '' }))
        for (const ch of activeBook.chapters) {
          paragraphs.push(
            new Paragraph({ text: ch.name, heading: HeadingLevel.HEADING_1 })
          )
          if (ch.code) {
            paragraphs.push(
              new Paragraph({ children: [new TextRun({ text: ch.code })] })
            )
          }
          paragraphs.push(new Paragraph({ text: '' }))
        }
        const doc = new Document({ sections: [{ children: paragraphs }] })
        const blob = await Packer.toBlob(doc)
        const exp = await save({
          filters: [{ name: 'DOCX', extensions: ['docx'] }],
          defaultPath: `${activeBook.title.replace(
            /[^a-zA-Z0-9а-яА-ЯёЁ]/g,
            '_'
          )}.docx`,
        })
        if (exp) {
          const arrayBuffer = await blob.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)
          await invoke('save_binary_file', {
            path: exp,
            data: Array.from(uint8Array),
          })
        }
      } else {
        const exp = await save({
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
          defaultPath: `${activeBook.title.replace(
            /[^a-zA-Z0-9а-яА-ЯёЁ]/g,
            '_'
          )}.pdf`,
        })
        if (!exp) return
        const chaptersData = activeBook.chapters.map((ch) => ({
          name: ch.name,
          code: ch.code || '',
        }))
        await invoke('generate_pdf', {
          path: exp,
          title: activeBook.title,
          chaptersJson: JSON.stringify(chaptersData),
        })
      }
    },
    [activeBook]
  )

  const saveChapter = useCallback(async () => {
    if (!activeChapter || !activeBook) return
    const dir = activeBook.dir
    let path = activeChapter.path
    if (!path) path = `${dir}/${activeChapter.name}.md`
    try {
      await saveChapterFile(dir, activeChapter, activeBook.bookConfig)
      const newChapters = chapters.map((c) =>
        c.id === activeChapter.id
          ? { ...c, path: path ?? null, isModified: false }
          : c
      )
      updateActiveBook({
        chapters: newChapters,
        bookConfig: activeBook.bookConfig,
      })
    } catch (err) {
      console.error('Error saving chapter:', err)
    }
  }, [activeChapter, activeBook, chapters, updateActiveBook])

  const addChapter = useCallback(() => {
    if (!activeBook) return
    const num = chapters.length + 1
    const id = Date.now().toString()
    const newChapters = [
      ...chapters,
      {
        id,
        name: `${t('chapter.default')} ${num}`,
        path: null,
        code: `${t('chapter.default')} ${num}\n\n`,
        isModified: false,
      },
    ]
    updateActiveBook({ chapters: newChapters, activeChapterId: id })
  }, [activeBook, chapters, updateActiveBook, t])

  const deleteChapter = useCallback(
    async (id: string) => {
      if (chapters.length <= 1 || !activeBook) return
      const ch = chapters.find((c) => c.id === id)
      if (ch?.path) {
        try {
          await invoke('delete_file', { path: ch.path })
        } catch {}
      }
      const next = chapters.filter((c) => c.id !== id)
      const newBookConfig = bookConfig
        ? {
            ...bookConfig,
            chapters: bookConfig.chapters.filter((c) => c.id !== id),
          }
        : null
      if (newBookConfig) {
        await writeTextFile(
          `${activeBook.dir}/.book.json`,
          JSON.stringify(newBookConfig, null, 2)
        )
      }
      updateActiveBook({
        chapters: next,
        activeChapterId: next[0]?.id || null,
        bookConfig: newBookConfig,
      })
    },
    [chapters, activeBook, bookConfig, updateActiveBook]
  )

  const startRenameChapter = useCallback(
    (id: string) => {
      updateActiveBook({
        chapters: chapters.map((c) =>
          c.id === id ? { ...c, renaming: true } : c
        ),
      })
    },
    [chapters, updateActiveBook]
  )

  const finishRenameChapter = useCallback(
    (id: string, newName: string) => {
      updateActiveBook({
        chapters: chapters.map((c) =>
          c.id === id ? { ...c, name: newName || c.name, renaming: false, isModified: true } : c
        ),
      })
    },
    [chapters, updateActiveBook]
  )

  const saveContextFn = useCallback(async () => {
    if (!activeBook) return
    try {
      await saveContextFile(activeBook.dir, contextData)
      updateActiveBook({
        contextGroups: extractGroups(contextData, t('context.noGroup')),
      })
    } catch (err) {
      console.error('Error saving context:', err)
    }
  }, [activeBook, contextData, updateActiveBook, t])

  const saveBookConfigFn = useCallback(async () => {
    if (!activeBook || !bookConfig) return
    try {
      await saveBookConfigFile(activeBook.dir, bookConfig)
    } catch (err) {
      console.error('Error saving book config:', err)
    }
  }, [activeBook, bookConfig])

  const saveWorldDataFn = useCallback(async () => {
    if (!activeBook) return
    try {
      await saveWorldDataFile(activeBook.dir, activeBook.worldData)
    } catch {}
  }, [activeBook])

  const saveKanbanDataFn = useCallback(async () => {
    if (!activeBook) return
    try {
      await saveKanbanDataFile(activeBook.dir, activeBook.kanbanData)
    } catch {}
  }, [activeBook])

  const saveNotesFn = useCallback(async () => {
    if (!activeBook) return
    try {
      await saveNotesFile(activeBook.dir, activeBook.notes)
    } catch {}
  }, [activeBook])

  const saveTimelineDataFn = useCallback(async () => {
    if (!activeBook) return
    try {
      await saveTimelineDataFile(activeBook.dir, activeBook.timelineData)
    } catch {}
  }, [activeBook])

  const saveAllBookDataFn = useCallback(async () => {
    if (!activeBook) return
    await saveAllBookData(activeBook)
  }, [activeBook])

  const updateWorld = useCallback(
    (worldData: BookInstance['worldData']) => {
      updateActiveBook({ worldData })
      saveWorldDataFile(activeBook!.dir, worldData).catch(() => {})
    },
    [activeBook, updateActiveBook]
  )

  const updateKanban = useCallback(
    (kanbanData: BookInstance['kanbanData']) => {
      updateActiveBook({ kanbanData })
      saveKanbanDataFile(activeBook!.dir, kanbanData).catch(() => {})
    },
    [activeBook, updateActiveBook]
  )

  const updateNotes = useCallback(
    (notes: BookInstance['notes']) => {
      updateActiveBook({ notes })
      saveNotesFile(activeBook!.dir, notes).catch(() => {})
    },
    [activeBook, updateActiveBook]
  )

  const updateTimeline = useCallback(
    (timelineData: BookInstance['timelineData']) => {
      updateActiveBook({ timelineData })
      saveTimelineDataFile(activeBook!.dir, timelineData).catch(() => {})
    },
    [activeBook, updateActiveBook]
  )

  return {
    activeBook,
    chapters,
    activeChapter,
    contextData,
    contextGroups,
    bookConfig,
    loadBook,
    createNewBook,
    openBookFolder,
    createNewBearBook,
    openBearFile,
    saveAsBear,
    saveAsFolder,
    exportBook,
    saveChapter,
    addChapter,
    deleteChapter,
    startRenameChapter,
    finishRenameChapter,
    saveContext: saveContextFn,
    saveBookConfig: saveBookConfigFn,
    saveWorldData: saveWorldDataFn,
    saveKanbanData: saveKanbanDataFn,
    saveNotes: saveNotesFn,
    saveTimelineData: saveTimelineDataFn,
    saveAllBookData: saveAllBookDataFn,
    updateWorld,
    updateKanban,
    updateNotes,
    updateTimeline,
  }
}