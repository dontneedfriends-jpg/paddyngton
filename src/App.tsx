import React, { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import Editor from '@uiw/react-codemirror'
import { lineNumbers, EditorView, highlightActiveLine } from '@codemirror/view'
import { search } from '@codemirror/search'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { undo, redo } from '@codemirror/commands'
import { useTranslation } from './i18n'
import { Language, languages } from './i18n'
import { Toast, ConfirmDialog, InputDialog } from './components/dialogs'
import { TimelinePanel } from './components/panels'
import { FORMAT_BUTTONS, MARKER_CLOSERS } from './constants'
import { loadSettings, saveSettingsToStorage } from './hooks/useSettings'
import {
  type ThemeName,
  type Chapter,
  type ContextEntry,
  type Relation,
  type RelationType,
  type ContextGroup,
  type BookConfig,
  type AppSettings,
  type BookInstance,
  type WorldEntry,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanCard,
  type TimelineEntry,
  type Note,
  type AppState,
  type VersionSnapshot,
  type FormatButton,
  RELATION_COLORS,
  THEME_LABELS,
  THEME_ICONS,
  THEME_ORDER,
  BOOK_TYPES,
  CONTEXT_TEMPLATES,
  TEMPLATE_NAMES,
  DEFAULT_SETTINGS,
} from './types'

export const relationColors = RELATION_COLORS

const editorExtensions = [
  highlightActiveLine(),
  search({ top: false }),
]

const defaultSettings = loadSettings()

function App() {
  const { t, language, setLanguage } = useTranslation()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [state, setState] = useState<AppState>({
    openBooks: [], activeBookId: null, sidebarOpen: true,
    showSettings: false, showContextEditor: false, showBookEditor: false,
    showBookDialog: false, bookDialogMode: 'open',
    showAbout: false, showWiki: false, showMindMap: false, showSearch: false,
    showVersions: false, isMaximized: false, tooltip: null,
    showTimeline: false, showNotes: false, showWorld: false, showKanban: false,
    mindMapZoom: 1,
    settingsTab: 0, wikiSelected: null, wikiEditMode: false, welcomeTab: 'create', showTemplateSelector: false, searchQuery: '',
    mindMapConnectFrom: null, mindMapEditEntry: null,
    showLinkModal: false, showColorPicker: false, colorPickerType: 'color',
    mindMapConnectGroupFrom: null, mindMapSelectedGroup: null, mindMapDrag: null,
    mindMapPanX: 0, mindMapPanY: 0,
  })
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [inputDialog, setInputDialog] = useState<{ title: string; label: string; defaultValue: string; multiline?: boolean; onSubmit: (value: string) => void } | null>(null)
  const inputDialogRef = useRef<HTMLInputElement | null>(null)
  const [selectedColor, setSelectedColor] = useState('#e53e3e')
  const [selectedBgColor, setSelectedBgColor] = useState('#faf089')
  const [linkUrl, setLinkUrl] = useState('')
  const colorInputRef = useRef<HTMLInputElement>(null)
  const bgColorInputRef = useRef<HTMLInputElement>(null)
  const mindMapDragRef = useRef<string | null>(null)
  const mindMapDragCursorStart = useRef<{ x: number; y: number } | null>(null)
  const mindMapDragEntryStart = useRef<{ x: number; y: number } | null>(null)
  const mindMapPanRef = useRef<string | null>(null)
  const mindMapPanStart = useRef<{ panX: number; panY: number; cursorX: number; cursorY: number } | null>(null)
  const mindMapCanvasRef = useRef<HTMLDivElement>(null)
  const [pendingRelation, setPendingRelation] = useState<{ from: string; to: string } | null>(null)
  const [relationTypeSelect, setRelationTypeSelect] = useState<RelationType>('neutral')

  const activeBook = state.openBooks.find(b => b.id === state.activeBookId) || null
  const chapters = activeBook?.chapters || []
  const activeChapterId = activeBook?.activeChapterId || null
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null
  const contextData = activeBook?.contextData || []
  const contextGroups = activeBook?.contextGroups || []
  const bookConfig = activeBook?.bookConfig || null

  const updateActiveBook = useCallback((patch: Partial<BookInstance>) => {
    setState(s => {
      if (!s.activeBookId) return s
      return {
        ...s,
        openBooks: s.openBooks.map(b =>
          b.id === s.activeBookId ? { ...b, ...patch } : b
        )
      }
    })
  }, [])

  const updateChapter = useCallback((chapterId: string, patch: Partial<Chapter>) => {
    updateActiveBook({ chapters: chapters.map(c => c.id === chapterId ? { ...c, ...patch } : c) })
  }, [chapters, updateActiveBook])

  const [commandQuery, setCommandQuery] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettingsToStorage(next)
      return next
    })
  }, [])

  const commands = [
    { name: t('commands.newBook'), shortcut: 'Ctrl+N', action: () => createNewBook() },
    { name: t('commands.openBook'), shortcut: 'Ctrl+O', action: () => setState(s => ({ ...s, showBookDialog: true, bookDialogMode: 'open' })) },
    { name: t('commands.saveChapter'), shortcut: 'Ctrl+S', action: () => saveChapter() },
    { name: 'Save Book As...', shortcut: '', action: () => setState(s => ({ ...s, showBookDialog: true, bookDialogMode: 'save' })) },
    { name: t('commands.newChapter'), shortcut: 'Ctrl+Shift+N', action: () => addChapter() },
    { name: t('commands.toggleSidebar'), shortcut: 'Ctrl+B', action: () => setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen })) },
    { name: t('commands.toggleTheme'), shortcut: 'Ctrl+T', action: () => cycleTheme() },
    { name: t('commands.editBookInfo'), shortcut: '', action: () => { setState(s => ({ ...s, showSettings: true, settingsTab: 1 })) } },
    { name: t('commands.editContext'), shortcut: '', action: () => setState(s => ({ ...s, showContextEditor: true })) },
    { name: t('commands.wiki'), shortcut: '', action: () => setState(s => ({ ...s, showWiki: true })) },
    { name: t('commands.mindMap'), shortcut: '', action: () => setState(s => ({ ...s, showMindMap: true })) },
    { name: t('commands.search'), shortcut: 'Ctrl+Shift+F', action: () => setState(s => ({ ...s, showSearch: true, searchQuery: '' })) },
    { name: 'Version History', shortcut: '', action: () => { loadVersions(); setState(s => ({ ...s, showVersions: true })) } },
    { name: t('commands.settings'), shortcut: 'Ctrl+,', action: () => setState(s => ({ ...s, showSettings: true })) },
  ]

  const filteredCommands = commands.filter(cmd => cmd.name.toLowerCase().includes(commandQuery.toLowerCase()))

  const getCloseMarker = (marker: string): string => {
    return MARKER_CLOSERS[marker] || marker
  }

  const applyColor = (color: string, isBg: boolean) => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const prop = isBg ? 'background-color' : 'color'
    if (selected) {
      const insert = `<span style="${prop}:${color}">${selected}</span>`
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from, head: from + insert.length }
      })
    } else {
      const placeholder = 'text'
      const insert = `<span style="${prop}:${color}">${placeholder}</span>`
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + `<span style="${prop}:${color}">`.length, head: from + insert.length - `</span>`.length }
      })
    }
    view.focus()
  }

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(settings.theme)
    updateSettings({ theme: THEME_ORDER[(idx + 1) % THEME_ORDER.length] })
  }

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm })
  }

  const applyFormat = (fmt: FormatButton) => {
    const view = editorViewRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const doc = view.state.doc

    switch (fmt.type) {
      case 'sep':
        return

      case 'line': {
        const line = doc.lineAt(from)
        const lineText = doc.sliceString(line.from, line.to)
        const prefix = fmt.value || ''
        if (lineText.startsWith(prefix)) {
          const newText = lineText.slice(prefix.length)
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: newText },
            selection: { anchor: line.from }
          })
        } else {
          view.dispatch({
            changes: { from: line.from, insert: prefix },
            selection: { anchor: from + prefix.length }
          })
        }
        break
      }

      case 'block': {
        const insert = fmt.value || '\n---\n'
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length }
        })
        break
      }

      case 'wrap': {
        const marker = fmt.value || ''
        const closeMarker = getCloseMarker(marker)
        if (selected) {
          view.dispatch({
            changes: { from, to, insert: marker + selected + closeMarker },
            selection: { anchor: from + marker.length, head: from + marker.length + selected.length }
          })
        } else {
          const placeholder = 'text'
          const insert = marker + placeholder + closeMarker
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + marker.length, head: from + marker.length + placeholder.length }
          })
        }
        break
      }

      case 'align': {
        const align = fmt.value || 'left'
        const line = doc.lineAt(from)
        const lineText = doc.sliceString(line.from, line.to)
        const wrapped = `<div align="${align}">${lineText}</div>`
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: wrapped },
          selection: { anchor: line.from + `<div align="${align}">`.length }
        })
        break
      }

      case 'codeblock': {
        if (selected) {
          view.dispatch({
            changes: { from, to, insert: '```\n' + selected + '\n```' },
            selection: { anchor: from + 4, head: from + 4 + selected.length }
          })
        } else {
          view.dispatch({
            changes: { from, to, insert: '```\n\n```' },
            selection: { anchor: from + 4 }
          })
        }
        break
      }

      case 'color': {
        colorInputRef.current?.click()
        break
      }

      case 'bgColor': {
        bgColorInputRef.current?.click()
        break
      }

      case 'link': {
        setInputDialog({ title: 'Insert Link', label: 'Enter URL:', defaultValue: selected ? '' : 'https://', onSubmit: (url) => {
          const view = editorViewRef.current
          if (!view || !url) return
          const { from, to } = view.state.selection.main
          const text = view.state.sliceDoc(from, to) || 'link text'
          view.dispatch({
            changes: { from, to, insert: `[${text}](${url})` },
            selection: { anchor: from, head: from + text.length + url.length + 4 }
          })
        }})
        break
      }
    }
    view.focus()
  }

  const getWordAtPos = (doc: string, pos: number): string => {
    let start = pos, end = pos
    while (start > 0 && /[\w\u0400-\u04FF]/.test(doc[start - 1])) start--
    while (end < doc.length && /[\w\u0400-\u04FF]/.test(doc[end])) end++
    return doc.slice(start, end)
  }

  const findContextEntry = (word: string): ContextEntry | null => {
    const lower = word.toLowerCase()
    return contextData.find(c => c.name.toLowerCase() === lower) || null
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeChapter || contextData.length === 0 || !editorViewRef.current) return
    if (tooltipTimeout.current) { clearTimeout(tooltipTimeout.current); tooltipTimeout.current = null }
    tooltipTimeout.current = setTimeout(() => {
      const view = editorViewRef.current
      if (!view) return
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
      if (pos == null) return
      const doc = view.state.doc.toString()
      const word = getWordAtPos(doc, pos)
      if (word.length > 2) {
        const entry = findContextEntry(word)
        if (entry) { setState(s => ({ ...s, tooltip: { ...entry, x: e.clientX, y: e.clientY } })); return }
      }
      setState(s => ({ ...s, tooltip: null }))
    }, 400)
  }, [activeChapter, contextData])

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeout.current) { clearTimeout(tooltipTimeout.current); tooltipTimeout.current = null }
    setState(s => ({ ...s, tooltip: null }))
  }, [])

  useEffect(() => {
    invoke<boolean>('is_maximized').then((res) => setState(s => ({ ...s, isMaximized: res })))
  }, [])

  useEffect(() => {
    invoke<string[]>('get_system_fonts').then(fonts => {
      setSystemFonts(fonts.sort((a, b) => a.localeCompare(b)))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (inInput && !e.ctrlKey && !e.metaKey) return

      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyK') { e.preventDefault(); setShowCommandPalette(true); setCommandQuery('') }
        else if (e.code === 'KeyO' && !e.shiftKey) { e.preventDefault(); setState(s => ({ ...s, showBookDialog: true, bookDialogMode: 'open' })) }
        else if (e.code === 'KeyO' && e.shiftKey) { e.preventDefault(); createNewBook() }
        else if (e.code === 'KeyS') { e.preventDefault(); saveChapter() }
        else if (e.code === 'KeyN' && !e.shiftKey) { e.preventDefault(); addChapter() }
        else if (e.code === 'KeyB') { e.preventDefault(); setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen })) }
        else if (e.code === 'KeyT') { e.preventDefault(); cycleTheme() }
        else if (e.code === 'KeyF' && e.shiftKey) { e.preventDefault(); setState(s => ({ ...s, showSearch: true, searchQuery: '' })) }
        else if (e.code === 'Comma') { e.preventDefault(); setState(s => ({ ...s, showSettings: true })) }
        else if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); if (editorViewRef.current) undo(editorViewRef.current) }
        else if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); if (editorViewRef.current) redo(editorViewRef.current) }
      }
      if (e.code === 'Escape') {
        setShowCommandPalette(false)
        setState(s => ({ ...s, showSettings: false, showContextEditor: false, showBookEditor: false, showAbout: false, showWiki: false, showMindMap: false, showSearch: false, showVersions: false, showTimeline: false, showNotes: false, showWorld: false, showKanban: false, mindMapConnectFrom: null }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (showCommandPalette && inputRef.current) inputRef.current.focus()
  }, [showCommandPalette])

  useEffect(() => {
    return () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current) }
  }, [])

  useEffect(() => {
    if (inputDialog || confirmDialog) {
      invoke('set_always_on_top', { value: true }).catch(() => {})
    }
    return () => {
      invoke('set_always_on_top', { value: false }).catch(() => {})
    }
  }, [inputDialog, confirmDialog])

  useEffect(() => {
    if (!activeBook || settings.autoSnapshotMinutes <= 0) return
    const interval = setInterval(() => {
      (async () => {
        await saveAllBookData()
        try {
          const snap = await invoke<VersionSnapshot>('save_version_snapshot', { bookDir: activeBook.dir, label: `Auto-save ${new Date().toLocaleString()}` })
          setVersions(prev => [snap, ...prev])
          showToast('Auto-snapshot created', 'info')
        } catch {}
      })()
    }, settings.autoSnapshotMinutes * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeBook, settings.autoSnapshotMinutes])

  useEffect(() => {
    if (!activeBook) return
    const interval = setInterval(() => {
      saveAllBookData().then(() => {
        if (settings.autoSaveToast) showToast('Book auto-saved', 'info')
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [activeBook, settings.autoSaveToast])

  const createNewBook = async () => {
    const selected = await open({ directory: true })
    if (!selected) return
    const bookDir = selected as string
    const contextPath = `${bookDir}/.context.json`
    const bookConfigPath = `${bookDir}/.book.json`
    const defaultContext: ContextEntry[] = [
      { name: 'Main Character', type: 'character', details: { Age: '', Gender: '', Occupation: '', Personality: '', Status: 'Alive' }, relations: [], notes: '' },
      { name: 'Setting', type: 'place', details: { Type: '', Location: '', Description: '', Atmosphere: '' }, notes: '' },
    ]
    const bookConfig: BookConfig = { title: 'New Book', author: 'Author', genre: 'Novel', bookType: 'Novel', description: '', createdAt: new Date().toISOString(), chapters: [] }
    try {
      await writeTextFile(contextPath, JSON.stringify(defaultContext, null, 2))
      await writeTextFile(bookConfigPath, JSON.stringify(bookConfig, null, 2))
      loadBook(bookDir, defaultContext, [], bookConfig)
    } catch (err) { console.error('Error creating book:', err) }
  }

  const openBookFolder = async () => {
    const selected = await open({ directory: true })
    if (!selected) return
    try {
      let contextData: ContextEntry[] = []
      let bookConfig: BookConfig | null = null
      const contextPath = `${selected}/.context.json`
      const bookConfigPath = `${selected}/.book.json`
      if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
      if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
      const groups = extractGroups(contextData)
      loadBook(selected as string, contextData, groups, bookConfig)
    } catch (err) { console.error('Error opening book:', err) }
  }

  const openBearFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Bear Book', extensions: ['bear'] }],
    })
    if (!selected) return
    try {
      const tempDir = await invoke<string>('open_bear', { bearPath: selected as string })
      let contextData: ContextEntry[] = []
      let bookConfig: BookConfig | null = null
      const contextPath = `${tempDir}/.context.json`
      const bookConfigPath = `${tempDir}/.book.json`
      if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
      if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
      const groups = extractGroups(contextData)
      loadBook(tempDir, contextData, groups, bookConfig)
    } catch (err) { console.error('Error opening .bear file:', err) }
  }

  const saveAsBear = async () => {
    if (!activeBook) return
    const path = await save({
      filters: [{ name: 'Bear Book', extensions: ['bear'] }],
      defaultPath: `${activeBook.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')}.bear`,
    })
    if (!path) return
    try {
      await invoke('save_bear', { bookDir: activeBook.dir, bearPath: path })
    } catch (err) { console.error('Error saving .bear file:', err) }
  }

  const saveAsFolder = async () => {
    if (!activeBook) return
    const selected = await open({ directory: true })
    if (!selected) return
    try {
      await invoke('save_bear', { bookDir: activeBook.dir, bearPath: `${selected}/${activeBook.title}.bear` })
    } catch (err) { console.error('Error saving as folder:', err) }
  }

  const extractGroups = (data: ContextEntry[]): ContextGroup[] => {
    const seen = new Set<string>()
    const groups: ContextGroup[] = []
    for (const entry of data) {
      const g = entry.group || t('context.noGroup')
      if (!seen.has(g)) { seen.add(g); groups.push({ name: g, type: entry.type }) }
    }
    return groups
  }

  const loadBook = async (dir: string, contextData: ContextEntry[], groups: ContextGroup[], bookConfig: BookConfig | null) => {
    const loadJson = async (path: string, fallback: unknown): Promise<unknown> => {
      try { if (await exists(path)) return JSON.parse(await readTextFile(path)) } catch {}
      return fallback
    }
    const worldData = (await loadJson(`${dir}/.world.json`, [])) as WorldEntry[]
    const kanbanData = (await loadJson(`${dir}/.kanban.json`, { columns: [
      { id: '1', name: 'Ideas', cards: [] },
      { id: '2', name: 'In Progress', cards: [] },
      { id: '3', name: 'Done', cards: [] },
    ]})) as KanbanBoard
    const notes = (await loadJson(`${dir}/.notes.json`, [])) as Note[]
    const timelineData = (await loadJson(`${dir}/.timeline.json`, [])) as TimelineEntry[]
    loadChaptersFromDisk(dir, bookConfig, (chapters, firstId) => {
      const bookId = dir + Date.now()
      const newBook: BookInstance = {
        id: bookId, title: bookConfig?.title || 'Untitled',
        dir, bookConfig: bookConfig || { title: 'Untitled', author: '', genre: '', bookType: 'Novel', description: '', createdAt: new Date().toISOString(), chapters: [] },
        contextData, contextGroups: groups, chapters, activeChapterId: firstId, isModified: false,
        worldData, kanbanData, notes, timelineData,
      }
      setState(s => ({
        ...s,
        openBooks: [...s.openBooks.filter(b => b.dir !== dir), newBook],
        activeBookId: bookId,
        showWiki: false, wikiSelected: null
      }))
    })
  }

  const loadChaptersFromDisk = async (dir: string, bookConfig: BookConfig | null, cb: (chapters: Chapter[], firstId: string | null) => void) => {
    if (!bookConfig || bookConfig.chapters.length === 0) {
      const id = Date.now().toString()
      cb([{ id, name: `${t('chapter.default')} 1`, path: null, code: `${t('chapter.default')} 1\n\n${t('editor.placeholder')}\n\n`, isModified: false }], id)
      return
    }
    const loaded: Chapter[] = []
    for (const ch of bookConfig.chapters) {
      const path = `${dir}/${ch.file}`
      try {
        const content = await readTextFile(path)
        loaded.push({ id: ch.id, name: ch.name, path, code: content, isModified: false })
      } catch {
        loaded.push({ id: ch.id, name: ch.name, path: null, code: `${ch.name}\n\n${t('editor.placeholder')}\n\n`, isModified: false })
      }
    }
    cb(loaded, loaded[0]?.id || null)
  }

  const saveChapter = async () => {
    if (!activeChapter || !activeBook) return
    const dir = activeBook.dir
    let path = activeChapter.path
    if (!path) path = `${dir}/${activeChapter.name}.md`
    try {
      await writeTextFile(path, activeChapter.code)
      const bc = activeBook.bookConfig
      let newChapters = bc.chapters
      if (!activeChapter.path) {
        const nc = { id: activeChapter.id, name: activeChapter.name, file: `${activeChapter.name}.md` }
        newChapters = [...bc.chapters, nc]
      }
      const nc2 = { ...bc, chapters: newChapters }
      await writeTextFile(`${dir}/.book.json`, JSON.stringify(nc2, null, 2))
      updateActiveBook({ chapters: chapters.map(c => c.id === activeChapter.id ? { ...c, path: path ?? null, isModified: false } : c), bookConfig: nc2 })
    } catch (err) { console.error('Error saving chapter:', err) }
  }

  const addChapter = () => {
    if (!activeBook) return
    const num = chapters.length + 1
    const id = Date.now().toString()
    const newChapters = [...chapters, { id, name: `${t('chapter.default')} ${num}`, path: null, code: `${t('chapter.default')} ${num}\n\n`, isModified: false }]
    updateActiveBook({ chapters: newChapters, activeChapterId: id })
  }

  const deleteChapter = async (id: string) => {
    if (chapters.length <= 1 || !activeBook) return
    const ch = chapters.find(c => c.id === id)
    if (ch?.path) {
      try { await invoke('delete_file', { path: ch.path }) } catch {}
    }
    const next = chapters.filter(c => c.id !== id)
    const newBookConfig = bookConfig ? { ...bookConfig, chapters: bookConfig.chapters.filter(c => c.id !== id) } : null
    if (newBookConfig) {
      await writeTextFile(`${activeBook.dir}/.book.json`, JSON.stringify(newBookConfig, null, 2))
    }
    updateActiveBook({ chapters: next, activeChapterId: next[0]?.id || null, bookConfig: newBookConfig })
  }

  const startRenameChapter = (id: string) => {
    updateActiveBook({ chapters: chapters.map(c => c.id === id ? { ...c, renaming: true } : c) })
  }

  const finishRenameChapter = (id: string, newName: string) => {
    updateActiveBook({ chapters: chapters.map(c => c.id === id ? { ...c, name: newName || c.name, renaming: false, isModified: true } : c) })
  }

  const handleEditorChange = useCallback((value: string) => {
    if (!activeChapterId) return
    updateActiveBook({ chapters: chapters.map(c => c.id === activeChapterId ? { ...c, code: value, isModified: true } : c) })
  }, [activeChapterId, chapters, updateActiveBook])

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
    return () => { editorViewRef.current = null }
  }, [])

  const saveContext = async () => {
    if (!activeBook) return
    try {
      await writeTextFile(`${activeBook.dir}/.context.json`, JSON.stringify(contextData, null, 2))
      updateActiveBook({ contextGroups: extractGroups(contextData) })
    } catch (err) { console.error('Error saving context:', err) }
  }

  const saveBookConfig = async () => {
    if (!activeBook || !bookConfig) return
    try {
      await writeTextFile(`${activeBook.dir}/.book.json`, JSON.stringify(bookConfig, null, 2))
    } catch (err) { console.error('Error saving book config:', err) }
  }

  const saveWorldData = async () => {
    if (!activeBook) return
    try { await writeTextFile(`${activeBook.dir}/.world.json`, JSON.stringify(activeBook.worldData, null, 2)) } catch {}
  }

  const saveKanbanData = async () => {
    if (!activeBook) return
    try { await writeTextFile(`${activeBook.dir}/.kanban.json`, JSON.stringify(activeBook.kanbanData, null, 2)) } catch {}
  }

  const saveNotes = async () => {
    if (!activeBook) return
    try { await writeTextFile(`${activeBook.dir}/.notes.json`, JSON.stringify(activeBook.notes, null, 2)) } catch {}
  }

  const saveTimelineData = async () => {
    if (!activeBook) return
    try { await writeTextFile(`${activeBook.dir}/.timeline.json`, JSON.stringify(activeBook.timelineData, null, 2)) } catch {}
  }

  const saveAllBookData = async () => {
    if (!activeBook) return
    await saveContext()
    await saveBookConfig()
    await saveWorldData()
    await saveKanbanData()
    await saveNotes()
    await saveTimelineData()
    const dir = activeBook.dir
    for (const ch of chapters) {
      let path = ch.path
      if (!path) path = `${dir}/${ch.name}.md`
      try {
        await writeTextFile(path, ch.code)
        if (!ch.path) {
          const bc = activeBook.bookConfig
          const newChapter = { id: ch.id, name: ch.name, file: `${ch.name}.md` }
          if (!bc.chapters.find(c => c.id === ch.id)) {
            const nc2 = { ...bc, chapters: [...bc.chapters, newChapter] }
            await writeTextFile(`${dir}/.book.json`, JSON.stringify(nc2, null, 2))
          }
        }
      } catch {}
    }
  }

  const updateWorld = (worldData: WorldEntry[]) => { updateActiveBook({ worldData }); saveWorldData() }
  const updateKanban = (kanbanData: KanbanBoard) => { updateActiveBook({ kanbanData }); saveKanbanData() }
  const updateNotes = (notes: Note[]) => { updateActiveBook({ notes }); saveNotes() }
  const updateTimeline = (timelineData: TimelineEntry[]) => { updateActiveBook({ timelineData }); saveTimelineData() }

  const loadVersions = async () => {
    if (!activeBook) return
    try {
      const snaps = await invoke<VersionSnapshot[]>('list_version_snapshots', { bookDir: activeBook.dir })
      setVersions(snaps)
    } catch (err) { console.error('Error loading versions:', err) }
  }

  const createSnapshot = async () => {
    if (!activeBook) return
    const label = snapshotLabel.trim() || new Date().toLocaleString()
    try {
      await saveAllBookData()
      const snap = await invoke<VersionSnapshot>('save_version_snapshot', { bookDir: activeBook.dir, label })
      setVersions(prev => [snap, ...prev])
      setSnapshotLabel('')
      showToast('Snapshot created', 'success')
    } catch (err) { console.error('Error creating snapshot:', err); showToast('Failed to create snapshot', 'error') }
  }

  const restoreSnapshot = async (snapshotId: string) => {
    if (!activeBook) return
    confirmAction('Restore this version? Current files will be overwritten.', async () => {
      try {
        const bookDir = activeBook.dir
        await invoke('restore_version_snapshot', { bookDir, snapshotId })
        setState(s => ({ ...s, openBooks: s.openBooks.filter(b => b.id !== activeBook.id), activeBookId: s.activeBookId === activeBook.id ? null : s.activeBookId }))
        let contextData: ContextEntry[] = []
        let bookConfig: BookConfig | null = null
        const contextPath = `${bookDir}/.context.json`
        const bookConfigPath = `${bookDir}/.book.json`
        if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
        if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
        const groups = extractGroups(contextData)
        loadBook(bookDir, contextData, groups, bookConfig)
        showToast('Version restored', 'success')
      } catch (err) { console.error('Error restoring snapshot:', err); showToast('Failed to restore version', 'error') }
    })
  }

  const handleMinimize = () => invoke('minimize_window')

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = mindMapCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const centerX = rect.width / 2 + rect.left
    const centerY = rect.height / 2 + rect.top
    const x = (e.clientX - centerX - state.mindMapPanX) / state.mindMapZoom + 420
    const y = (e.clientY - centerY - state.mindMapPanY) / state.mindMapZoom + 230
    return { x, y }
  }

  const handleMindMapMouseDown = (e: React.MouseEvent, entryName: string) => {
    e.stopPropagation()
    if (state.mindMapConnectFrom) return
    const existing = contextData.find(c => c.name === entryName)
    const startX = existing?._x ?? 420
    const startY = existing?._y ?? 230
    const coords = getCanvasCoords(e)
    mindMapDragEntryStart.current = { x: startX, y: startY }
    mindMapDragCursorStart.current = { x: coords.x, y: coords.y }
    mindMapDragRef.current = entryName
    mindMapPanRef.current = null
    setState(s => ({ ...s, mindMapDrag: entryName }))
  }

  const handleMindMapCanvasMouseDown = (e: React.MouseEvent) => {
    if (state.mindMapConnectFrom) return
    mindMapDragRef.current = null
    mindMapDragCursorStart.current = null
    mindMapDragEntryStart.current = null
    mindMapPanStart.current = { panX: state.mindMapPanX, panY: state.mindMapPanY, cursorX: e.clientX, cursorY: e.clientY }
    mindMapPanRef.current = 'panning'
  }

  const handleMindMapMouseMove = (e: React.MouseEvent) => {
    if (mindMapPanRef.current === 'panning' && mindMapPanStart.current) {
      const dx = e.clientX - mindMapPanStart.current.cursorX
      const dy = e.clientY - mindMapPanStart.current.cursorY
      setState(s => ({ ...s, mindMapPanX: mindMapPanStart.current!.panX + dx, mindMapPanY: mindMapPanStart.current!.panY + dy }))
      return
    }
    if (!mindMapDragRef.current || !mindMapDragCursorStart.current || !mindMapDragEntryStart.current) return
    const coords = getCanvasCoords(e)
    const dx = coords.x - mindMapDragCursorStart.current.x
    const dy = coords.y - mindMapDragCursorStart.current.y
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
    const newX = mindMapDragEntryStart.current.x + dx
    const newY = mindMapDragEntryStart.current.y + dy
    const d = contextData.map(c => c.name === mindMapDragRef.current ? { ...c, _x: Math.round(newX), _y: Math.round(newY) } : c)
    updateActiveBook({ contextData: d })
    mindMapDragCursorStart.current = { x: coords.x, y: coords.y }
    mindMapDragEntryStart.current = { x: newX, y: newY }
  }

  const handleMindMapMouseUp = () => {
    mindMapDragRef.current = null
    mindMapDragCursorStart.current = null
    mindMapDragEntryStart.current = null
    mindMapPanRef.current = null
    mindMapPanStart.current = null
    setState(s => ({ ...s, mindMapDrag: null }))
  }

  const zoomTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMindMapWheel = (e: React.WheelEvent) => {
    if (zoomTimeoutRef.current) return
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    zoomTimeoutRef.current = setTimeout(() => {
      zoomTimeoutRef.current = null
    }, 50)
    setState(s => ({ ...s, mindMapZoom: Math.max(0.3, Math.min(2.5, s.mindMapZoom + delta)) }))
  }


  const handleMaximize = async () => {
    await invoke('maximize_window')
    const isMax = await invoke('is_maximized') as boolean
    setState(s => ({ ...s, isMaximized: isMax }))
  }
  const handleClose = () => invoke('close_window')

  const fontCss = settings.fontFamily ? `'${settings.fontFamily}', sans-serif` : "'IBM Plex Sans', sans-serif"

  const searchResults = useCallback(() => {
    if (!state.searchQuery.trim() || state.searchQuery.length < 2) return { entries: [], chapters: [] }
    const q = state.searchQuery.toLowerCase()
    const entries = contextData.filter(e => e.name.toLowerCase().includes(q))
    const chaptersWith: { chapter: Chapter; matches: number }[] = chapters.map(ch => ({
      chapter: ch,
      matches: (ch.code.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    })).filter(c => c.matches > 0)
    return { entries, chapters: chaptersWith }
  }, [state.searchQuery, contextData, chapters])

  const { entries: searchEntries, chapters: searchChapters } = searchResults()
  const mindMapEntries = contextData.filter(e => e.type === 'character')

  const langOptions = languages.map(l => ({ value: l.code, label: l.nativeLabel }))

  return (
    <div className={`app ${settings.theme}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {state.tooltip && (
        <div className="context-tooltip" style={{ left: state.tooltip.x + 14, top: state.tooltip.y + 14 }}>
          <div className="context-tooltip-name">{state.tooltip.name}</div>
          <div className="context-tooltip-type">
            {state.tooltip.type === 'character' ? '👤 ' + t('context.types.character') :
             state.tooltip.type === 'place' ? '📍 ' + t('context.types.place') :
             state.tooltip.type === 'date' ? '📅 ' + t('context.types.date') : '📦 ' + t('context.types.item')}
          </div>
          <div className="context-tooltip-details">
            {Object.entries(state.tooltip.details).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="context-tooltip-detail"><strong>{k}:</strong> {v}</div>
            ))}
          </div>
        </div>
      )}

      {showCommandPalette && (
        <div className="modal-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={e => e.stopPropagation()}>
            <div className="command-input-wrapper">
              <input ref={inputRef} type="text" className="command-input" placeholder={t('commands.title') + '...'} value={commandQuery} onChange={e => setCommandQuery(e.target.value)} />
            </div>
            <div className="command-list">
              {filteredCommands.map((cmd, i) => (
                <div key={i} className="command-item" onClick={() => { cmd.action(); setShowCommandPalette(false) }}>
                  <div className="command-icon">{cmd.name[0]}</div>
                  <span>{cmd.name}</span>
                  {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.showSettings && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showSettings: false }))}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>{t('settings.title')}</h2>
              <button className="btn-icon" onClick={() => setState(s => ({ ...s, showSettings: false }))}>×</button>
            </div>
            <div className="settings-tabs">
              {[t('settings.tabs.appearance'), t('settings.tabs.book'), t('settings.tabs.about')].map((tab, i) => (
                <div key={i} className={`settings-tab ${state.settingsTab === i ? 'active' : ''}`} onClick={() => setState(s => ({ ...s, settingsTab: i }))}>{tab}</div>
              ))}
            </div>
            <div className="settings-body">
              {state.settingsTab === 0 && (
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
              {state.settingsTab === 1 && bookConfig && (
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
                  <button className="btn btn-primary" onClick={async () => { await saveBookConfig() }}>💾 {t('settings.bookSave')}</button>
                </div>
              )}
              {state.settingsTab === 1 && !bookConfig && (
                <div className="setting-section"><p style={{ color: 'var(--cool-gray)', fontSize: '13px' }}>{t('settings.noBookOpen')}</p></div>
              )}
              {state.settingsTab === 2 && (
                <div className="setting-section">
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--near-black)', marginBottom: '4px' }}>{t('settings.aboutTitle')}</div>
                    <div style={{ fontSize: '13px', color: 'var(--cool-gray)', marginBottom: '16px' }}>{t('settings.aboutVersion')}</div>
                    <div style={{ fontSize: '13px', color: 'var(--cool-gray)', lineHeight: '1.6', marginBottom: '20px' }}>{t('settings.aboutDesc')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{t('settings.aboutBuilt')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showAbout && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showAbout: false }))}>
          <div className="about-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2>{t('about.title')}</h2><button className="btn-icon" onClick={() => setState(s => ({ ...s, showAbout: false }))}>×</button></div>
            <div>
              <div className="about-logo">📖</div>
              <div className="about-title">{t('about.title')}</div>
              <div className="about-version">{t('about.version')}</div>
              <div className="about-desc">{t('about.desc')}</div>
              <div className="about-links"><span className="about-link">{t('about.built')}</span></div>
            </div>
          </div>
        </div>
      )}

      {state.showContextEditor && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showContextEditor: false, mindMapEditEntry: null }))}>
          <div className="editor-panel context-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>{t('context.title')}</h2>
              <div className="panel-header-actions">
                {state.mindMapEditEntry && (
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>👤 {state.mindMapEditEntry.name}</span>
                )}
                <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showWiki: true }))}>📚 Wiki</button>
                <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showMindMap: true, mindMapEditEntry: null }))}>🕸️ Map</button>
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showContextEditor: false, mindMapEditEntry: null }))}>×</button>
              </div>
            </div>
            <div className="panel-content">
              {state.mindMapEditEntry && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--accent)', color: 'white', borderRadius: '8px', fontSize: '13px' }}>
                  Editing: <strong>{state.mindMapEditEntry.name}</strong>
                  {state.mindMapEditEntry.relations && state.mindMapEditEntry.relations.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                      Relations: {state.mindMapEditEntry.relations.map(r => `${r.name} (${t('relations.' + r.type)})`).join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="context-list">
                {(state.mindMapEditEntry ? [contextData.find(e => e.name === state.mindMapEditEntry!.name) || contextData[0]] : contextData).filter(Boolean).map((ctx, i) => (
                  <div key={i} className="context-card">
                    <div className="context-card-header">
                      <input type="text" className="context-name-input" value={ctx!.name}
                        onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].name = e.target.value; updateActiveBook({ contextData: d }) }} />
                      <select className="context-type-select" value={ctx!.type}
                        onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].type = e.target.value as ContextEntry['type']; updateActiveBook({ contextData: d }) }}>
                        <option value="character">👤 {t('context.types.character')}</option>
                        <option value="place">📍 {t('context.types.place')}</option>
                        <option value="date">📅 {t('context.types.date')}</option>
                        <option value="item">📦 {t('context.types.item')}</option>
                      </select>
                      <input type="text" placeholder={t('context.group')} style={{ padding: '4px 8px', background: 'var(--white)', border: '1px solid var(--border-gray)', borderRadius: '6px', fontSize: '12px', width: '100px', color: 'var(--near-black)', fontFamily: 'inherit' }}
                        value={ctx!.group || ''} onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].group = e.target.value; updateActiveBook({ contextData: d }) }} />
                      {!state.mindMapEditEntry && (
                        <button className="btn-icon" onClick={() => { const d = contextData.filter((_, idx) => idx !== i); updateActiveBook({ contextData: d }) }}>🗑️</button>
                      )}
                    </div>
                    {ctx!.type === 'character' && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginBottom: '4px', fontWeight: 600 }}>RELATIONS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {(ctx!.relations || []).map((rel, ri) => (
                            <span key={ri} className="relation-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: relationColors[rel.type], color: 'white', borderRadius: '12px', fontSize: '11px' }}>
                              👤 {rel.name}
                              <span style={{ opacity: 0.7, fontSize: '9px' }}>{t('relations.' + rel.type)}</span>
                              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0', fontSize: '12px', lineHeight: 1 }} onClick={() => {
                                const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                                if (idx >= 0) d[idx].relations = (d[idx].relations || []).filter((r: Relation) => r.name !== rel.name)
                                updateActiveBook({ contextData: d })
                              }}>×</button>
                            </span>
                          ))}
                          <button className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => {
                            setInputDialog({ title: 'Add Relation', label: 'Character name:', defaultValue: '', onSubmit: (name) => {
                              if (name && name.trim()) {
                                const relTypes: Relation['type'][] = ['ally', 'enemy', 'family', 'neutral', 'romantic', 'rival']
                                setInputDialog({ title: 'Relation Type', label: 'Select relation type:', defaultValue: 'ally', onSubmit: (type) => {
                                  const relType = relTypes.includes(type as Relation['type']) ? type as Relation['type'] : 'neutral'
                                  const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                                  if (idx >= 0) {
                                    if (!d[idx].relations) d[idx].relations = []
                                    if (!d[idx].relations!.find((r: Relation) => r.name === name.trim())) d[idx].relations = [...d[idx].relations!, { name: name.trim(), type: relType }]
                                  }
                                  updateActiveBook({ contextData: d })
                                }})
                              }
                            }})
                          }}>+ Rel</button>
                        </div>
                      </div>
                    )}
                    <div className="context-details">
                      {Object.entries(ctx!.details).map(([key, value], j) => (
                        <div key={j} className="detail-row">
                          <input type="text" className="detail-key-input" value={key} placeholder={t('context.property')}
                            onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) { const nd: Record<string, string> = {}; Object.entries(d[idx].details).forEach(([k, v], idx2) => { nd[idx2 === j ? e.target.value : k] = v }); d[idx].details = nd }; updateActiveBook({ contextData: d }) }} />
                          <input type="text" className="detail-value-input" value={value} placeholder="Value"
                            onChange={e => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[key] = e.target.value; updateActiveBook({ contextData: d }) }} />
                          <button className="btn-icon" onClick={() => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) delete d[idx].details[key]; updateActiveBook({ contextData: d }) }}>×</button>
                        </div>
                      ))}
                      <button className="btn btn-sm" onClick={() => { const d = [...contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[`prop${Object.keys(ctx!.details).length + 1}`] = ''; updateActiveBook({ contextData: d }) }}>+ {t('context.addProperty')}</button>
                    </div>
                  </div>
                ))}
              </div>
              {!state.mindMapEditEntry && (
                <>
                  {!state.showTemplateSelector ? (
                    <button className="btn btn-primary" onClick={() => setState(s => ({ ...s, showTemplateSelector: true }))}>+ {t('context.add')}</button>
                  ) : (
                    <div className="template-selector">
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cool-gray)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choose type</div>
                      <div className="template-types">
                        {(['character', 'place', 'date', 'item'] as const).map(type => {
                          const typeLabel = type === 'character' ? 'Character' : type === 'place' ? 'Place' : type === 'date' ? 'Date/Event' : 'Item'
                          return (
                            <button key={type} className="template-type-btn" onClick={() => {
                              setInputDialog({ title: `Add ${typeLabel}`, label: `${typeLabel} name:`, defaultValue: '', onSubmit: (name) => {
                                if (name && name.trim()) {
                                  const details: Record<string, string> = {}
                                  Object.keys(CONTEXT_TEMPLATES[type]).forEach(k => { details[k] = '' })
                                  updateActiveBook({ contextData: [...contextData, { name: name.trim(), type, details, group: '', relations: [], notes: '' }] })
                                }
                                setState(s => ({ ...s, showTemplateSelector: false }))
                              }})
                            }}>
                              <span style={{ fontSize: '24px' }}>{type === 'character' ? '👤' : type === 'place' ? '📍' : type === 'date' ? '📅' : '📦'}</span>
                              <span>{typeLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                      <button className="btn btn-sm" style={{ marginTop: '8px' }} onClick={() => setState(s => ({ ...s, showTemplateSelector: false }))}>Cancel</button>
                    </div>
                  )}
                </>
              )}
              <div className="panel-actions">
                <button className="btn btn-primary" onClick={async () => { await saveContext(); setState(s => ({ ...s, showContextEditor: false, mindMapEditEntry: null })) }}>{t('context.save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.showWiki && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showWiki: false }))}>
          <div className="wiki-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2>📚 {t('wiki.title')}</h2><button className="btn-icon" onClick={() => setState(s => ({ ...s, showWiki: false }))}>×</button></div>
            <div className="wiki-body">
              <div className="wiki-sidebar">
                {contextGroups.map((g, gi) => {
                  const items = contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
                  return (
                    <div key={gi} className="wiki-sidebar-section">
                      <div className="wiki-sidebar-title">{g.name}</div>
                      {items.map((item, i) => (
                        <div key={i} className={`wiki-sidebar-item ${state.wikiSelected?.name === item.name ? 'active' : ''}`}
                          onClick={() => setState(s => ({ ...s, wikiSelected: item }))}>
                          <span>{item.type === 'character' ? '👤' : item.type === 'place' ? '📍' : item.type === 'date' ? '📅' : '📦'}</span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div className="wiki-content">
                {state.wikiSelected ? (
                  <>
                    <div className="wiki-entry-header">
                      <span className="wiki-entry-icon">
                        {state.wikiSelected.type === 'character' ? '👤' : state.wikiSelected.type === 'place' ? '📍' : state.wikiSelected.type === 'date' ? '📅' : '📦'}
                      </span>
                      <span className="wiki-entry-name">{state.wikiSelected.name}</span>
                      <span className="wiki-entry-type">
                        {state.wikiSelected.type === 'character' ? t('context.types.character') :
                         state.wikiSelected.type === 'place' ? t('context.types.place') :
                         state.wikiSelected.type === 'date' ? t('context.types.date') : t('context.types.item')}
                      </span>
                      <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                        onClick={() => setState(s => ({ ...s, wikiEditMode: !s.wikiEditMode }))}>
                        {state.wikiEditMode ? '👁 ' + t('context.view') : '✏️ ' + t('context.edit')}
                      </button>
                    </div>
                    {state.wikiSelected.group && (
                      <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '12px' }}>{t('wiki.group')}: {state.wikiSelected.group}</div>
                    )}
                    {state.wikiEditMode ? (
                      <div className="wiki-edit-form">
                        <div className="form-group"><label>{t('context.name')}</label>
                          <input type="text" className="form-input" value={state.wikiSelected.name}
                            onChange={e => {
                              const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, name: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, name: e.target.value } }))
                            }} />
                        </div>
                        <div className="form-group"><label>{t('context.group')}</label>
                          <input type="text" className="form-input" value={state.wikiSelected.group || ''}
                            onChange={e => {
                              const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, group: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, group: e.target.value } }))
                            }} />
                        </div>
                        <div className="form-group"><label>{t('context.notes') || 'Notes'}</label>
                          <textarea className="form-textarea" rows={4} value={state.wikiSelected.notes || ''}
                            placeholder={t('context.notesPlaceholder') || 'Personal notes, ideas, drafts...'}
                            onChange={e => {
                              const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, notes: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, notes: e.target.value } }))
                            }} />
                        </div>
                        <div className="form-group"><label>Properties</label>
                          {Object.entries(state.wikiSelected.details).map(([k, v], i) => (
                            <div key={i} className="detail-row">
                              <input type="text" className="detail-key-input" value={k}
                                onChange={e => {
                                  const nd: Record<string, string> = {}
                                  Object.entries(state.wikiSelected!.details).forEach(([kk, vv], idx) => { nd[idx === i ? e.target.value : kk] = vv })
                                  const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, details: nd } : c)
                                  updateActiveBook({ contextData: d })
                                  setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, details: nd } }))
                                }} />
                              <input type="text" className="detail-value-input" value={v}
                                onChange={e => {
                                  const nd = { ...state.wikiSelected!.details, [k]: e.target.value }
                                  const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, details: nd } : c)
                                  updateActiveBook({ contextData: d })
                                  setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, details: nd } }))
                                }} />
                              <button className="btn-icon" onClick={() => {
                                const nd: Record<string, string> = {}
                                Object.entries(state.wikiSelected!.details).forEach(([kk, vv], idx) => { if (idx !== i) nd[kk] = vv })
                                const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, details: nd } : c)
                                updateActiveBook({ contextData: d })
                                setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, details: nd } }))
                              }}>×</button>
                            </div>
                          ))}
                          <button className="btn btn-sm" onClick={() => {
                            const key = `prop${Object.keys(state.wikiSelected!.details).length + 1}`
                            const nd = { ...state.wikiSelected!.details, [key]: '' }
                            const d = contextData.map(c => c.name === state.wikiSelected!.name ? { ...c, details: nd } : c)
                            updateActiveBook({ contextData: d })
                            setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, details: nd } }))
                          }}>+ Add property</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button className="btn btn-primary" onClick={async () => { await saveContext(); setState(s => ({ ...s, wikiEditMode: false })) }}>
                            💾 {t('context.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="wiki-detail-grid">
                          {Object.entries(state.wikiSelected.details).filter(([, v]) => v).map(([k, v]) => (
                            <React.Fragment key={k}>
                              <div className="wiki-detail-key">{k}</div>
                              <div className="wiki-detail-value">{v}</div>
                            </React.Fragment>
                          ))}
                        </div>
                        {state.wikiSelected.notes && (
                          <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>NOTES</h4>
                            <div style={{ fontSize: '13px', color: 'var(--text)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap' }}>{state.wikiSelected.notes}</div>
                          </div>
                        )}
                        {state.wikiSelected.type === 'character' && (
                          <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>{t('wiki.relationships')}</h4>
                            {state.wikiSelected.relations && state.wikiSelected.relations.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {state.wikiSelected.relations.map((rel, i) => {
                                  const relEntry = contextData.find(c => c.name === rel.name)
                                  return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 12px', borderLeft: `4px solid ${relationColors[rel.type]}` }}>
                                      <span style={{ fontSize: '12px' }}>{relEntry?.type === 'character' ? '👤' : relEntry?.type === 'place' ? '📍' : '📦'}</span>
                                      <span style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}
                                        onClick={() => relEntry && setState(s => ({ ...s, wikiSelected: relEntry }))}>
                                        {rel.name}
                                      </span>
                                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: relationColors[rel.type] + '30', color: relationColors[rel.type], fontWeight: 600 }}>
                                        {t('relations.' + rel.type)}
                                      </span>
                                      <select
                                        value={rel.type}
                                        onChange={e => {
                                          const newType = e.target.value as Relation['type']
                                          const newD = contextData.map(c => c.name === state.wikiSelected!.name
                                            ? { ...c, relations: c.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) }
                                            : c)
                                          updateActiveBook({ contextData: newD })
                                          setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, relations: s.wikiSelected!.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) } }))
                                        }}
                                        style={{ marginLeft: 'auto', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-gray)', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                                        <option value="ally">🤝 {t('relations.friendly')}</option>
                                        <option value="family">👨‍👩‍👧 {t('relations.family')}</option>
                                        <option value="romantic">❤️ {t('relations.romantic')}</option>
                                        <option value="neutral">➖ {t('relations.neutral')}</option>
                                        <option value="rival">⚔️ {t('relations.rival')}</option>
                                        <option value="enemy">💀 {t('relations.hostile')}</option>
                                      </select>
                                      <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                                        onClick={() => {
                                          const newD = contextData.map(c => c.name === state.wikiSelected!.name
                                            ? { ...c, relations: c.relations?.filter(r => r.name !== rel.name) }
                                            : c)
                                          updateActiveBook({ contextData: newD })
                                          setState(s => ({ ...s, wikiSelected: { ...s.wikiSelected!, relations: s.wikiSelected!.relations?.filter(r => r.name !== rel.name) } }))
                                        }}>🗑️</button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: 'var(--cool-gray)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px' }}>
                                {t('wiki.noRelationships')}
                              </div>
                            )}
                            <div style={{ marginTop: '8px' }}>
                              <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showMindMap: true }))}>
                                🕸️ {t('wiki.openMindMap')}
                              </button>
                            </div>
                          </div>
                        )}
                        {state.wikiSelected && activeBook && (() => {
                          const charName = state.wikiSelected.name
                          const relatedEvents: { type: 'timeline' | 'world'; title: string; date?: string; content: string }[] = []
                          activeBook.timelineData.forEach(t => {
                            if (t.characterIds.includes(charName)) {
                              relatedEvents.push({ type: 'timeline', title: t.label, date: t.date, content: t.content })
                            }
                          })
                          activeBook.worldData.forEach(w => {
                            if (w.characterIds.includes(charName)) {
                              relatedEvents.push({ type: 'world', title: w.title, date: w.date, content: w.content })
                            }
                          })
                          if (relatedEvents.length > 0) {
                            return (
                              <div style={{ marginTop: '16px' }}>
                                <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>EVENTS & CONNECTIONS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {relatedEvents.map((ev, i) => (
                                    <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 12px', borderLeft: `4px solid ${ev.type === 'timeline' ? '#e53e3e' : '#38a169'}` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '📅' : '🌍'}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{ev.title}</span>
                                        {ev.date && <span style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{ev.date}</span>}
                                      </div>
                                      {ev.content && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.content}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                        <div className="wiki-cross-refs">
                          <h4>{t('wiki.related')}</h4>
                          {contextData.filter(e => e.type === 'character' && e.name !== state.wikiSelected!.name).map((e, i) => (
                            <button key={i} className="wiki-ref-item"
                              onClick={() => setState(s => ({ ...s, wikiSelected: e }))}>
                              👤 {e.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>{t('wiki.selectItem')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {state.showMindMap && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null }))}>
          <div className="mindmap-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="panel-header">
              <h2>🕸️ {t('mindmap.title')}</h2>
              <div className="panel-header-actions">
                <button className="btn btn-sm" onClick={() => {
                  setInputDialog({ title: t('mindmap.addCharacter'), label: t('mindmap.enterName'), defaultValue: '', onSubmit: (name) => {
                    if (name && name.trim()) {
                      const details: Record<string, string> = {}
                      Object.keys(CONTEXT_TEMPLATES.character).forEach(k => { details[k] = '' })
                      updateActiveBook({ contextData: [...contextData, { name: name.trim(), type: 'character', details, relations: [], group: '', notes: '' }] })
                    }
                  }})
                }}>➕ {t('mindmap.addCharacter')}</button>
                {state.mindMapConnectFrom ? (
                  <button className="btn btn-sm btn-warning" onClick={() => setState(s => ({ ...s, mindMapConnectFrom: null }))}>✕ {t('mindmap.disconnectMode')}</button>
                ) : (
                  <button className="btn btn-sm btn-secondary" onClick={() => setState(s => ({ ...s, mindMapConnectFrom: '__start__' }))}>🔗 {t('mindmap.connectMode')}</button>
                )}
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null }))}>×</button>
              </div>
            </div>
            {pendingRelation && (
              <div style={{ padding: '12px 16px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {pendingRelation.from} → {pendingRelation.to}
                </span>
                <select
                  value={relationTypeSelect}
                  onChange={e => setRelationTypeSelect(e.target.value as typeof relationTypeSelect)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="ally" style={{ color: '#38a169' }}>🤝 {t('relations.friendly')}</option>
                  <option value="family" style={{ color: '#3182ce' }}>👨‍👩‍👧 {t('relations.family')}</option>
                  <option value="romantic" style={{ color: '#d69e2e' }}>❤️ {t('relations.romantic')}</option>
                  <option value="neutral" style={{ color: '#718096' }}>➖ {t('relations.neutral')}</option>
                  <option value="rival" style={{ color: '#805ad5' }}>⚔️ {t('relations.rival')}</option>
                  <option value="enemy" style={{ color: '#e53e3e' }}>💀 {t('relations.hostile')}</option>
                </select>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} onClick={() => {
                  const newD = contextData.map(e => e.name === pendingRelation.from && !e.relations?.find(r => r.name === pendingRelation.to)
                    ? { ...e, relations: [...(e.relations || []), { name: pendingRelation.to, type: relationTypeSelect }] } : e)
                  updateActiveBook({ contextData: newD })
                  setPendingRelation(null)
                }}>Add Connection</button>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => setPendingRelation(null)}>Cancel</button>
              </div>
            )}
            <div className="mindmap-toolbar">
              <span style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{mindMapEntries.length} {t('mindmap.characters')}</span>
              {(() => {
                const groups = [...new Set(mindMapEntries.map(e => e.group || t('context.noGroup')))]
                return groups.length > 1 ? <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{groups.length} groups</span> : null
              })()}
              {state.mindMapConnectFrom && state.mindMapConnectFrom !== '__start__' && (
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{t('mindmap.connectionFrom')}</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setState(s => ({ ...s, mindMapZoom: Math.max(0.3, s.mindMapZoom - 0.1) }))}>−</button>
                <span style={{ fontSize: '11px', color: 'var(--cool-gray)', minWidth: '36px', textAlign: 'center' }}>{Math.round(state.mindMapZoom * 100)}%</span>
                <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setState(s => ({ ...s, mindMapZoom: Math.min(2.5, s.mindMapZoom + 0.1) }))}>+</button>
              </div>
            </div>
            <div className="mindmap-canvas" ref={mindMapCanvasRef}
              style={{ position: 'relative', minHeight: '450px', overflow: 'hidden', cursor: mindMapPanRef.current === 'panning' ? 'grabbing' : 'default' }}
              onMouseMove={handleMindMapMouseMove} onMouseUp={handleMindMapMouseUp} onMouseLeave={handleMindMapMouseUp}
              onMouseDown={handleMindMapCanvasMouseDown} onWheel={handleMindMapWheel}>
              <div className="mindmap-canvas-inner"
                style={{ transform: `translate(${state.mindMapPanX}px, ${state.mindMapPanY}px) scale(${state.mindMapZoom})`, transformOrigin: 'center', transition: mindMapPanRef.current ? 'none' : 'transform 0.15s ease', position: 'absolute', left: '50%', top: '50%', marginLeft: '-420px', marginTop: '-230px' }}>
              <div style={{ width: '840px', height: '460px', position: 'relative' }}>
              {mindMapEntries.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cool-gray)', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
                  {t('mindmap.noCharacters')}
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setInputDialog({ title: t('mindmap.addCharacter'), label: t('mindmap.enterName'), defaultValue: '', onSubmit: (name) => {
                      if (name && name.trim()) {
                        const details: Record<string, string> = {}
                        Object.keys(CONTEXT_TEMPLATES.character).forEach(k => { details[k] = '' })
                        updateActiveBook({ contextData: [...contextData, { name: name.trim(), type: 'character', details, relations: [], group: '', notes: '' }] })
                      }
                    }})
                  }}>➕ {t('mindmap.addCharacter')}</button>
                </div>
              )}
              {mindMapEntries.length > 0 && (() => {
                const groups = [...new Map(mindMapEntries.map(e => [e.group || t('context.noGroup'), e.group || t('context.noGroup')])).keys()]
                const gc = groups.length || 1
                const cx = 420, cy = 230, r = 200
                const groupPositions: Record<string, { x: number; y: number }> = {}
                groups.forEach((g, gi) => {
                  const angle = (gi / gc) * Math.PI * 2 - Math.PI / 2
                  groupPositions[g] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
                })
                const memberPositions: Record<string, { x: number; y: number }> = {}
                groups.forEach(g => {
                  const members = mindMapEntries.filter(e => (e.group || t('context.noGroup')) === g)
                  const gp = groupPositions[g]
                  members.forEach((e, mi) => {
                    if (e._x !== undefined && e._y !== undefined) {
                      memberPositions[e.name] = { x: e._x, y: e._y }
                    } else {
                      const ma = members.length > 1 ? (mi / members.length) * Math.PI * 2 : 0
                      const mr = members.length > 1 ? 70 : 0
                      memberPositions[e.name] = {
                        x: gp.x + mr * Math.cos(ma - Math.PI / 2),
                        y: gp.y + mr * Math.sin(ma - Math.PI / 2)
                      }
                    }
                  })
                })
                return (
                  <>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                      {groups.map((g, gi) => {
                        const gp = groupPositions[g]
                        return groups.slice(gi + 1).map((g2, gi2) => {
                          const gp2 = groupPositions[g2]
                          return <line key={`${gi}-${gi2}`} x1={gp.x} y1={gp.y} x2={gp2.x} y2={gp2.y}
                            stroke="var(--accent)" strokeWidth="3" opacity="0.5" strokeDasharray="6 3" />
                        })
                      })}
                      {mindMapEntries.flatMap((entry, i) =>
                        (entry.relations || []).map(rel => {
                          const j = mindMapEntries.findIndex(e => e.name === rel.name)
                          if (j <= i) return null
                          const p1 = memberPositions[entry.name]
                          const p2 = memberPositions[rel.name]
                          if (!p1 || !p2) return null
                          const sameGroup = (entry.group || t('context.noGroup')) === (mindMapEntries[j].group || t('context.noGroup'))
                          const isActive = state.mindMapConnectFrom === entry.name || state.mindMapConnectFrom === rel.name
                          const color = isActive ? 'var(--accent)' : relationColors[rel.type]
                          return <line key={`${i}-${j}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={color}
                            strokeWidth={isActive ? 2.5 : 2} opacity={isActive ? 1 : sameGroup ? 0.6 : 0.4}
                            strokeDasharray={rel.type === 'enemy' || rel.type === 'rival' ? '6 3' : '0'} />
                        })
                      )}
                    </svg>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                    {groups.map(g => {
                      const gp = groupPositions[g]
                      const members = mindMapEntries.filter(e => (e.group || t('context.noGroup')) === g)
                      return (
                        <div key={g}>
                          <div className="mindmap-group-label" style={{ position: 'absolute', left: gp.x - 40, top: gp.y - 50, minWidth: '80px', textAlign: 'center' }}>
                            {g}
                          </div>
                            {members.map((entry) => {
                            const mp = memberPositions[entry.name]
                            const isConnectFrom = state.mindMapConnectFrom === entry.name
                            const isConnectTarget = state.mindMapConnectFrom && state.mindMapConnectFrom !== '__start__' && state.mindMapConnectFrom !== entry.name
                            const isDragging = state.mindMapDrag === entry.name
                            return (
                              <div key={entry.name}
                                className={`mindmap-node ${isConnectFrom ? 'connecting' : isConnectTarget ? 'target' : ''} ${isDragging ? 'dragging' : ''}`}
                                style={{ left: mp.x - 60, top: mp.y - 20, cursor: state.mindMapDrag ? 'grabbing' : isDragging ? 'grabbing' : 'grab', zIndex: isDragging ? 100 : 2 }}
                                onMouseDown={(e) => { e.preventDefault(); handleMindMapMouseDown(e, entry.name) }}
                                onClick={() => {
                                  if (state.mindMapDrag) return
                                  if (state.mindMapConnectFrom === '__start__') {
                                    setState(s => ({ ...s, mindMapConnectFrom: entry.name }))
                                  } else if (state.mindMapConnectFrom && state.mindMapConnectFrom !== entry.name) {
                                    const fromName = state.mindMapConnectFrom
                                    const fromEntry = contextData.find(e => e.name === fromName)
                                    const toEntry = contextData.find(e => e.name === entry.name)
                                    if (fromEntry && toEntry && !fromEntry.relations?.find(r => r.name === entry.name)) {
                                      setPendingRelation({ from: fromName, to: entry.name })
                                      setRelationTypeSelect('neutral')
                                    }
                                    setState(s => ({ ...s, mindMapConnectFrom: null }))
                                  }
                                }}
                                onDoubleClick={() => {
                                  setState(s => ({ ...s, mindMapEditEntry: entry, showContextEditor: true, showMindMap: false }))
                                }}
                              >
                                <span className="mindmap-node-icon">👤</span>
                                <span className="mindmap-node-name">{entry.name}</span>
                                {(entry.relations?.length ?? 0) > 0 && (
                                  <span className="mindmap-node-relations">{entry.relations!.length}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                    <div className="mindmap-node center-node" style={{ left: cx - 60, top: cy - 20, cursor: 'default', zIndex: 2 }}>
                      <span>📖</span><span>{bookConfig?.title || 'Book'}</span>
                    </div>
                    </div>
                  </>
                )
              })()}
              </div>
              </div>
            </div>
            {mindMapEntries.length > 0 && (
                <div className="mindmap-relations-list" style={{ borderTop: '1px solid var(--border-gray)', padding: '8px 16px', maxHeight: '140px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('mindmap.connections')}</div>
                  {(() => {
                    const rels: { from: string; to: string; toName: string; fromGroup: string; toGroup: string; type: Relation['type'] }[] = []
                    mindMapEntries.forEach(e => {
                      ;(e.relations || []).forEach(r => {
                        const toEntry = mindMapEntries.find(me => me.name === r.name)
                        if (toEntry && mindMapEntries.findIndex(me => me.name === r.name) > mindMapEntries.findIndex(me => me.name === e.name)) {
                          rels.push({
                            from: e.name, to: r.name, toName: r.name,
                            fromGroup: e.group || t('context.noGroup'),
                            toGroup: toEntry.group || t('context.noGroup'),
                            type: r.type
                          })
                        }
                      })
                    })
                    return rels.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{t('mindmap.noConnections')}</div>
                    ) : rels.map((rel, i) => (
                      <div key={i} className="mindmap-relation-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '2px 0' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: relationColors[rel.type], flexShrink: 0 }} />
                        <span className="mindmap-rel-group">{rel.fromGroup}</span>
                        <span style={{ fontWeight: 600 }}>{rel.from}</span>
                        <span style={{ color: 'var(--accent)' }}>→</span>
                        <span style={{ fontWeight: 600 }}>{rel.to}</span>
                        <span className="mindmap-rel-group">{rel.toGroup}</span>
                        <span style={{ marginLeft: '4px', fontSize: '10px', color: relationColors[rel.type], fontWeight: 600 }}>{t('relations.' + rel.type)}</span>
                        <button className="btn-icon" style={{ fontSize: '11px', padding: '1px 5px', marginLeft: 'auto' }}
                          onClick={() => {
                            const d = [...contextData]
                            const from = d.find(e => e.name === rel.from)
                            if (from?.relations) from.relations = from.relations.filter((r: Relation) => r.name !== rel.to)
                            updateActiveBook({ contextData: d })
                          }}>🗑️</button>
                      </div>
                    ))
                  })()}
                </div>
            )}
          </div>
        </div>
      )}

      {state.showSearch && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showSearch: false }))}>
          <div className="search-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2>🔍 {t('search.title')}</h2><button className="btn-icon" onClick={() => setState(s => ({ ...s, showSearch: false }))}>×</button></div>
            <div className="search-input-wrapper">
              <input type="text" className="search-input" placeholder={t('search.placeholder')} value={state.searchQuery}
                onChange={e => setState(s => ({ ...s, searchQuery: e.target.value }))} autoFocus />
            </div>
            <div className="search-results">
              {state.searchQuery.length >= 2 && (
                <>
                  {searchEntries.length > 0 && (
                    <>
                      <div className="search-section-title">{t('search.context')}</div>
                      {searchEntries.map((e, i) => (
                        <div key={i} className="search-result-item" onClick={() => setState(s => ({ ...s, wikiSelected: e, showWiki: true, showSearch: false }))}>
                          <div className="search-result-entry">
                            <span className="search-result-entry-name">{e.name}</span>
                            <span className="search-result-type">{e.type === 'character' ? '👤' : e.type === 'place' ? '📍' : e.type === 'date' ? '📅' : '📦'} {e.type}</span>
                          </div>
                          {e.group && <div style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{t('wiki.group')}: {e.group}</div>}
                        </div>
                      ))}
                    </>
                  )}
                  {searchChapters.length > 0 && (
                    <>
                      <div className="search-section-title">{t('search.chapters')} ({searchChapters.reduce((a, c) => a + c.matches, 0)} {t('search.matches')})</div>
                      {searchChapters.map((c, i) => (
                        <div key={i} className="search-result-item" onClick={() => { updateActiveBook({ activeChapterId: c.chapter.id }); setState(s => ({ ...s, showSearch: false })) }}>
                          <div className="search-result-entry">
                            <span className="search-result-entry-name">{c.chapter.name}</span>
                            <span className="search-result-type">{c.matches} {t('search.occurrences')}</span>
                          </div>
                          <div className="search-result-chapters">
                            {(() => {
                              const q = state.searchQuery.toLowerCase()
                              const lines = c.chapter.code.split('\n')
                              const matches = lines.filter(l => l.toLowerCase().includes(q)).slice(0, 3)
                              return matches.map((line, li) => (
                                <div key={li} className="search-result-chapter" style={{ color: 'var(--cool-gray)' }}>
                                  ...{line.trim().substring(0, 80)}...
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {searchEntries.length === 0 && searchChapters.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>{t('search.noResults')}</div>
                  )}
                </>
              )}
              {state.searchQuery.length < 2 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>{t('search.minChars')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showVersions && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showVersions: false }))}>
          <div className="search-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2>⏱️ Version History</h2><button className="btn-icon" onClick={() => setState(s => ({ ...s, showVersions: false }))}>×</button></div>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-gray)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Snapshot label (optional)"
                value={snapshotLabel} onChange={e => setSnapshotLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSnapshot() }} />
              <button className="btn btn-primary btn-sm" onClick={createSnapshot}>💾 Snapshot</button>
            </div>
            <div className="search-results">
              {versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--cool-gray)', fontSize: '14px' }}>
                  No snapshots yet. Save a snapshot to create a restore point.
                </div>
              ) : versions.map((v, i) => (
                <div key={i} className="search-result-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="search-result-entry">
                      <span className="search-result-entry-name">{v.label}</span>
                      <span className="search-result-type">{v.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📝 {v.word_count.toLocaleString()} words</span>
                      <span>✂ {v.char_count.toLocaleString()} chars</span>
                      <span>📄 {v.chapter_count} chapters</span>
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => restoreSnapshot(v.id)}>↩ Restore</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="titlebar">
        <div className="titlebar-left"><div className="titlebar-logo">P</div></div>
        <div className="titlebar-center">{bookConfig && <span className="book-title">{bookConfig.title}</span>}</div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize}>─</button>
          <button className="titlebar-btn" onClick={handleMaximize}>{state.isMaximized ? '❐' : '□'}</button>
          <button className="titlebar-btn close" onClick={handleClose}>×</button>
        </div>
      </div>

      {state.showBookDialog && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showBookDialog: false }))}>
          <div className="book-dialog" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>{state.bookDialogMode === 'open' ? '📂 Open Book' : '💾 Save Book As'}</h2>
              <button className="btn-icon" onClick={() => setState(s => ({ ...s, showBookDialog: false }))}>×</button>
            </div>
            <div className="book-dialog-body">
              {state.bookDialogMode === 'open' ? (
                <>
                  <button className="book-dialog-option" onClick={() => { setState(s => ({ ...s, showBookDialog: false })); openBookFolder() }}>
                    <span className="book-dialog-icon">📁</span>
                    <span className="book-dialog-label">Open Folder</span>
                    <span className="book-dialog-desc">Open a book from a folder on your computer</span>
                  </button>
                  <button className="book-dialog-option" onClick={() => { setState(s => ({ ...s, showBookDialog: false })); openBearFile() }}>
                    <span className="book-dialog-icon">📦</span>
                    <span className="book-dialog-label">Open .bear File</span>
                    <span className="book-dialog-desc">Open a .bear archive file</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="book-dialog-option" onClick={() => { setState(s => ({ ...s, showBookDialog: false })); saveAsBear() }}>
                    <span className="book-dialog-icon">📦</span>
                    <span className="book-dialog-label">Save as .bear</span>
                    <span className="book-dialog-desc">Save the current book as a .bear archive file</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeBook === null ? (
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-logo">📖</div>
            <h1 className="welcome-title">{t('app.title')}</h1>
            <p className="welcome-subtitle">{t('app.subtitle')}</p>
            <div className="welcome-tabs">
              <button className="welcome-tab active" onClick={() => setState(s => ({ ...s, welcomeTab: 'create' }))}>
                📝 {t('app.welcome.newBook')}
              </button>
              <button className="welcome-tab" onClick={() => setState(s => ({ ...s, welcomeTab: 'open' }))}>
                📂 {t('app.welcome.openBook')}
              </button>
            </div>
            <div className="welcome-panel">
              {(!state.welcomeTab || state.welcomeTab === 'create') ? (
                <div className="welcome-section">
                  <button className="welcome-option" onClick={createNewBook}>
                    <span className="welcome-option-icon">📁</span>
                    <div>
                      <div className="welcome-option-title">New Book (Folder)</div>
                      <div className="welcome-option-desc">Create a new book in a folder on your computer</div>
                    </div>
                  </button>
                  <button className="welcome-option" onClick={() => { createNewBook(); }}>
                    <span className="welcome-option-icon">📦</span>
                    <div>
                      <div className="welcome-option-title">New Book (.bear)</div>
                      <div className="welcome-option-desc">Create and save as a .bear archive file</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="welcome-section">
                  <button className="welcome-option" onClick={openBookFolder}>
                    <span className="welcome-option-icon">📁</span>
                    <div>
                      <div className="welcome-option-title">Open Folder</div>
                      <div className="welcome-option-desc">Open an existing book from a folder</div>
                    </div>
                  </button>
                  <button className="welcome-option" onClick={openBearFile}>
                    <span className="welcome-option-icon">📦</span>
                    <div>
                      <div className="welcome-option-title">Open .bear File</div>
                      <div className="welcome-option-desc">Open a .bear archive file</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <div className="welcome-hint">
              <p>Ctrl+Shift+F — {t('commands.search').toLowerCase()}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="header">
            <div className="header-left">
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen }))}>☰</button>
              {bookConfig && (
                <div className="book-info-inline">
                  <input type="text" className="book-info-title" value={bookConfig.title}
                    onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, title: e.target.value } })}
                    onBlur={saveBookConfig} title={t('settings.bookTitle')} />
                  <span className="book-info-sep">by</span>
                  <input type="text" className="book-info-author" value={bookConfig.author}
                    onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, author: e.target.value } })}
                    onBlur={saveBookConfig} placeholder={t('settings.bookAuthor')} />
                  <span className="book-info-genre">{bookConfig.bookType || bookConfig.genre}</span>
                </div>
              )}
            </div>
            <div className="header-center">
              {state.openBooks.length > 0 && (
                <div className="book-tabs">
                  {state.openBooks.map(book => (
                    <div key={book.id} className={`book-tab ${book.id === state.activeBookId ? 'active' : ''}`}
                      onClick={() => setState(s => ({ ...s, activeBookId: book.id }))}>
                      <span className="tab-name">{book.title}</span>
                      {book.isModified && <span className="modified-dot">•</span>}
                      <button className="tab-close" onClick={(e) => {
                        e.stopPropagation();
                        setState(s => ({ ...s, openBooks: s.openBooks.filter(b => b.id !== book.id), activeBookId: s.activeBookId === book.id ? (s.openBooks.find(b => b.id !== book.id)?.id || null) : s.activeBookId }))
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="header-right">
              <button className="btn btn-secondary" onClick={saveChapter}>💾</button>
              <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showBookDialog: true, bookDialogMode: 'save' }))}>📦 .bear</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showNotes: !s.showNotes }))} title="Notes">📝</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showTimeline: !s.showTimeline }))} title="Timeline">📅</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showWorld: !s.showWorld }))} title="World">🌍</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showKanban: !s.showKanban }))} title="Kanban">📋</button>
              <button className="btn btn-icon" onClick={() => { loadVersions(); setState(s => ({ ...s, showVersions: true })) }}>⏱️</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showSearch: true }))}>🔍</button>
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, showSettings: true }))}>⚙</button>
            </div>
          </header>

          <div className="main">
            {state.sidebarOpen && (
              <aside className="sidebar">
                <div className="sidebar-header"><span className="sidebar-title">{t('sidebar.chapters')}</span></div>
                <div className="chapter-list">
                  {chapters.map((ch, i) => (
                    <div key={ch.id} className={`chapter-item ${ch.id === activeChapterId ? 'active' : ''}`}
                      onClick={() => updateActiveBook({ activeChapterId: ch.id })} onDoubleClick={() => startRenameChapter(ch.id)}>
                      <span className="chapter-number">{i + 1}</span>
                      {ch.renaming ? (
                        <input className="chapter-name-input" defaultValue={ch.name} autoFocus
                          onBlur={e => finishRenameChapter(ch.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') finishRenameChapter(ch.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') updateActiveBook({ chapters: chapters.map(c => c.id === ch.id ? { ...c, renaming: false } : c) }) }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="chapter-name">{ch.name}</span>
                      )}
                      {ch.isModified && !ch.renaming && <span className="modified-dot">•</span>}
                      <button className="chapter-delete" onClick={e => { e.stopPropagation(); confirmAction(t('chapter.deleteConfirm'), () => deleteChapter(ch.id)) }}>×</button>
                    </div>
                  ))}
                  <button className="btn btn-sm chapter-add" onClick={addChapter}>+</button>
                </div>
                {contextData.length > 0 && (
                  <div className="context-section">
                    <div className="context-header">
                      {t('sidebar.context')}
                      <div className="context-header-right">
                        <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showWiki: true }))}>📚</button>
                        <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showMindMap: true }))}>🕸️</button>
                      </div>
                    </div>
                    {contextGroups.map((g, gi) => {
                      const items = contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
                      return (
                        <div key={gi}>
                          <div className="context-group-label">{g.name}</div>
                          {items.map((ctx, i) => (
                            <div key={i} className="context-item" title={Object.entries(ctx.details).map(([k, v]) => `${k}: ${v}`).join('\n')}>
                              <span className="context-icon">{ctx.type === 'character' ? '👤' : ctx.type === 'place' ? '📍' : ctx.type === 'date' ? '📅' : '📦'}</span>
                              <span className="context-name">{ctx.name}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </aside>
            )}

            <div className="editor-container">
              {activeChapter ? (
                <>
                  <div className="format-toolbar">
                    <input ref={colorInputRef} type="color" style={{ display: 'none' }}
                      value={selectedColor}
                      onChange={e => { setSelectedColor(e.target.value); applyColor(e.target.value, false) }} />
                    <input ref={bgColorInputRef} type="color" style={{ display: 'none' }}
                      value={selectedBgColor}
                      onChange={e => { setSelectedBgColor(e.target.value); applyColor(e.target.value, true) }} />
                    {FORMAT_BUTTONS.map(btn => {
                      if (btn.type === 'sep') return <span key={btn.id} className="format-sep" />
                      const style: React.CSSProperties = {}
                      if (btn.id === 'bold') style.fontWeight = 700
                      else if (btn.id === 'italic') style.fontStyle = 'italic'
                      else if (btn.id === 'underline') style.textDecoration = 'underline'
                      else if (btn.id === 'strike') style.textDecoration = 'line-through'
                      if (btn.type === 'fontFamily') {
                        return (
                          <select key={btn.id} className="format-font-select" title={t(btn.titleKey) || ''}
                            value={settings.fontFamily}
                            onChange={e => updateSettings({ fontFamily: e.target.value })}>
                            {systemFonts.slice(0, 50).map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        )
                      }
                      if (btn.type === 'fontSize') {
                        return (
                          <div key={btn.id} className="format-font-size-wrap" title={t(btn.titleKey) || ''}>
                            <span className="format-font-size-label">T</span>
                            <input type="range" className="format-font-size" min="10" max="36" value={settings.fontSize}
                              onChange={e => updateSettings({ fontSize: parseInt(e.target.value) })} />
                          </div>
                        )
                      }
                      return (
                        <button key={btn.id} className={`format-btn ${btn.id === 'color' ? 'format-btn-color' : ''} ${btn.id === 'bgColor' ? 'format-btn-bgcolor' : ''}`}
                          title={t(btn.titleKey) || ''} onClick={() => applyFormat(btn)} style={style}>
                          {btn.icon}
                          {btn.id === 'color' && <span className="format-color-swatch" style={{ background: selectedColor }} />}
                          {btn.id === 'bgColor' && <span className="format-color-swatch" style={{ background: selectedBgColor }} />}
                        </button>
                      )
                    })}
                  </div>
                  <div className="editor">
                    <Editor
                      value={activeChapter.code}
                      height="100%"
                      onChange={handleEditorChange}
                      onCreateEditor={handleEditorCreate}
                      basicSetup={{ lineNumbers: false, highlightActiveLine: true, history: true, defaultKeymap: true, historyKeymap: true }}
                      extensions={[
                        ...(settings.showLineNumbers ? [lineNumbers()] : []),
                        ...editorExtensions,
                      ]}
                      style={{ fontSize: `${settings.fontSize}px`, fontFamily: fontCss }}
                    />
                  </div>
                </>
              ) : (
                <div className="empty-editor"><p>{t('chapter.selectOrCreate')}</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {state.showTimeline && activeBook && (
        <TimelinePanel
          timelineData={activeBook.timelineData}
          contextData={contextData}
          onUpdate={updateTimeline}
          onClose={() => setState(s => ({ ...s, showTimeline: false }))}
          t={t}
          confirmAction={confirmAction}
          onOpenWiki={(entry) => setState(s => ({ ...s, showTimeline: false, wikiSelected: entry, showWiki: true }))}
        />
      )}

      {state.showNotes && activeBook && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showNotes: false }))}>
          <div className="notes-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>📝 {t('notes.title')}</h2>
              <div className="panel-header-actions">
                <button className="btn btn-sm" onClick={() => {
                  setInputDialog({ title: t('notes.addNote'), label: t('notes.noteTitle') + ':', defaultValue: '', onSubmit: (title) => {
                    if (title) {
                      updateNotes([...activeBook.notes, { id: Date.now().toString(), title, content: '', createdAt: new Date().toISOString() }])
                    }
                  }})
                }}>➕ {t('notes.addNote')}</button>
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showNotes: false }))}>×</button>
              </div>
            </div>
            <div className="notes-body">
              {activeBook.notes.length === 0 ? (
                <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
                  {t('notes.noNotes')}
                </div>
              ) : (
                <div className="notes-grid">
                  {activeBook.notes.map(note => (
                    <div key={note.id} className="note-card">
                      <div className="note-card-header">
                        <span className="note-title">{note.title}</span>
                        <button className="btn-icon" style={{ fontSize: '12px', padding: '2px' }}
                          onClick={() => {
                            confirmAction(t('notes.deleteNote'), () => updateNotes(activeBook.notes.filter(n => n.id !== note.id)))
                          }}>×</button>
                      </div>
                      <textarea className="note-content" value={note.content}
                        placeholder={t('context.notesPlaceholder')}
                        onChange={e => updateNotes(activeBook.notes.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showWorld && activeBook && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showWorld: false }))}>
          <div className="world-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>🌍 {t('world.title')}</h2>
              <div className="panel-header-actions">
                <button className="btn btn-sm" onClick={() => {
                  setInputDialog({ title: t('world.addEntry'), label: t('world.entryTitle') + ':', defaultValue: '', onSubmit: (title) => {
                    if (title) {
                      setInputDialog({ title: t('world.category'), label: t('world.categoryHint') + ':', defaultValue: '', onSubmit: (category) => {
                        updateWorld([...activeBook.worldData, { id: Date.now().toString(), title, content: '', category, characterIds: [] }])
                      }})
                    }
                  }})
                }}>➕ {t('world.addEntry')}</button>
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showWorld: false }))}>×</button>
              </div>
            </div>
            <div className="world-body">
              {activeBook.worldData.length === 0 ? (
                <div style={{ color: 'var(--cool-gray)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
                  {t('world.noEntries')}
                </div>
              ) : (
                <div className="world-grid">
                  {activeBook.worldData.map(entry => (
                    <div key={entry.id} className="world-card">
                      <div className="world-card-header">
                        <span className="world-card-title">{entry.title}</span>
                        {entry.category && <span className="world-card-category">{entry.category}</span>}
                        {entry.date && <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '6px' }}>{entry.date}</span>}
                        <button className="btn-icon" style={{ fontSize: '12px', padding: '2px', marginLeft: 'auto' }}
                          onClick={() => {
                            confirmAction(t('world.deleteEntry'), () => updateWorld(activeBook.worldData.filter(e => e.id !== entry.id)))
                          }}>×</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input type="text" placeholder="Date (e.g., Year 100)"
                          value={entry.date || ''}
                          onChange={e => updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, date: e.target.value } : w))}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-gray)', background: 'var(--bg-secondary)', color: 'var(--text)', width: '100px' }}
                        />
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value && !entry.characterIds.includes(e.target.value)) {
                              updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, characterIds: [...w.characterIds, e.target.value] } : w))
                            }
                            e.target.value = ''
                          }}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-gray)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer' }}>
                          <option value="">+ Link character</option>
                          {contextData.filter(c => c.type === 'character' && !entry.characterIds.includes(c.name)).map(c => (
                            <option key={c.name} value={c.name}>👤 {c.name}</option>
                          ))}
                        </select>
                        {entry.characterIds.map(cid => {
                          const char = contextData.find(c => c.name === cid)
                          return char ? (
                            <span key={cid} style={{ fontSize: '10px', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setState(s => ({ ...s, wikiSelected: char, showWiki: true }))}>
                              👤 {char.name}
                              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: '2px', lineHeight: 1 }}
                                onClick={(e) => { e.stopPropagation(); updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, characterIds: w.characterIds.filter(id => id !== cid) } : w)) }}>×</button>
                            </span>
                          ) : null
                        })}
                      </div>
                      <textarea className="world-content" value={entry.content}
                        placeholder="Describe this aspect of your world..."
                        onChange={e => updateWorld(activeBook.worldData.map(w => w.id === entry.id ? { ...w, content: e.target.value } : w))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showKanban && activeBook && (
        <div className="modal-overlay" onClick={() => setState(s => ({ ...s, showKanban: false }))}>
          <div className="kanban-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>📋 {t('kanban.title')}</h2>
              <div className="panel-header-actions">
                <button className="btn btn-sm" onClick={() => {
                  setInputDialog({ title: t('kanban.addColumn'), label: t('kanban.columnName') + ':', defaultValue: '', onSubmit: (name) => {
                    if (name) {
                      const newCol = { id: Date.now().toString(), name, cards: [] }
                      updateKanban({ columns: [...activeBook.kanbanData.columns, newCol] })
                    }
                  }})
                }}>➕ {t('kanban.addColumn')}</button>
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showKanban: false }))}>×</button>
              </div>
            </div>
            <div className="kanban-body">
              <div className="kanban-columns">
                {activeBook.kanbanData.columns.map(col => (
                  <div key={col.id} className="kanban-column">
                    <div className="kanban-col-header">
                      <span>{col.name}</span>
                      <span className="kanban-count">{col.cards.length}</span>
                    </div>
                    <div className="kanban-cards">
                      {col.cards.map(card => (
                        <div key={card.id} className="kanban-card" style={{ borderLeft: `4px solid ${card.color || 'var(--accent)'}` }}>
                          <div className="kanban-card-title">{card.title}</div>
                          {card.content && <div className="kanban-card-content">{card.content}</div>}
                          <div className="kanban-card-actions">
                            <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => {
                                setInputDialog({ title: t('kanban.editCard'), label: t('kanban.cardTitle') + ':', defaultValue: card.title, onSubmit: (title) => {
                                  setInputDialog({ title: t('kanban.cardContent'), label: t('kanban.cardContent') + ':', defaultValue: card.content, multiline: true, onSubmit: (content) => {
                                    updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                                      ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, title, content } : k)
                                    } : c) })
                                  }})
                                }})
                              }}>✏️</button>
                            <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => {
                                confirmAction(t('kanban.deleteCard'), () => {
                                  updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                                    ...c, cards: c.cards.filter(k => k.id !== card.id)
                                  } : c) })
                                })
                              }}>🗑️</button>
                            <select className="kanban-move" style={{ fontSize: '11px', padding: '2px' }}
                              value="" onChange={e => {
                                if (e.target.value) {
                                  const cardData = col.cards.find(k => k.id === card.id)!
                                  updateKanban({
                                    columns: activeBook.kanbanData.columns.map(c => {
                                      if (c.id === col.id) return { ...c, cards: c.cards.filter(k => k.id !== card.id) }
                                      if (c.id === e.target.value) return { ...c, cards: [...c.cards, cardData] }
                                      return c
                                    })
                                  })
                                  e.target.value = ''
                                }
                              }}>
                              <option value="">Move to...</option>
                              {activeBook.kanbanData.columns.filter(c => c.id !== col.id).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-sm" style={{ width: '100%', marginTop: '8px' }}
                      onClick={() => {
                        setInputDialog({ title: t('kanban.addCard'), label: t('kanban.cardTitle') + ':', defaultValue: '', onSubmit: (title) => {
                          if (title) {
                            setInputDialog({ title: t('kanban.cardContent'), label: t('kanban.cardContent') + ':', defaultValue: '', multiline: true, onSubmit: (content) => {
                              const colors = ['var(--accent)', '#e53e3e', '#38a169', '#3182ce', '#805ad5', '#d69e2e']
                              const color = colors[Math.floor(Math.random() * colors.length)]
                              updateKanban({ columns: activeBook.kanbanData.columns.map(c => c.id === col.id ? {
                                ...c, cards: [...c.cards, { id: Date.now().toString(), title, content, color }]
                              } : c) })
                            }})
                          }
                        }})
                      }}>➕ {t('kanban.addCard')}</button>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-message">{confirmDialog.message}</div>
            <div className="confirm-actions">
              <button className="btn btn-sm" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {inputDialog && (
        <div className="modal-overlay" onClick={() => setInputDialog(null)}>
          <div className="input-dialog" onClick={e => e.stopPropagation()}>
            <div className="input-dialog-title">{inputDialog.title}</div>
            <div className="form-group">
              <label>{inputDialog.label}</label>
              {inputDialog.multiline ? (
                <textarea className="form-textarea" ref={inputDialogRef as unknown as React.RefObject<HTMLTextAreaElement>} defaultValue={inputDialog.defaultValue} autoFocus rows={4} />
              ) : (
                <input type="text" className="form-input" ref={inputDialogRef as React.RefObject<HTMLInputElement>} defaultValue={inputDialog.defaultValue} autoFocus onKeyDown={e => { if (e.key === 'Enter') { inputDialog.onSubmit((inputDialogRef.current as HTMLInputElement)?.value || ''); setInputDialog(null) } else if (e.key === 'Escape') setInputDialog(null) }} />
              )}
            </div>
            <div className="input-dialog-actions">
              <button className="btn btn-sm" onClick={() => setInputDialog(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { inputDialog.onSubmit((inputDialogRef.current as HTMLInputElement | HTMLTextAreaElement)?.value || ''); setInputDialog(null) }}>OK</button>
            </div>
          </div>
        </div>
      )}

      <footer className="status-bar">
        <span className="status-item">{THEME_ICONS[settings.theme]} {THEME_LABELS[settings.theme]}</span>
        {activeChapter && (
          <><span className="status-item">{activeChapter.name}</span>
          <span className="status-item" style={{ color: 'var(--cool-gray)', fontSize: '11px' }}>
            {activeChapter.code.split(/\s+/).filter(Boolean).length} words
          </span><span className="status-spacer"></span>
          {activeChapter.isModified && <span className="status-badge">{t('status.modified')}</span>}</>
        )}
        {bookConfig && <span className="status-item">{bookConfig.genre}</span>}
        <span className="status-item">{settings.fontSize}px</span>
        <span className="status-item">{settings.fontFamily}</span>
      </footer>
    </div>
  )
}

export default App
