import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import Editor from '@uiw/react-codemirror'
import { lineNumbers, EditorView, highlightActiveLine } from '@codemirror/view'
import { search } from '@codemirror/search'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { undo, redo } from '@codemirror/commands'
import { useTranslation } from './i18n'
import { Language, languages } from './i18n'

type ThemeName = 'galaxy' | 'aurora' | 'forest' | 'obsidian' | 'neon' | 'retro' | 'monochrome'



interface Chapter {
  id: string
  name: string
  path: string | null
  code: string
  isModified: boolean
  renaming?: boolean
}

interface ContextEntry {
  name: string
  type: 'character' | 'place' | 'date' | 'item'
  details: Record<string, string>
  group?: string
  relations?: string[]
  _x?: number
  _y?: number
}

interface ContextGroup {
  name: string
  type: 'character' | 'place' | 'date' | 'item'
}

interface BookConfig {
  title: string
  author: string
  genre: string
  bookType: string
  description: string
  createdAt: string
  chapters: { id: string; name: string; file: string }[]
}

interface AppSettings {
  theme: ThemeName
  fontSize: number
  fontFamily: string
  showLineNumbers: boolean
}

interface AppState {
  bookOpen: boolean
  sidebarOpen: boolean
  currentDir: string | null
  showSettings: boolean
  showContextEditor: boolean
  showBookEditor: boolean
  showAbout: boolean
  showWiki: boolean
  showMindMap: boolean
  showSearch: boolean
  showVersions: boolean
  contextData: ContextEntry[]
  contextGroups: ContextGroup[]
  bookConfig: BookConfig | null
  isMaximized: boolean
  tooltip: { name: string; type: string; details: Record<string, string>; x: number; y: number } | null
  settingsTab: number
  wikiSelected: ContextEntry | null
  searchQuery: string
  mindMapConnectFrom: string | null
  mindMapEditEntry: ContextEntry | null
  showLinkModal: boolean
  showColorPicker: boolean
  colorPickerType: 'color' | 'bgColor'
  mindMapConnectGroupFrom: string | null
  mindMapSelectedGroup: string | null
}

interface VersionSnapshot {
  id: string
  timestamp: string
  label: string
  files: string[]
  word_count: number
  char_count: number
  chapter_count: number
}

const themeLabels: Record<ThemeName, string> = {
  galaxy: 'Galaxy', aurora: 'Aurora', forest: 'Forest',
  obsidian: 'Obsidian', neon: 'Neon', retro: 'Retro', monochrome: 'Mono',
}

const themeIcons: Record<ThemeName, string> = {
  galaxy: '🌌', aurora: '🌿', forest: '🌲', obsidian: '◼️', neon: '💡', retro: '📺', monochrome: '◑',
}


interface FormatButton {
  id: string
  icon: string
  titleKey: string
  type?: 'wrap' | 'line' | 'block' | 'color' | 'bgColor' | 'align' | 'link' | 'codeblock' | 'sub' | 'sup' | 'sep'
  value?: string
}

type FormatType = 'wrap' | 'line' | 'block' | 'color' | 'bgColor' | 'align' | 'link' | 'codeblock' | 'sub' | 'sup' | 'sep' | 'fontFamily' | 'fontSize'

const bookTypes = ['Novel', 'Novella', 'Short Story', 'Flash Fiction', 'Poetry', 'Non-Fiction', 'Memoir', 'Biography', 'Essay', 'Script', 'Anthology', 'Other']

