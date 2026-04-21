import {
  BookConfig,
  BookInstance,
  Chapter,
  ContextEntry,
  ContextGroup,
  KanbanBoard,
  Note,
  TimelineEntry,
  WorldEntry,
} from '../types'
import { exists, readTextFile, mkdir, writeTextFile } from '@tauri-apps/plugin-fs'

export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    if (await exists(path)) return JSON.parse(await readTextFile(path)) as T
  } catch {}
  return fallback
}

export interface LoadChaptersResult {
  chapters: Chapter[]
  firstId: string | null
}

export async function loadChaptersFromDisk(
  dir: string,
  bookConfig: BookConfig | null,
  t: (key: string) => string
): Promise<LoadChaptersResult> {
  if (!bookConfig || bookConfig.chapters.length === 0) {
    const id = Date.now().toString()
    return {
      chapters: [
        {
          id,
          name: `${t('chapter.default')} 1`,
          path: null,
          code: `${t('chapter.default')} 1\n\n${t('editor.placeholder')}\n\n`,
          isModified: false,
        },
      ],
      firstId: id,
    }
  }
  const loaded: Chapter[] = []
  for (const ch of bookConfig.chapters) {
    const path = `${dir}/${ch.file}`
    try {
      const content = await readTextFile(path)
      loaded.push({
        id: ch.id,
        name: ch.name,
        path,
        code: content,
        isModified: false,
      })
    } catch {
      loaded.push({
        id: ch.id,
        name: ch.name,
        path: null,
        code: `${ch.name}\n\n`,
        isModified: false,
      })
    }
  }
  return { chapters: loaded, firstId: loaded[0]?.id || null }
}

export async function loadBookData(
  dir: string,
  bookConfig: BookConfig | null,
  contextData: ContextEntry[],
  groups: ContextGroup[],
  t: (key: string) => string
): Promise<BookInstance> {
  const worldData = (await readJsonFile(`${dir}/.world.json`, [])) as WorldEntry[]
  const kanbanData = (await readJsonFile(`${dir}/.kanban.json`, {
    columns: [
      { id: '1', name: 'Ideas', cards: [] },
      { id: '2', name: 'In Progress', cards: [] },
      { id: '3', name: 'Done', cards: [] },
    ],
  })) as KanbanBoard
  const notes = (await readJsonFile(`${dir}/.notes.json`, [])) as Note[]
  const timelineData = (await readJsonFile(
    `${dir}/.timeline.json`,
    []
  )) as TimelineEntry[]

  const { chapters, firstId } = await loadChaptersFromDisk(dir, bookConfig, t)
  const bookId = dir + Date.now()

  return {
    id: bookId,
    title: bookConfig?.title || 'Untitled',
    dir,
    bookConfig: bookConfig || {
      title: 'Untitled',
      author: '',
      genre: '',
      bookType: 'Novel',
      description: '',
      createdAt: new Date().toISOString(),
      chapters: [],
    },
    contextData,
    contextGroups: groups,
    chapters,
    activeChapterId: firstId,
    isModified: false,
    worldData,
    kanbanData,
    notes,
    timelineData,
  }
}

export async function saveContext(
  dir: string,
  contextData: ContextEntry[],
  groups: ContextGroup[]
): Promise<void> {
  await writeTextFile(`${dir}/.context.json`, JSON.stringify(contextData, null, 2))
}

export async function saveBookConfig(dir: string, bookConfig: BookConfig): Promise<void> {
  await writeTextFile(`${dir}/.book.json`, JSON.stringify(bookConfig, null, 2))
}

export async function saveWorldData(dir: string, data: WorldEntry[]): Promise<void> {
  await writeTextFile(`${dir}/.world.json`, JSON.stringify(data, null, 2))
}

export async function saveKanbanData(dir: string, data: KanbanBoard): Promise<void> {
  await writeTextFile(`${dir}/.kanban.json`, JSON.stringify(data, null, 2))
}

export async function saveNotes(dir: string, data: Note[]): Promise<void> {
  await writeTextFile(`${dir}/.notes.json`, JSON.stringify(data, null, 2))
}

export async function saveTimelineData(
  dir: string,
  data: TimelineEntry[]
): Promise<void> {
  await writeTextFile(
    `${dir}/.timeline.json`,
    JSON.stringify(data, null, 2)
  )
}

export async function saveChapterFile(
  dir: string,
  chapter: Chapter,
  bookConfig: BookConfig
): Promise<BookConfig> {
  let path = chapter.path || `${dir}/${chapter.name}.md`
  await writeTextFile(path, chapter.code)

  let newChapters = bookConfig.chapters
  if (!chapter.path) {
    const nc = { id: chapter.id, name: chapter.name, file: `${chapter.name}.md` }
    if (!newChapters.find((c) => c.id === chapter.id)) {
      newChapters = [...newChapters, nc]
    }
  }
  const newBookConfig = { ...bookConfig, chapters: newChapters }
  await writeTextFile(
    `${dir}/.book.json`,
    JSON.stringify(newBookConfig, null, 2)
  )
  return newBookConfig
}

export async function saveAllBookData(book: BookInstance): Promise<void> {
  const dir = book.dir
  await saveContext(dir, book.contextData, book.contextGroups)
  await saveBookConfig(dir, book.bookConfig)
  await saveWorldData(dir, book.worldData)
  await saveKanbanData(dir, book.kanbanData)
  await saveNotes(dir, book.notes)
  await saveTimelineData(dir, book.timelineData)

  for (const ch of book.chapters) {
    const path = ch.path || `${dir}/${ch.name}.md`
    try {
      await writeTextFile(path, ch.code)
      if (!ch.path) {
        const bc = book.bookConfig
        const newChapter = { id: ch.id, name: ch.name, file: `${ch.name}.md` }
        if (!bc.chapters.find((c) => c.id === ch.id)) {
          const nc2 = { ...bc, chapters: [...bc.chapters, newChapter] }
          await writeTextFile(`${dir}/.book.json`, JSON.stringify(nc2, null, 2))
        }
      }
    } catch {}
  }
}