const formatButtons: FormatButton[] = [
  { id: 'sep0', icon: '', titleKey: '', type: 'sep' },
  { id: 'bold', icon: 'B', titleKey: 'format.bold', type: 'wrap', value: '**' },
  { id: 'italic', icon: 'I', titleKey: 'format.italic', type: 'wrap', value: '*' },
  { id: 'underline', icon: 'U', titleKey: 'format.underline', type: 'wrap', value: '<u>' },
  { id: 'strike', icon: 'S', titleKey: 'format.strikethrough', type: 'wrap', value: '~~' },
  { id: 'sub', icon: 'A₂', titleKey: 'format.subscript', type: 'wrap', value: '<sub>' },
  { id: 'sup', icon: 'A²', titleKey: 'format.superscript', type: 'wrap', value: '<sup>' },
  { id: 'sep1', icon: '', titleKey: '', type: 'sep' },
  { id: 'h1', icon: 'H1', titleKey: 'format.h1', type: 'line', value: '# ' },
  { id: 'h2', icon: 'H2', titleKey: 'format.h2', type: 'line', value: '## ' },
  { id: 'h3', icon: 'H3', titleKey: 'format.h3', type: 'line', value: '### ' },
  { id: 'sep2', icon: '', titleKey: '', type: 'sep' },
  { id: 'color', icon: '🎨', titleKey: 'format.textColor', type: 'color' },
  { id: 'bgColor', icon: '🖌', titleKey: 'format.highlight', type: 'bgColor' },
  { id: 'link', icon: '🔗', titleKey: 'format.link', type: 'link' },
  { id: 'sep3', icon: '', titleKey: '', type: 'sep' },
  { id: 'align-left', icon: '☰', titleKey: 'format.alignLeft', type: 'align', value: 'left' },
  { id: 'align-center', icon: '☱', titleKey: 'format.alignCenter', type: 'align', value: 'center' },
  { id: 'align-right', icon: '☲', titleKey: 'format.alignRight', type: 'align', value: 'right' },
  { id: 'align-justify', icon: '☳', titleKey: 'format.alignJustify', type: 'align', value: 'justify' },
  { id: 'sep4', icon: '', titleKey: '', type: 'sep' },
  { id: 'quote', icon: '"', titleKey: 'format.quote', type: 'line', value: '> ' },
  { id: 'code', icon: '<>', titleKey: 'format.code', type: 'wrap', value: '`' },
  { id: 'codeblock', icon: '⌨', titleKey: 'format.codeBlock', type: 'codeblock' },
  { id: 'sep5', icon: '', titleKey: '', type: 'sep' },
  { id: 'ul', icon: '•', titleKey: 'format.ul', type: 'line', value: '- ' },
  { id: 'ol', icon: '1.', titleKey: 'format.ol', type: 'line', value: '1. ' },
  { id: 'sep6', icon: '', titleKey: '', type: 'sep' },
  { id: 'hr', icon: '—', titleKey: 'format.hr', type: 'block', value: '\n---\n' },
  { id: 'sep7', icon: '', titleKey: '', type: 'sep' },
  { id: 'fontFamily', icon: 'Aa', titleKey: 'format.fontFamily', type: 'fontFamily' },
  { id: 'fontSize', icon: 'T', titleKey: 'format.fontSize', type: 'fontSize' },
]

let markdownHighlighter: any[] = []
try {
  if (tags && syntaxHighlighting && HighlightStyle) {
    const mdHighlight = syntaxHighlighting(HighlightStyle.define([
      { tag: tags.strong, fontWeight: '700' },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.strikethrough, textDecoration: 'line-through' },
      { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
      { tag: tags.url, color: 'var(--accent)' },
      { tag: tags.monospace, fontFamily: 'monospace', background: 'rgba(192,132,252,0.12)', borderRadius: '3px', padding: '0 3px' },
      { tag: tags.heading, fontWeight: '700', color: 'var(--accent)', fontSize: '1.2em' },
      { tag: tags.quote, fontStyle: 'italic', color: 'var(--cool-gray)' },
      { tag: tags.list, color: 'var(--cool-gray)' },
      { tag: tags.meta, color: 'var(--cool-gray)', fontSize: '0.85em' },
    ]))
    markdownHighlighter = [mdHighlight]
  }
} catch (e) {
  console.warn('Markdown highlighting unavailable:', e)
}

function loadSettings(): AppSettings {
  try {
    const s = localStorage.getItem('paddyngton-settings')
    if (s) return JSON.parse(s)
  } catch {}
  return { theme: 'galaxy', fontSize: 16, fontFamily: 'IBM Plex Sans', showLineNumbers: true }
}

function saveSettings(settings: AppSettings) {
  try { localStorage.setItem('paddyngton-settings', JSON.stringify(settings)) } catch {}
}

const defaultSettings = loadSettings()

function App() {
  const { t, language, setLanguage } = useTranslation()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [state, setState] = useState<AppState>({
    bookOpen: false, sidebarOpen: true, currentDir: null,
    showSettings: false, showContextEditor: false, showBookEditor: false,
    showAbout: false, showWiki: false, showMindMap: false, showSearch: false, showVersions: false,
    contextData: [], contextGroups: [], bookConfig: null, isMaximized: false, tooltip: null,
    settingsTab: 0, wikiSelected: null, searchQuery: '',
    mindMapConnectFrom: null, mindMapEditEntry: null,
    showLinkModal: false, showColorPicker: false, colorPickerType: 'color',
    mindMapConnectGroupFrom: null, mindMapSelectedGroup: null,
  })
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [selectedColor, setSelectedColor] = useState('#e53e3e')
  const [selectedBgColor, setSelectedBgColor] = useState('#faf089')
  const [linkUrl, setLinkUrl] = useState('')
  const colorInputRef = useRef<HTMLInputElement>(null)
  const bgColorInputRef = useRef<HTMLInputElement>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [commandQuery, setCommandQuery] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeChapter = chapters.find(c => c.id === activeChapterId)

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const commands = [
    { name: t('commands.newBook'), shortcut: 'Ctrl+N', action: () => createNewBook() },
    { name: t('commands.openBook'), shortcut: 'Ctrl+O', action: () => openBookFolder() },
    { name: t('commands.saveChapter'), shortcut: 'Ctrl+S', action: () => saveChapter() },
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

  const cycleTheme = () => {

  const getCloseMarker = (marker: string): string => {
    const closers: Record<string, string> = {
      '**': '**', '*': '*', '<u>': '</u>', '~~': '~~',
      '<sub>': '</sub>', '<sup>': '</sup>', '`': '`',
    }
    return closers[marker] || marker
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
    const order: ThemeName[] = ['galaxy', 'aurora', 'forest', 'obsidian', 'neon', 'retro', 'monochrome']
    const idx = order.indexOf(settings.theme)
    updateSettings({ theme: order[(idx + 1) % order.length] })
  }

  const applyFormat = useCallback((fmt: FormatButton) => {
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
        const url = window.prompt('Enter URL:', selected ? '' : 'https://')
        if (url) {
          const text = selected || 'link text'
          view.dispatch({
            changes: { from, to, insert: `[${text}](${url})` },
            selection: { anchor: from, head: from + text.length + url.length + 4 }
          })
        }
        break
      }
    }
    view.focus()
  }, [])

  const getWordAtPos = (doc: string, pos: number): string => {
    let start = pos, end = pos
    while (start > 0 && /[\w\u0400-\u04FF]/.test(doc[start - 1])) start--
    while (end < doc.length && /[\w\u0400-\u04FF]/.test(doc[end])) end++
    return doc.slice(start, end)
  }

  const findContextEntry = (word: string): ContextEntry | null => {
    const lower = word.toLowerCase()
    return state.contextData.find(c => c.name.toLowerCase() === lower) || null
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeChapter || state.contextData.length === 0 || !editorViewRef.current) return
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
  }, [activeChapter, state.contextData])

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeout.current) { clearTimeout(tooltipTimeout.current); tooltipTimeout.current = null }
    setState(s => ({ ...s, tooltip: null }))
  }, [])

  useEffect(() => {
    invoke('is_maximized').then((res: boolean) => setState(s => ({ ...s, isMaximized: res })))
  }, [])

  useEffect(() => {
    invoke<string[]>('get_system_fonts').then(fonts => {
      setSystemFonts(fonts.sort((a, b) => a.localeCompare(b)))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); setCommandQuery('') }
      else if (e.ctrlKey && e.key === 'o' && !e.shiftKey) { e.preventDefault(); openBookFolder() }
      else if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); createNewBook() }
      else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveChapter() }
      else if (e.ctrlKey && e.key === 'n') { e.preventDefault(); addChapter() }
      else if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen })) }
      else if (e.ctrlKey && e.key === 't') { e.preventDefault(); cycleTheme() }
      else if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setState(s => ({ ...s, showSearch: true, searchQuery: '' })) }
      else if (e.ctrlKey && e.key === ',') { e.preventDefault(); setState(s => ({ ...s, showSettings: true })) }
      else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (editorViewRef.current) undo(editorViewRef.current) }
      else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); if (editorViewRef.current) redo(editorViewRef.current) }
      else if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setState(s => ({ ...s, showSettings: false, showContextEditor: false, showBookEditor: false, showAbout: false, showWiki: false, showMindMap: false, showSearch: false, showVersions: false, mindMapConnectFrom: null }))
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

  const createNewBook = async () => {
    const selected = await open({ directory: true })
    if (!selected) return
    const bookDir = selected as string
    const contextPath = `${bookDir}/.context.json`
    const bookConfigPath = `${bookDir}/.book.json`
    const defaultContext: ContextEntry[] = [
      { name: 'Main Character', type: 'character', details: { age: '', profession: '', personality: '' } },
      { name: 'Setting', type: 'place', details: { description: '', atmosphere: '' } },
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

  const extractGroups = (data: ContextEntry[]): ContextGroup[] => {
    const seen = new Set<string>()
    const groups: ContextGroup[] = []
    for (const entry of data) {
      const g = entry.group || t('context.noGroup')
      if (!seen.has(g)) { seen.add(g); groups.push({ name: g, type: entry.type }) }
    }
    return groups
  }

  const loadBook = (dir: string, contextData: ContextEntry[], groups: ContextGroup[], bookConfig: BookConfig | null) => {
    setState(s => ({ ...s, currentDir: dir, bookOpen: true, contextData, contextGroups: groups, bookConfig, showWiki: false, wikiSelected: null }))
    loadChaptersFromDisk(dir, bookConfig)
  }

  const loadChaptersFromDisk = async (dir: string, bookConfig: BookConfig | null) => {
    if (!bookConfig || bookConfig.chapters.length === 0) {
      const id = Date.now().toString()
      setChapters([{ id, name: `${t('chapter.default')} 1`, path: null, code: `${t('chapter.default')} 1\n\n${t('editor.placeholder')}\n\n`, isModified: false }])
      setActiveChapterId(id)
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
    setChapters(loaded)
    setActiveChapterId(loaded[0]?.id || null)
  }

  const saveChapter = async () => {
    if (!activeChapter || !state.currentDir || !state.bookConfig) return
    let path = activeChapter.path
    if (!path) path = `${state.currentDir}/${activeChapter.name}.md`
    try {
      await writeTextFile(path, activeChapter.code)
      if (!activeChapter.path) {
        const nc = { id: activeChapter.id, name: activeChapter.name, file: `${activeChapter.name}.md` }
        const nc2 = { ...state.bookConfig, chapters: [...state.bookConfig.chapters, nc] }
        await writeTextFile(`${state.currentDir}/.book.json`, JSON.stringify(nc2, null, 2))
        setState(s => ({ ...s, bookConfig: nc2 }))
        setChapters(prev => prev.map(c => c.id === activeChapter.id ? { ...c, path } : c))
      } else {
        setChapters(prev => prev.map(c => c.id === activeChapter.id ? { ...c, isModified: false } : c))
      }
    } catch (err) { console.error('Error saving chapter:', err) }
  }

  const addChapter = () => {
    const num = chapters.length + 1
    const id = Date.now().toString()
    setChapters(prev => [...prev, { id, name: `${t('chapter.default')} ${num}`, path: null, code: `${t('chapter.default')} ${num}\n\n`, isModified: false }])
    setActiveChapterId(id)
  }

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) return
    const idx = chapters.findIndex(c => c.id === id)
    const next = chapters.filter(c => c.id !== id)
    setChapters(next)
    if (activeChapterId === id) setActiveChapterId(next[Math.min(idx, next.length - 1)]?.id || null)
  }

  const startRenameChapter = (id: string) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, renaming: true } : c))
  }

  const finishRenameChapter = (id: string, newName: string) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, name: newName || c.name, renaming: false, isModified: true } : c))
  }

  const handleEditorChange = useCallback((value: string) => {
    if (!activeChapterId) return
    setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, code: value, isModified: true } : c))
  }, [activeChapterId])

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
    return () => { editorViewRef.current = null }
  }, [])

  const saveContext = async () => {
    if (!state.currentDir) return
    try {
      await writeTextFile(`${state.currentDir}/.context.json`, JSON.stringify(state.contextData, null, 2))
      setState(s => ({ ...s, contextGroups: extractGroups(state.contextData) }))
    } catch (err) { console.error('Error saving context:', err) }
  }

  const saveBookConfig = async () => {
    if (!state.currentDir || !state.bookConfig) return
    try {
      await writeTextFile(`${state.currentDir}/.book.json`, JSON.stringify(state.bookConfig, null, 2))
    } catch (err) { console.error('Error saving book config:', err) }
  }

  const loadVersions = async () => {
    if (!state.currentDir) return
    try {
      const snaps = await invoke<VersionSnapshot[]>('list_version_snapshots', { bookDir: state.currentDir })
      setVersions(snaps)
    } catch (err) { console.error('Error loading versions:', err) }
  }

  const createSnapshot = async () => {
    if (!state.currentDir) return
    const label = snapshotLabel.trim() || new Date().toLocaleString()
    try {
      const snap = await invoke<VersionSnapshot>('save_version_snapshot', { bookDir: state.currentDir, label })
      setVersions(prev => [snap, ...prev])
      setSnapshotLabel('')
    } catch (err) { console.error('Error creating snapshot:', err) }
  }

  const restoreSnapshot = async (snapshotId: string) => {
    if (!state.currentDir) return
    if (!confirm('Restore this version? Current files will be overwritten.')) return
    try {
      await invoke('restore_version_snapshot', { bookDir: state.currentDir, snapshotId })
      const contextPath = `${state.currentDir}/.context.json`
      const bookConfigPath = `${state.currentDir}/.book.json`
      let contextData: ContextEntry[] = []
      let bookConfig: BookConfig | null = null
      if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
      if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
      const groups = extractGroups(contextData)
      setState(s => ({ ...s, contextData, contextGroups: groups, bookConfig }))
      loadChaptersFromDisk(state.currentDir, bookConfig)
    } catch (err) { console.error('Error restoring snapshot:', err) }
  }

  const handleMinimize = () => invoke('minimize_window')
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
    const entries = state.contextData.filter(e => e.name.toLowerCase().includes(q))
    const chaptersWith: { chapter: Chapter; matches: number }[] = chapters.map(ch => ({
      chapter: ch,
      matches: (ch.code.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    })).filter(c => c.matches > 0)
    return { entries, chapters: chaptersWith }
  }, [state.searchQuery, state.contextData, chapters])

  const { entries: searchEntries, chapters: searchChapters } = searchResults()
  const mindMapEntries = state.contextData.filter(e => e.type === 'character')

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
                      {(Object.keys(themeLabels) as ThemeName[]).map(th => (
                        <button key={th} className={`theme-option ${settings.theme === th ? 'active' : ''}`} onClick={() => updateSettings({ theme: th })}>
                          {themeIcons[th]} {themeLabels[th]}
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
                    <h3>{t('settings.editor')}</h3>
                    <div className="setting-row">
                      <label>{t('settings.lineNumbers')}</label>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={settings.showLineNumbers} onChange={e => updateSettings({ showLineNumbers: e.target.checked })} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="setting-row">
                      <label>{t('settings.fontSize')}<br /><span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--cool-gray)' }}>{settings.fontSize}px</span></label>
                      <input type="range" min="10" max="36" value={settings.fontSize}
                        onChange={e => updateSettings({ fontSize: parseInt(e.target.value) })}
                        style={{ width: '120px', accentColor: 'var(--accent)' }} />
                    </div>
                    <div className="setting-row">
                      <label>{t('settings.fontFamily')}</label>
                      <select className="font-select" value={settings.fontFamily} onChange={e => updateSettings({ fontFamily: e.target.value })} style={{ width: '200px' }}>
                        {systemFonts.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              {state.settingsTab === 1 && state.bookConfig && (
                <div className="setting-section">
                  <h3>{t('settings.bookInfo')}</h3>
                  <div className="form-group"><label>{t('settings.bookTitle')}</label>
                    <input type="text" className="form-input" value={state.bookConfig.title}
                      onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, title: e.target.value } : null }))} />
                  </div>
                  <div className="form-group"><label>{t('settings.bookAuthor')}</label>
                    <input type="text" className="form-input" value={state.bookConfig.author}
                      onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, author: e.target.value } : null }))} />
                  </div>
                  <div className="form-group"><label>{t('settings.bookType')}</label>
                    <select className="form-input" value={state.bookConfig.bookType || 'Novel'}
                      onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, bookType: e.target.value } : null }))}>
                      {bookTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>{t('settings.bookGenre')}</label>
                    <input type="text" className="form-input" value={state.bookConfig.genre}
                      onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, genre: e.target.value } : null }))} />
                  </div>
                  <div className="form-group"><label>{t('settings.bookDescription')}</label>
                    <textarea className="form-textarea" value={state.bookConfig.description}
                      onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, description: e.target.value } : null }))} />
                  </div>
                  <button className="btn btn-primary" onClick={async () => { await saveBookConfig() }}>💾 {t('settings.bookSave')}</button>
                </div>
              )}
              {state.settingsTab === 1 && !state.bookConfig && (
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
                    <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>Relations: {state.mindMapEditEntry.relations.join(', ')}</div>
                  )}
                </div>
              )}
              <div className="context-list">
                {(state.mindMapEditEntry ? [state.contextData.find(e => e.name === state.mindMapEditEntry!.name) || state.contextData[0]] : state.contextData).filter(Boolean).map((ctx, i) => (
                  <div key={i} className="context-card">
                    <div className="context-card-header">
                      <input type="text" className="context-name-input" value={ctx!.name}
                        onChange={e => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].name = e.target.value; setState(s => ({ ...s, contextData: d })) }} />
                      <select className="context-type-select" value={ctx!.type}
                        onChange={e => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].type = e.target.value as ContextEntry['type']; setState(s => ({ ...s, contextData: d })) }}>
                        <option value="character">👤 {t('context.types.character')}</option>
                        <option value="place">📍 {t('context.types.place')}</option>
                        <option value="date">📅 {t('context.types.date')}</option>
                        <option value="item">📦 {t('context.types.item')}</option>
                      </select>
                      <input type="text" placeholder={t('context.group')} style={{ padding: '4px 8px', background: 'var(--white)', border: '1px solid var(--border-gray)', borderRadius: '6px', fontSize: '12px', width: '100px', color: 'var(--near-black)', fontFamily: 'inherit' }}
                        value={ctx!.group || ''} onChange={e => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].group = e.target.value; setState(s => ({ ...s, contextData: d })) }} />
                      {!state.mindMapEditEntry && (
                        <button className="btn-icon" onClick={() => { const d = state.contextData.filter((_, idx) => idx !== i); setState(s => ({ ...s, contextData: d })) }}>🗑️</button>
                      )}
                    </div>
                    {ctx!.type === 'character' && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginBottom: '4px', fontWeight: 600 }}>RELATIONS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {(ctx!.relations || []).map((rel, ri) => (
                            <span key={ri} className="relation-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--accent)', color: 'white', borderRadius: '12px', fontSize: '11px' }}>
                              👤 {rel}
                              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0', fontSize: '12px', lineHeight: 1 }} onClick={() => {
                                const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                                if (idx >= 0) d[idx].relations = (d[idx].relations || []).filter(r => r !== rel)
                                setState(s => ({ ...s, contextData: d }))
                              }}>×</button>
                            </span>
                          ))}
                          <button className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => {
                            const name = window.prompt('Add relation (character name):', '')
                            if (name && name.trim()) {
                              const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name)
                              if (idx >= 0) {
                                if (!d[idx].relations) d[idx].relations = []
                                if (!d[idx].relations!.includes(name.trim())) d[idx].relations = [...d[idx].relations!, name.trim()]
                              }
                              setState(s => ({ ...s, contextData: d }))
                            }
                          }}>+ Rel</button>
                        </div>
                      </div>
                    )}
                    <div className="context-details">
                      {Object.entries(ctx!.details).map(([key, value], j) => (
                        <div key={j} className="detail-row">
                          <input type="text" className="detail-key-input" value={key} placeholder={t('context.property')}
                            onChange={e => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) { const nd: Record<string, string> = {}; Object.entries(d[idx].details).forEach(([k, v], idx2) => { nd[idx2 === j ? e.target.value : k] = v }); d[idx].details = nd }; setState(s => ({ ...s, contextData: d })) }} />
                          <input type="text" className="detail-value-input" value={value} placeholder="Value"
                            onChange={e => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[key] = e.target.value; setState(s => ({ ...s, contextData: d })) }} />
                          <button className="btn-icon" onClick={() => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) delete d[idx].details[key]; setState(s => ({ ...s, contextData: d })) }}>×</button>
                        </div>
                      ))}
                      <button className="btn btn-sm" onClick={() => { const d = [...state.contextData]; const idx = d.findIndex(x => x.name === ctx!.name); if (idx >= 0) d[idx].details[`prop${Object.keys(ctx!.details).length + 1}`] = ''; setState(s => ({ ...s, contextData: d })) }}>+ {t('context.addProperty')}</button>
                    </div>
                  </div>
                ))}
              </div>
              {!state.mindMapEditEntry && (
                <button className="btn btn-primary" onClick={() => setState(s => ({ ...s, contextData: [...s.contextData, { name: 'New', type: 'character', details: {}, group: '', relations: [] }] }))}>+ {t('context.add')}</button>
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
                {state.contextGroups.map((g, gi) => {
                  const items = state.contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
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
                    </div>
                    {state.wikiSelected.group && (
                      <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '12px' }}>{t('wiki.group')}: {state.wikiSelected.group}</div>
                    )}
                    <div className="wiki-detail-grid">
                      {Object.entries(state.wikiSelected.details).filter(([, v]) => v).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <div className="wiki-detail-key">{k}</div>
                          <div className="wiki-detail-value">{v}</div>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="wiki-cross-refs">
                      <h4>{t('wiki.related')}</h4>
                      {state.contextData.filter(e => e.type === 'character' && e.name !== state.wikiSelected!.name).map((e, i) => (
                        <button key={i} className="wiki-ref-item"
                          onClick={() => setState(s => ({ ...s, wikiSelected: e }))}>
                          👤 {e.name}
                        </button>
                      ))}
                    </div>
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
                  const name = window.prompt(t('mindmap.enterName'), '')
                  if (name && name.trim()) {
                    setState(s => ({ ...s, contextData: [...s.contextData, { name: name.trim(), type: 'character', details: {}, relations: [], group: '' }] }))
                  }
                }}>➕ {t('mindmap.addCharacter')}</button>
                {state.mindMapConnectFrom ? (
                  <button className="btn btn-sm btn-warning" onClick={() => setState(s => ({ ...s, mindMapConnectFrom: null }))}>✕ {t('mindmap.disconnectMode')}</button>
                ) : (
                  <button className="btn btn-sm btn-secondary" onClick={() => setState(s => ({ ...s, mindMapConnectFrom: '__start__' }))}>🔗 {t('mindmap.connectMode')}</button>
                )}
                <button className="btn-icon" onClick={() => setState(s => ({ ...s, showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null }))}>×</button>
              </div>
            </div>
            <div className="mindmap-toolbar">
              <span style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{mindMapEntries.length} {t('mindmap.characters')}</span>
              {(() => {
                const groups = [...new Set(mindMapEntries.map(e => e.group || t('context.noGroup')))]
                return groups.length > 1 ? <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{groups.length} groups</span> : null
              })()}
              {state.mindMapConnectFrom && state.mindMapConnectFrom !== '__start__' && (
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{t('mindmap.connectionFrom')}</span>
              )}
            </div>
            <div className="mindmap-canvas" style={{ position: 'relative', minHeight: '450px' }}>
              {mindMapEntries.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cool-gray)', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
                  {t('mindmap.noCharacters')}
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    const name = window.prompt(t('mindmap.enterName'), '')
                    if (name && name.trim()) {
                      setState(s => ({ ...s, contextData: [...s.contextData, { name: name.trim(), type: 'character', details: {}, relations: [], group: '' }] }))
                    }
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
                    const ma = members.length > 1 ? (mi / members.length) * Math.PI * 2 : 0
                    const mr = members.length > 1 ? 70 : 0
                    memberPositions[e.name] = {
                      x: gp.x + mr * Math.cos(ma - Math.PI / 2),
                      y: gp.y + mr * Math.sin(ma - Math.PI / 2)
                    }
                  })
                })
                return (
                  <>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      {groups.map((g, gi) => {
                        const gp = groupPositions[g]
                        return groups.slice(gi + 1).map((g2, gi2) => {
                          const gp2 = groupPositions[g2]
                          const rels = mindMapEntries.filter(e => (e.group || t('context.noGroup')) === g)
                            .flatMap(e => (e.relations || []).map(r => ({ from: e.name, to: r })))
                            .filter(r => mindMapEntries.find(e => e.name === r.to && (e.group || t('context.noGroup')) === g2))
                          if (rels.length === 0) return null
                          return <line key={`${gi}-${gi2}`} x1={gp.x} y1={gp.y} x2={gp2.x} y2={gp2.y}
                            stroke="var(--accent)" strokeWidth="3" opacity="0.5" strokeDasharray="6 3" />
                        })
                      })}
                      {mindMapEntries.flatMap((entry, i) =>
                        (entry.relations || []).map(rel => {
                          const j = mindMapEntries.findIndex(e => e.name === rel)
                          if (j <= i) return null
                          const p1 = memberPositions[entry.name]
                          const p2 = memberPositions[rel]
                          if (!p1 || !p2) return null
                          const sameGroup = (entry.group || t('context.noGroup')) === (mindMapEntries[j].group || t('context.noGroup'))
                          const isActive = state.mindMapConnectFrom === entry.name || state.mindMapConnectFrom === rel
                          return <line key={`${i}-${j}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={isActive ? 'var(--accent)' : sameGroup ? 'var(--border-gray)' : 'var(--cool-gray)'}
                            strokeWidth={isActive ? 2.5 : 1.5} opacity={isActive ? 1 : sameGroup ? 0.5 : 0.3}
                            strokeDasharray={sameGroup ? '0' : '0'} />
                        })
                      )}
                    </svg>
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
                            return (
                              <div key={entry.name}
                                className={`mindmap-node ${isConnectFrom ? 'connecting' : isConnectTarget ? 'target' : ''}`}
                                style={{ left: mp.x - 60, top: mp.y - 20 }}
                                onClick={() => {
                                  if (state.mindMapConnectFrom === '__start__') {
                                    setState(s => ({ ...s, mindMapConnectFrom: entry.name }))
                                  } else if (state.mindMapConnectFrom && state.mindMapConnectFrom !== entry.name) {
                                    const fromName = state.mindMapConnectFrom
                                    setState(s => {
                                      const d = [...s.contextData]
                                      const fromEntry = d.find(e => e.name === fromName)
                                      const toEntry = d.find(e => e.name === entry.name)
                                      if (fromEntry && toEntry) {
                                        if (!fromEntry.relations) fromEntry.relations = []
                                        if (!fromEntry.relations.includes(entry.name)) {
                                          fromEntry.relations = [...fromEntry.relations, entry.name]
                                        }
                                      }
                                      return { ...s, contextData: d, mindMapConnectFrom: null }
                                    })
                                  } else {
                                    setState(s => ({ ...s, mindMapEditEntry: entry, showContextEditor: true, showMindMap: false }))
                                  }
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
                    <div className="mindmap-node center-node" style={{ left: cx - 60, top: cy - 20, cursor: 'default' }}>
                      <span>📖</span><span>{state.bookConfig?.title || 'Book'}</span>
                    </div>
                  </>
                )
              })()}
            </div>
            {mindMapEntries.length > 0 && (
              <div className="mindmap-relations-list" style={{ borderTop: '1px solid var(--border-gray)', padding: '8px 16px', maxHeight: '140px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--cool-gray)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connections</div>
                {(() => {
                  const rels: { from: string; to: string; fromGroup: string; toGroup: string }[] = []
                  mindMapEntries.forEach(e => {
                    ;(e.relations || []).forEach(r => {
                      const toEntry = mindMapEntries.find(me => me.name === r)
                      if (toEntry && mindMapEntries.findIndex(me => me.name === r) > mindMapEntries.findIndex(me => me.name === e.name)) {
                        rels.push({
                          from: e.name, to: r,
                          fromGroup: e.group || t('context.noGroup'),
                          toGroup: toEntry.group || t('context.noGroup')
                        })
                      }
                    })
                  })
                  return rels.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>No connections yet. Click "Connect" then select two characters.</div>
                  ) : rels.map((rel, i) => (
                    <div key={i} className="mindmap-relation-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '2px 0' }}>
                      <span className="mindmap-rel-group">{rel.fromGroup}</span>
                      <span style={{ fontWeight: 600 }}>{rel.from}</span>
                      <span style={{ color: 'var(--accent)' }}>→</span>
                      <span style={{ fontWeight: 600 }}>{rel.to}</span>
                      <span className="mindmap-rel-group">{rel.toGroup}</span>
                      <button className="btn-icon" style={{ fontSize: '11px', padding: '1px 5px', marginLeft: 'auto' }}
                        onClick={() => setState(s => {
                          const d = [...s.contextData]
                          const from = d.find(e => e.name === rel.from)
                          if (from?.relations) from.relations = from.relations.filter(r => r !== rel.to)
                          return { ...s, contextData: d }
                        })}>🗑️</button>
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
                        <div key={i} className="search-result-item" onClick={() => { setActiveChapterId(c.chapter.id); setState(s => ({ ...s, showSearch: false })) }}>
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
        <div className="titlebar-center">{state.bookConfig && <span className="book-title">{state.bookConfig.title}</span>}</div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize}>─</button>
          <button className="titlebar-btn" onClick={handleMaximize}>{state.isMaximized ? '❐' : '□'}</button>
          <button className="titlebar-btn close" onClick={handleClose}>×</button>
        </div>
      </div>

      {!state.bookOpen ? (
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-logo">📖</div>
            <h1 className="welcome-title">{t('app.title')}</h1>
            <p className="welcome-subtitle">{t('app.subtitle')}</p>
            <div className="welcome-actions">
              <button className="btn btn-primary btn-lg" onClick={createNewBook}>📝 {t('app.welcome.newBook')}</button>
              <button className="btn btn-secondary btn-lg" onClick={openBookFolder}>📂 {t('app.welcome.openBook')}</button>
            </div>
            <div className="welcome-hint">
              <p>{t('app.welcome.hintNew')}</p><p>{t('app.welcome.hintOpen')}</p><p>{t('app.welcome.hintCommands')}</p><p>Ctrl+Shift+F — {t('commands.search').toLowerCase()}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="header">
            <div className="header-left">
              <button className="btn btn-icon" onClick={() => setState(s => ({ ...s, sidebarOpen: !s.sidebarOpen }))}>☰</button>
              {state.bookConfig && (
                <div className="book-info-inline">
                  <input type="text" className="book-info-title" value={state.bookConfig.title}
                    onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, title: e.target.value } : null }))}
                    onBlur={saveBookConfig} title={t('settings.bookTitle')} />
                  <span className="book-info-sep">by</span>
                  <input type="text" className="book-info-author" value={state.bookConfig.author}
                    onChange={e => setState(s => ({ ...s, bookConfig: s.bookConfig ? { ...s.bookConfig, author: e.target.value } : null }))}
                    onBlur={saveBookConfig} placeholder={t('settings.bookAuthor')} />
                  <span className="book-info-genre">{state.bookConfig.bookType || state.bookConfig.genre}</span>
                </div>
              )}
            </div>
            <div className="header-center">
              <div className="chapter-tabs">
                {chapters.map(ch => (
                  <div key={ch.id} className={`chapter-tab ${ch.id === activeChapterId ? 'active' : ''}`} onClick={() => setActiveChapterId(ch.id)} onDoubleClick={() => startRenameChapter(ch.id)}>
                    {ch.renaming ? (
                      <input className="chapter-rename-input" defaultValue={ch.name} autoFocus
                        onBlur={e => finishRenameChapter(ch.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') finishRenameChapter(ch.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, renaming: false } : c)) }}
                        onClick={e => e.stopPropagation()} />
                    ) : (
                      <span className="tab-name">{ch.name}</span>
                    )}
                    {ch.isModified && !ch.renaming && <span className="modified-dot">•</span>}
                    {chapters.length > 1 && !ch.renaming && (
                      <button className="tab-close" onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id) }}>×</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-sm chapter-add" onClick={addChapter}>+</button>
              </div>
            </div>
            <div className="header-right">
              <button className="btn btn-secondary" onClick={saveChapter}>💾</button>
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
                      onClick={() => setActiveChapterId(ch.id)} onDoubleClick={() => startRenameChapter(ch.id)}>
                      <span className="chapter-number">{i + 1}</span>
                      {ch.renaming ? (
                        <input className="chapter-name-input" defaultValue={ch.name} autoFocus
                          onBlur={e => finishRenameChapter(ch.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') finishRenameChapter(ch.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, renaming: false } : c)) }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="chapter-name">{ch.name}</span>
                      )}
                      {ch.isModified && !ch.renaming && <span className="modified-dot">•</span>}
                    </div>
                  ))}
                </div>
                {state.contextData.length > 0 && (
                  <div className="context-section">
                    <div className="context-header">
                      {t('sidebar.context')}
                      <div className="context-header-right">
                        <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showWiki: true }))}>📚</button>
                        <button className="btn btn-sm" onClick={() => setState(s => ({ ...s, showMindMap: true }))}>🕸️</button>
                      </div>
                    </div>
                    {state.contextGroups.map((g, gi) => {
                      const items = state.contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
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
                    {formatButtons.map(btn => {
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
                      basicSetup={false}
                      extensions={[
                        ...(settings.showLineNumbers ? [lineNumbers()] : []),
                        highlightActiveLine(),
                        search({ top: false }),
                        ...markdownHighlighter,
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

      <footer className="status-bar">
        <span className="status-item">{themeIcons[settings.theme]} {themeLabels[settings.theme]}</span>
        {activeChapter && (
          <><span className="status-item">{activeChapter.name}</span>
          <span className="status-item" style={{ color: 'var(--cool-gray)', fontSize: '11px' }}>
            {activeChapter.code.split(/\s+/).filter(Boolean).length} words
          </span><span className="status-spacer"></span>
          {activeChapter.isModified && <span className="status-badge">{t('status.modified')}</span>}</>
        )}
        {state.bookConfig && <span className="status-item">{state.bookConfig.genre}</span>}
        <span className="status-item">{settings.fontSize}px</span>
        <span className="status-item">{settings.fontFamily}</span>
      </footer>
    </div>
  )
}

export default App
