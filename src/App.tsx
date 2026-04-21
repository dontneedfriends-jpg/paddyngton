import React, { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import Editor from '@uiw/react-codemirror'
import { lineNumbers, EditorView, highlightActiveLine } from '@codemirror/view'

import { markdown } from '@codemirror/lang-markdown'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Code, Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Type, Paintbrush, Highlighter,
  Subscript, Superscript,
  Menu, Save, Package, StickyNote, CalendarDays, Globe, LayoutGrid,
  Clock, Search, Settings, BookOpen, User, MapPin, Box, Pencil,
  Eye, GitGraph, Heart, Shield, Swords, Skull, Users, FolderOpen,
  FileText, Scissors, RotateCcw, Check, X, Info, RefreshCw,
  Maximize2, Square, BookMarked, ChevronLeft,
} from 'lucide-react'
import { useTranslation } from './i18n'
import { Language } from './i18n'
import { Toast, ConfirmDialog, InputDialog } from './components/dialogs'
import { TimelinePanel, SearchPanel, NotesPanel, WorldPanel, KanbanPanel, SettingsPanel, ContextEditor } from './components/panels'
import { FORMAT_BUTTONS } from './constants'
import { renderMarkdown } from './lib/markdownRender'
import { extractGroups, findContextEntry, getWordAtPos } from './lib/contextHelpers'
import { useUIStore } from './store/useUIStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useBookStore } from './store/useBookStore'
import { useWindowControls } from './hooks/useWindowControls'
import { useBookManager } from './hooks/useBookManager'
import { useAutoSave } from './hooks/useAutoSave'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMindMap } from './hooks/useMindMap'
import { useEditor } from './hooks/useEditor'
import {
  type ThemeName,
  type Chapter,
  type ContextEntry,
  type Relation,
  type RelationType,
  type ContextGroup,
  type BookConfig,
  type BookInstance,
  type WorldEntry,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanCard,
  type TimelineEntry,
  type Note,
  type VersionSnapshot,
  type FormatButton,
  RELATION_COLORS,
  THEME_LABELS,
  THEME_ICONS,
  THEME_ORDER,
  BOOK_TYPES,
  CONTEXT_TEMPLATES,
  TEMPLATE_NAMES,
} from './types'

export const relationColors = RELATION_COLORS

const formatIconComponents: Record<string, React.FC<{ size?: number }>> = {
  'align-left': AlignLeft,
  'align-center': AlignCenter,
  'align-right': AlignRight,
  'align-justify': AlignJustify,
  'link': Link,
  'codeblock': Code,
  'bold': Bold,
  'italic': Italic,
  'underline': Underline,
  'strike': Strikethrough,
  'h1': Heading1,
  'h2': Heading2,
  'h3': Heading3,
  'ul': List,
  'ol': ListOrdered,
  'quote': Quote,
  'hr': Minus,
  'fontFamily': Type,
  'fontSize': Type,
  'color': Paintbrush,
  'bgColor': Highlighter,
  'sub': Subscript,
  'sup': Superscript,
}

function parseVersion(v: string): number[] {
  return v.split('.').map(n => parseInt(n, 10) || 0)
}

function isNewerVersion(remote: string, local: string): boolean {
  const r = parseVersion(remote)
  const l = parseVersion(local)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] || 0
    const lv = l[i] || 0
    if (rv > lv) return true
    if (rv < lv) return false
  }
  return false
}

function App() {
  const { t, language, setLanguage } = useTranslation()
  const settings = useSettingsStore(s => s.settings)
  const updateSettings = useSettingsStore(s => s.updateSettings)
  const cycleTheme = useSettingsStore(s => s.cycleTheme)
  const ui = useUIStore()
  const setUI = useUIStore(s => s.set)
  const showToast = useUIStore(s => s.showToast)
  const confirmAction = useUIStore(s => s.confirmAction)
  const openBooks = useBookStore(s => s.openBooks)
  const activeBookId = useBookStore(s => s.activeBookId)
  const updateActiveBookStore = useBookStore(s => s.updateActiveBook)
  const updateChapterStore = useBookStore(s => s.updateChapter)
  const addBookStore = useBookStore(s => s.addBook)
  const setActiveBookId = useBookStore(s => s.setActiveBookId)
  const { handleMinimize, handleMaximize, handleClose } = useWindowControls()
  const bookManager = useBookManager(t)
  useAutoSave()
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const inputDialogRef = useRef<HTMLInputElement | null>(null)
  const editor = useEditor()
  const [pendingRelation, setPendingRelation] = useState<{ from: string; to: string } | null>(null)
  const [relationTypeSelect, setRelationTypeSelect] = useState<RelationType>('neutral')

  const activeBook = openBooks.find(b => b.id === activeBookId) || null
  const chapters = activeBook?.chapters || []
  const activeChapterId = activeBook?.activeChapterId || null
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null
  const contextData = activeBook?.contextData || []
  const contextGroups = activeBook?.contextGroups || []
  const bookConfig = activeBook?.bookConfig || null

  const updateActiveBook = useCallback((patch: Partial<BookInstance>) => {
    updateActiveBookStore(patch)
  }, [updateActiveBookStore])

  const updateChapter = useCallback((chapterId: string, patch: Partial<Chapter>) => {
    updateChapterStore(chapterId, patch)
  }, [updateChapterStore])

  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const { inputRef } = useKeyboardShortcuts({
    createNewBook: bookManager.createNewBook,
    saveChapter: bookManager.saveChapter,
    addChapter: bookManager.addChapter,
    editorViewRef: editor.editorViewRef,
  })
  const {
    mindMapCanvasRef,
    handleMindMapMouseDown,
    handleMindMapCanvasMouseDown,
    handleMindMapMouseMove,
    handleMindMapMouseUp,
    handleMindMapMouseLeave,
    handleMindMapWheel,
  } = useMindMap()
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commands = [
    { name: t('commands.newBook'), shortcut: 'Ctrl+N', action: () => bookManager.createNewBook() },
    { name: t('commands.openBook'), shortcut: 'Ctrl+O', action: () => setUI({ showBookDialog: true, bookDialogMode: 'open' }) },
    { name: t('commands.saveChapter'), shortcut: 'Ctrl+S', action: () => bookManager.saveChapter() },
    { name: 'Save Book As...', shortcut: '', action: () => setUI({ showBookDialog: true, bookDialogMode: 'save' }) },
    { name: t('commands.newChapter'), shortcut: 'Ctrl+Shift+N', action: () => bookManager.addChapter() },
    { name: t('commands.toggleSidebar'), shortcut: 'Ctrl+B', action: () => setUI({ sidebarOpen: !ui.sidebarOpen }) },
    { name: t('commands.toggleTheme'), shortcut: 'Ctrl+T', action: () => cycleTheme() },
    { name: t('commands.editBookInfo'), shortcut: '', action: () => { setUI({ showSettings: true, settingsTab: 1 }) } },
    { name: t('commands.editContext'), shortcut: '', action: () => setUI({ showContextEditor: true }) },
    { name: t('commands.wiki'), shortcut: '', action: () => setUI({ showWiki: true }) },
    { name: t('commands.mindMap'), shortcut: '', action: () => setUI({ showMindMap: true }) },
    { name: t('commands.search'), shortcut: 'Ctrl+Shift+F', action: () => setUI({ showSearch: true, searchQuery: '' }) },
    { name: 'Version History', shortcut: '', action: () => { loadVersions(); setUI({ showVersions: true }) } },
    { name: t('commands.settings'), shortcut: 'Ctrl+,', action: () => setUI({ showSettings: true }) },
  ]

  const filteredCommands = commands.filter(cmd => cmd.name.toLowerCase().includes(ui.commandQuery.toLowerCase()))

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeChapter || contextData.length === 0 || !editor.editorViewRef.current) return
    if (tooltipTimeout.current) { clearTimeout(tooltipTimeout.current); tooltipTimeout.current = null }
    tooltipTimeout.current = setTimeout(() => {
      const view = editor.editorViewRef.current
      if (!view) return
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
      if (pos == null) return
      const doc = view.state.doc.toString()
      const word = getWordAtPos(doc, pos)
      if (word.length > 2) {
        const entry = findContextEntry(word, contextData)
        if (entry) { setUI({ tooltip: { ...entry, x: e.clientX, y: e.clientY } }); return }
      }
      setUI({ tooltip: null })
    }, 800)
  }, [activeChapter, contextData])

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeout.current) { clearTimeout(tooltipTimeout.current); tooltipTimeout.current = null }
    setUI({ tooltip: null })
  }, [])

  useEffect(() => {
    invoke<boolean>('is_maximized').then((res) => setUI({ isMaximized: res }))
  }, [])

  useEffect(() => {
    if (window.__TAURI_INTERNALS__?.testMode) {
      const initTestBook = async () => {
        try {
          const testDir = await invoke<string>('create_test_book')
          const contextPath = `${testDir}/.context.json`
          const bookConfigPath = `${testDir}/.book.json`
          const contextData: ContextEntry[] = JSON.parse(await readTextFile(contextPath))
          const bookConfig: BookConfig | null = JSON.parse(await readTextFile(bookConfigPath))
          const groups = extractGroupsFn(contextData)
          bookManager.loadBook(testDir, contextData, groups, bookConfig)
        } catch {}
      }
      initTestBook()
    }
  }, [])

  useEffect(() => {
    invoke<string[]>('get_system_fonts').then(fonts => {
      setSystemFonts(fonts.sort((a, b) => a.localeCompare(b)))
    }).catch(() => {})

    const checkForUpdates = async () => {
      // First get local version, then check against remote
      let localVersion = '0.0.0'
      try {
        localVersion = await invoke<string>('get_version')
        setUI({ currentVersion: localVersion })
        console.log('[Updater] Local version:', localVersion)
      } catch (err) {
        console.error('[Updater] Failed to get local version:', err)
        setUI({ currentVersion: localVersion })
      }

      await new Promise(r => setTimeout(r, 1500))

      try {
        setUI({ updateLoading: true })
        console.log('[Updater] Fetching latest.json...')
        // Fetch from GitHub Release asset (not raw.githubusercontent.com)
        const resp = await fetch('https://github.com/dontneedfriends-jpg/paddyngton/releases/latest/download/latest.json', {
          headers: { 'Accept': 'application/json' }
        })
        console.log('[Updater] Fetch response status:', resp.status, resp.ok)
        if (resp.ok) {
          const data = await resp.json()
          console.log('[Updater] Remote data:', data)
          const remoteVersion = data.version as string
          console.log('[Updater] Comparing remote', remoteVersion, 'vs local', localVersion)
          if (isNewerVersion(remoteVersion, localVersion)) {
            console.log('[Updater] Update available:', remoteVersion)
            setUI({ updateAvailable: remoteVersion, updateLoading: false })
          } else {
            console.log('[Updater] No update needed')
            setUI({ updateAvailable: null, updateLoading: false })
          }
        } else {
          console.error('[Updater] Fetch failed with status:', resp.status)
          setUI({ updateAvailable: null, updateLoading: false })
        }
      } catch (err) {
        console.error('[Updater] Fetch error:', err)
        setUI({ updateAvailable: null, updateLoading: false })
      }
    }
    checkForUpdates()
  }, [])



  useEffect(() => {
    return () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current) }
  }, [])

  useEffect(() => {
    if (ui.inputDialog || ui.confirmDialog) {
      invoke('set_always_on_top', { value: true }).catch(() => {})
    }
    return () => {
      invoke('set_always_on_top', { value: false }).catch(() => {})
    }
  }, [ui.inputDialog, ui.confirmDialog])



  const extractGroupsFn = (data: ContextEntry[]): ContextGroup[] => {
    return extractGroups(data, t('context.noGroup'))
  }

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
      await bookManager.saveAllBookData()
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
        useBookStore.setState({ openBooks: openBooks.filter(b => b.id !== activeBook.id), activeBookId: activeBookId === activeBook.id ? null : activeBookId })
        let contextData: ContextEntry[] = []
        let bookConfig: BookConfig | null = null
        const contextPath = `${bookDir}/.context.json`
        const bookConfigPath = `${bookDir}/.book.json`
        if (await exists(contextPath)) contextData = JSON.parse(await readTextFile(contextPath))
        if (await exists(bookConfigPath)) bookConfig = JSON.parse(await readTextFile(bookConfigPath))
        const groups = extractGroupsFn(contextData)
        bookManager.loadBook(bookDir, contextData, groups, bookConfig)
        showToast('Version restored', 'success')
      } catch (err) { console.error('Error restoring snapshot:', err); showToast('Failed to restore version', 'error') }
    })
  }

  const fontCss = settings.fontFamily ? `'${settings.fontFamily}', sans-serif` : "'IBM Plex Sans', sans-serif"

  function getNodeEdgePoint(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) return from
    const angle = Math.atan2(dy, dx)
    const hw = 60
    const hh = 20
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const tx = Math.abs(hw / (Math.abs(cos) < 0.001 ? 0.001 : cos))
    const ty = Math.abs(hh / (Math.abs(sin) < 0.001 ? 0.001 : sin))
    const t = Math.min(tx, ty)
    return { x: from.x + cos * t, y: from.y + sin * t }
  }

  const mindMapEntries = contextData.filter(e => e.type === 'character')

  return (
    <div className={`app ${settings.theme}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {ui.tooltip && (
        <div className="context-tooltip" style={{ left: ui.tooltip.x + 14, top: ui.tooltip.y + 14 }}>
          <div className="context-tooltip-name">{ui.tooltip.name}</div>
          <div className="context-tooltip-type">
            {ui.tooltip.type === 'character' ? '[C] ' + t('context.types.character') :
             ui.tooltip.type === 'place' ? '[P] ' + t('context.types.place') :
             ui.tooltip.type === 'date' ? '[D] ' + t('context.types.date') : '[I] ' + t('context.types.item')}
          </div>
          <div className="context-tooltip-details">
            {Object.entries(ui.tooltip.details).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="context-tooltip-detail"><strong>{k}:</strong> {v}</div>
            ))}
          </div>
        </div>
      )}

      {ui.showCommandPalette && (
        <div className="modal-overlay" onClick={() => setUI({ showCommandPalette: false })}>
          <div className="command-palette" onClick={e => e.stopPropagation()}>
            <div className="command-input-wrapper">
              <input ref={inputRef} type="text" className="command-input" placeholder={t('commands.title') + '...'} value={ui.commandQuery} onChange={e => setUI({ commandQuery: e.target.value })} />
            </div>
            <div className="command-list">
              {filteredCommands.map((cmd, i) => (
                <div key={i} className="command-item" onClick={() => { cmd.action(); setUI({ showCommandPalette: false }) }}>
                  <div className="command-icon">{cmd.name[0]}</div>
                  <span>{cmd.name}</span>
                  {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SettingsPanel />

      <ContextEditor />

      {ui.showWiki && (
        <div className="modal-overlay" onClick={() => setUI({ showWiki: false })}>
          <div className="wiki-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2><BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('wiki.title')}</h2><button className="btn-icon" onClick={() => setUI({ showWiki: false })}>×</button></div>
            <div className="wiki-body">
              <div className="wiki-sidebar">
                {contextGroups.map((g, gi) => {
                  const items = contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
                  return (
                    <div key={gi} className="wiki-sidebar-section">
                      <div className="wiki-sidebar-title">{g.name}</div>
                      {items.map((item, i) => (
                        <div key={i} className={`wiki-sidebar-item ${ui.wikiSelected?.name === item.name ? 'active' : ''}`}
                          onClick={() => setUI({ wikiSelected: item })}>
                          <span>{item.type === 'character' ? '[C]' : item.type === 'place' ? '[P]' : item.type === 'date' ? '[D]' : '[I]'}</span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div className="wiki-content">
                {ui.wikiSelected ? (
                  <>
                    <div className="wiki-entry-header">
                      <span className="wiki-entry-icon">
                        {ui.wikiSelected.type === 'character' ? <User size={18} /> : ui.wikiSelected.type === 'place' ? <MapPin size={18} /> : ui.wikiSelected.type === 'date' ? <CalendarDays size={18} /> : <Box size={18} />}
                      </span>
                      <span className="wiki-entry-name">{ui.wikiSelected.name}</span>
                      <span className="wiki-entry-type">
                        {ui.wikiSelected.type === 'character' ? t('context.types.character') :
                         ui.wikiSelected.type === 'place' ? t('context.types.place') :
                         ui.wikiSelected.type === 'date' ? t('context.types.date') : t('context.types.item')}
                      </span>
                      <button className="btn btn-sm" style={{ marginLeft: 'auto' }}
                        onClick={() => setUI({ wikiEditMode: !ui.wikiEditMode })}>
                        {ui.wikiEditMode ? <><Eye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('context.view')}</> : <><Pencil size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('context.edit')}</>}
                      </button>
                    </div>
                    {ui.wikiSelected.group && (
                      <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '12px' }}>{t('wiki.group')}: {ui.wikiSelected.group}</div>
                    )}
                    {ui.wikiEditMode ? (
                      <div className="wiki-edit-form">
                        <div className="form-group"><label>{t('context.name')}</label>
                          <input type="text" className="form-input" value={ui.wikiSelected.name}
                            onChange={e => {
                              const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, name: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setUI({ wikiSelected: { ...ui.wikiSelected!, name: e.target.value } })
                            }} />
                        </div>
                        <div className="form-group"><label>{t('context.group')}</label>
                          <input type="text" className="form-input" value={ui.wikiSelected.group || ''}
                            onChange={e => {
                              const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, group: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setUI({ wikiSelected: { ...ui.wikiSelected!, group: e.target.value } })
                            }} />
                        </div>
                        <div className="form-group"><label>{t('context.notes') || 'Notes'}</label>
                          <textarea className="form-textarea" rows={4} value={ui.wikiSelected.notes || ''}
                            placeholder={t('context.notesPlaceholder') || 'Personal notes, ideas, drafts...'}
                            onChange={e => {
                              const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, notes: e.target.value } : c)
                              updateActiveBook({ contextData: d })
                              setUI({ wikiSelected: { ...ui.wikiSelected!, notes: e.target.value } })
                            }} />
                        </div>
                        <div className="form-group"><label>Properties</label>
                          {Object.entries(ui.wikiSelected.details).map(([k, v], i) => (
                            <div key={i} className="detail-row">
                              <input type="text" className="detail-key-input" value={k}
                                onChange={e => {
                                  const nd: Record<string, string> = {}
                                  Object.entries(ui.wikiSelected!.details).forEach(([kk, vv], idx) => { nd[idx === i ? e.target.value : kk] = vv })
                                  const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                                  updateActiveBook({ contextData: d })
                                  setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                                }} />
                              <input type="text" className="detail-value-input" value={v}
                                onChange={e => {
                                  const nd = { ...ui.wikiSelected!.details, [k]: e.target.value }
                                  const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                                  updateActiveBook({ contextData: d })
                                  setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                                }} />
                              <button className="btn-icon" onClick={() => {
                                const nd: Record<string, string> = {}
                                Object.entries(ui.wikiSelected!.details).forEach(([kk, vv], idx) => { if (idx !== i) nd[kk] = vv })
                                const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                                updateActiveBook({ contextData: d })
                                setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                              }}>×</button>
                            </div>
                          ))}
                          <button className="btn btn-sm" onClick={() => {
                            const key = `prop${Object.keys(ui.wikiSelected!.details).length + 1}`
                            const nd = { ...ui.wikiSelected!.details, [key]: '' }
                            const d = contextData.map(c => c.name === ui.wikiSelected!.name ? { ...c, details: nd } : c)
                            updateActiveBook({ contextData: d })
                            setUI({ wikiSelected: { ...ui.wikiSelected!, details: nd } })
                          }}>+ Add property</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button className="btn btn-primary" onClick={async () => { await bookManager.saveContext(); setUI({ wikiEditMode: false }) }}>
                            [Save] {t('context.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="wiki-detail-grid">
                          {Object.entries(ui.wikiSelected.details).filter(([, v]) => v).map(([k, v]) => (
                            <React.Fragment key={k}>
                              <div className="wiki-detail-key">{k}</div>
                              <div className="wiki-detail-value">{v}</div>
                            </React.Fragment>
                          ))}
                        </div>
                        {ui.wikiSelected.notes && (
                          <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>NOTES</h4>
                            <div style={{ fontSize: '13px', color: 'var(--text)', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap' }}>{ui.wikiSelected.notes}</div>
                          </div>
                        )}
                        {ui.wikiSelected.type === 'character' && (
                          <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>{t('wiki.relationships')}</h4>
                            {ui.wikiSelected.relations && ui.wikiSelected.relations.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {ui.wikiSelected.relations.map((rel, i) => {
                                  const relEntry = contextData.find(c => c.name === rel.name)
                                  return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 12px', borderLeft: `4px solid ${relationColors[rel.type]}` }}>
                                      <span style={{ fontSize: '12px' }}>{relEntry?.type === 'character' ? '[C]' : relEntry?.type === 'place' ? '[P]' : '[I]'}</span>
                                      <span style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}
                                        onClick={() => relEntry && setUI({ wikiSelected: relEntry })}>
                                        {rel.name}
                                      </span>
                                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: relationColors[rel.type] + '30', color: relationColors[rel.type], fontWeight: 600 }}>
                                        {t('relations.' + rel.type)}
                                      </span>
                                      <select
                                        value={rel.type}
                                        onChange={e => {
                                          const newType = e.target.value as Relation['type']
                                          const newD = contextData.map(c => c.name === ui.wikiSelected!.name
                                            ? { ...c, relations: c.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) }
                                            : c)
                                          updateActiveBook({ contextData: newD })
                                          setUI({ wikiSelected: { ...ui.wikiSelected!, relations: ui.wikiSelected!.relations?.map(r => r.name === rel.name ? { ...r, type: newType } : r) } })
                                        }}
                                        style={{ marginLeft: 'auto', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-gray)', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                                        <option value="ally">[Ally] {t('relations.friendly')}</option>
                                        <option value="family">[Family] {t('relations.family')}</option>
                                        <option value="romantic">[Love] {t('relations.romantic')}</option>
                                        <option value="neutral">[Neutral] {t('relations.neutral')}</option>
                                        <option value="rival">[Rival] {t('relations.rival')}</option>
                                        <option value="enemy">[Enemy] {t('relations.hostile')}</option>
                                      </select>
                                      <button className="btn-icon" style={{ fontSize: '11px', padding: '2px 6px' }}
                                        onClick={() => {
                                          const newD = contextData.map(c => c.name === ui.wikiSelected!.name
                                            ? { ...c, relations: c.relations?.filter(r => r.name !== rel.name) }
                                            : c)
                                          updateActiveBook({ contextData: newD })
                                          setUI({ wikiSelected: { ...ui.wikiSelected!, relations: ui.wikiSelected!.relations?.filter(r => r.name !== rel.name) } })
                                        }}>[D]</button>
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
                               <button className="btn btn-sm" onClick={() => setUI({ showMindMap: true })}>
                                 <GitGraph size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('wiki.openMindMap')}
                               </button>
                            </div>
                          </div>
                        )}
                        {ui.wikiSelected && activeBook && (() => {
                          const charName = ui.wikiSelected.name
                          const relatedEvents: { type: 'timeline' | 'world'; title: string; date?: string; content: string }[] = []
                          activeBook.timelineData.forEach(t => {
                            if (t.characterIds.includes(charName)) {
                              relatedEvents.push({ type: 'timeline', title: t.label, date: t.date, content: t.content })
                            }
                          })
                          activeBook.worldData.forEach(w => {
                            if (w.characterIds?.includes(charName)) {
                              relatedEvents.push({ type: 'world', title: w.title, date: w.date, content: w.content })
                            }
                          })
                          if (relatedEvents.length > 0) {
                            return (
                              <div style={{ marginTop: '16px' }}>
                                <h4 style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: '8px' }}>EVENTS & CONNECTIONS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {relatedEvents.map((ev, i) => (
                                    <div key={i} style={{ background: 'var(--surface)', borderRadius: '8px', padding: '10px 12px', borderLeft: `4px solid ${ev.type === 'timeline' ? 'var(--danger)' : 'var(--success)'}` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{ev.type === 'timeline' ? '[D]' : '[W]'}</span>
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
                          {contextData.filter(e => e.type === 'character' && e.name !== ui.wikiSelected!.name).map((e, i) => (
                            <button key={i} className="wiki-ref-item"
                              onClick={() => setUI({ wikiSelected: e })}>
                              [C] {e.name}
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

      {ui.showMindMap && (
        <div className="modal-overlay" onClick={() => setUI({ showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null })}>
          <div className="mindmap-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="panel-header">
              <h2>[Map] {t('mindmap.title')}</h2>
              <div className="panel-header-actions">
                <button className="btn btn-sm" onClick={() => {
                  setUI({ inputDialog: { title: t('mindmap.addCharacter'), label: t('mindmap.enterName'), defaultValue: '', onSubmit: (name) => {
                    if (name && name.trim()) {
                      const details: Record<string, string> = {}
                      Object.keys(CONTEXT_TEMPLATES.character).forEach(k => { details[k] = '' })
                      updateActiveBook({ contextData: [...contextData, { name: name.trim(), type: 'character', details, relations: [], group: '', notes: '' }] })
                    }
                  }} })
                }}>[+] {t('mindmap.addCharacter')}</button>
                {ui.mindMapConnectFrom ? (
                  <button className="btn btn-sm btn-warning" onClick={() => setUI({ mindMapConnectFrom: null })}><X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('mindmap.disconnectMode')}</button>
                ) : (
                  <button className="btn btn-sm btn-secondary" onClick={() => setUI({ mindMapConnectFrom: '__start__' })}><Link size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('mindmap.connectMode')}</button>
                )}
                <button className="btn-icon" onClick={() => setUI({ showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null })}>×</button>
              </div>
            </div>
            {pendingRelation && (
              <div style={{ padding: '12px 16px', background: 'var(--accent)', color: 'var(--near-white)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {pendingRelation.from} → {pendingRelation.to}
                </span>
                <select
                  value={relationTypeSelect}
                  onChange={e => setRelationTypeSelect(e.target.value as typeof relationTypeSelect)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="ally" style={{ color: 'var(--success)' }}>[Ally] {t('relations.friendly')}</option>
                  <option value="family" style={{ color: 'var(--accent)' }}>[Family] {t('relations.family')}</option>
                  <option value="romantic" style={{ color: 'var(--purple)' }}>[Love] {t('relations.romantic')}</option>
                  <option value="neutral" style={{ color: 'var(--cool-gray)' }}>[Neutral] {t('relations.neutral')}</option>
                  <option value="rival" style={{ color: 'var(--purple)' }}>[Rival] {t('relations.rival')}</option>
                  <option value="enemy" style={{ color: 'var(--danger)' }}>[Enemy] {t('relations.hostile')}</option>
                </select>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--near-white)', border: 'none' }} onClick={() => {
                  const newD = contextData.map(e => e.name === pendingRelation.from && !e.relations?.find(r => r.name === pendingRelation.to)
                    ? { ...e, relations: [...(e.relations || []), { name: pendingRelation.to, type: relationTypeSelect }] } : e)
                  updateActiveBook({ contextData: newD })
                  setPendingRelation(null)
                }}>Add Connection</button>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--near-white)', border: 'none' }} onClick={() => setPendingRelation(null)}>Cancel</button>
              </div>
            )}
            <div className="mindmap-toolbar">
              <span style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{mindMapEntries.length} {t('mindmap.characters')}</span>
              {(() => {
                const groups = [...new Set(mindMapEntries.map(e => e.group || t('context.noGroup')))]
                return groups.length > 1 ? <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{groups.length} groups</span> : null
              })()}
              {ui.mindMapConnectFrom && ui.mindMapConnectFrom !== '__start__' && (
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{t('mindmap.connectionFrom')}</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setUI({ mindMapZoom: Math.max(0.3, ui.mindMapZoom - 0.1) })}>−</button>
                <span style={{ fontSize: '11px', color: 'var(--cool-gray)', minWidth: '36px', textAlign: 'center' }}>{Math.round(ui.mindMapZoom * 100)}%</span>
                <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setUI({ mindMapZoom: Math.min(2.5, ui.mindMapZoom + 0.1) })}>+</button>
              </div>
            </div>
            <div className="mindmap-canvas" ref={mindMapCanvasRef}
              style={{ position: 'relative', minHeight: '450px', overflow: 'hidden', cursor: ui.mindMapDrag ? 'grabbing' : 'default' }}
              onMouseMove={handleMindMapMouseMove} onMouseLeave={handleMindMapMouseUp}
              onMouseDown={handleMindMapCanvasMouseDown} onMouseUp={handleMindMapMouseUp} onWheel={handleMindMapWheel}>
              <div className="mindmap-canvas-inner"
                style={{ transform: `translate(${ui.mindMapPanX}px, ${ui.mindMapPanY}px) scale(${ui.mindMapZoom})`, transformOrigin: 'center', transition: ui.mindMapDrag ? 'none' : 'transform 0.15s ease', position: 'absolute', left: '50%', top: '50%', marginLeft: '-420px', marginTop: '-230px' }}>
              <div style={{ width: '840px', height: '460px', position: 'relative' }}>
              {mindMapEntries.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cool-gray)', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
                  {t('mindmap.noCharacters')}
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setUI({ inputDialog: { title: t('mindmap.addCharacter'), label: t('mindmap.enterName'), defaultValue: '', onSubmit: (name) => {
                      if (name && name.trim()) {
                        const details: Record<string, string> = {}
                        Object.keys(CONTEXT_TEMPLATES.character).forEach(k => { details[k] = '' })
                        updateActiveBook({ contextData: [...contextData, { name: name.trim(), type: 'character', details, relations: [], group: '', notes: '' }] })
                      }
                    }} })
                  }}>[+] {t('mindmap.addCharacter')}</button>
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
                const groupBounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }> = {}
                groups.forEach(g => {
                  const members = mindMapEntries.filter(e => (e.group || t('context.noGroup')) === g)
                  if (members.length === 0) return
                  // Nodes are rendered at left = mp.x - 60, top = mp.y - 20
                  // with min-width: 120, max-width: 200, ~40px tall
                  const nodeLefts = members.map(e => (memberPositions[e.name]?.x ?? 0) - 60)
                  const nodeTops = members.map(e => (memberPositions[e.name]?.y ?? 0) - 20)
                  const nodeRights = members.map(e => (memberPositions[e.name]?.x ?? 0) + 100) // safe for ~160px nodes
                  const nodeBottoms = members.map(e => (memberPositions[e.name]?.y ?? 0) + 35)
                  const minX = Math.min(...nodeLefts)
                  const maxX = Math.max(...nodeRights)
                  const minY = Math.min(...nodeTops)
                  const maxY = Math.max(...nodeBottoms)
                  const margin = 18
                  groupBounds[g] = {
                    minX: minX - margin,
                    maxX: maxX + margin,
                    minY: minY - margin - 26, // extra top space for group label
                    maxY: maxY + margin,
                    width: Math.max((maxX + margin) - (minX - margin), 160),
                    height: Math.max((maxY + margin) - (minY - margin - 26), 90),
                  }
                })
                return (
                  <>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                      {mindMapEntries.flatMap((entry, i) =>
                        (entry.relations || []).map(rel => {
                          const j = mindMapEntries.findIndex(e => e.name === rel.name)
                          if (j <= i) return null
                          const p1 = memberPositions[entry.name]
                          const p2 = memberPositions[rel.name]
                          if (!p1 || !p2) return null
                          const sameGroup = (entry.group || t('context.noGroup')) === (mindMapEntries[j].group || t('context.noGroup'))
                          const isActive = ui.mindMapConnectFrom === entry.name || ui.mindMapConnectFrom === rel.name
                          const color = isActive ? 'var(--accent)' : relationColors[rel.type]
                          const e1 = getNodeEdgePoint(p1, p2)
                          const e2 = getNodeEdgePoint(p2, p1)
                          return <line key={`${i}-${j}`} x1={e1.x} y1={e1.y} x2={e2.x} y2={e2.y}
                            stroke={color}
                            strokeWidth={isActive ? 2.5 : 2} opacity={isActive ? 1 : sameGroup ? 0.6 : 0.4}
                            strokeDasharray={rel.type === 'enemy' || rel.type === 'rival' ? '6 3' : '0'} />
                        })
                      )}
                    </svg>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                    {/* Group backgrounds & labels */}
                    {groups.map(g => {
                      const b = groupBounds[g]
                      if (!b) return null
                      return (
                        <div key={`bg-${g}`}>
                          <div style={{
                            position: 'absolute',
                            left: b.minX,
                            top: b.minY,
                            width: b.width,
                            height: b.height,
                            background: 'var(--accent)',
                            opacity: 0.08,
                            borderRadius: '16px',
                            border: '2px dashed var(--accent)',
                            zIndex: 0,
                          }} />
                          <div className="mindmap-group-label" style={{ position: 'absolute', left: b.minX + 10, top: b.minY + 6, zIndex: 1 }}>
                            {g}
                          </div>
                        </div>
                      )
                    })}
                    {groups.map(g => {
                      const members = mindMapEntries.filter(e => (e.group || t('context.noGroup')) === g)
                      return (
                        <div key={g}>
                            {members.map((entry) => {
                            const mp = memberPositions[entry.name]
                            const isConnectFrom = ui.mindMapConnectFrom === entry.name
                            const isConnectTarget = ui.mindMapConnectFrom && ui.mindMapConnectFrom !== '__start__' && ui.mindMapConnectFrom !== entry.name
                            const isDragging = ui.mindMapDrag === entry.name
                            return (
                              <div key={entry.name}
                                className={`mindmap-node ${isConnectFrom ? 'connecting' : isConnectTarget ? 'target' : ''} ${isDragging ? 'dragging' : ''}`}
                                style={{ left: mp.x - 60, top: mp.y - 20, cursor: ui.mindMapDrag ? 'grabbing' : isDragging ? 'grabbing' : 'grab', zIndex: isDragging ? 100 : 2 }}
                                onMouseDown={(e) => { e.preventDefault(); handleMindMapMouseDown(e, entry.name) }}
                                onClick={() => {
                                  if (ui.mindMapDrag) return
                                  if (ui.mindMapConnectFrom === '__start__') {
                                    setUI({ mindMapConnectFrom: entry.name })
                                  } else if (ui.mindMapConnectFrom && ui.mindMapConnectFrom !== entry.name) {
                                    const fromName = ui.mindMapConnectFrom
                                    const fromEntry = contextData.find(e => e.name === fromName)
                                    const toEntry = contextData.find(e => e.name === entry.name)
                                    if (fromEntry && toEntry && !fromEntry.relations?.find(r => r.name === entry.name)) {
                                      setPendingRelation({ from: fromName, to: entry.name })
                                      setRelationTypeSelect('neutral')
                                    }
                                    setUI({ mindMapConnectFrom: null })
                                  }
                                }}
                                onDoubleClick={() => {
                                  setUI({ mindMapEditEntry: entry, showContextEditor: true, showMindMap: false })
                                }}
                              >
                                <span className="mindmap-node-icon"><User size={14} /></span>
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
                      <span><BookMarked size={14} /></span><span>{bookConfig?.title || 'Book'}</span>
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
                          }}>[D]</button>
                      </div>
                    ))
                  })()}
                </div>
            )}
          </div>
        </div>
      )}

      <SearchPanel />

      {ui.showVersions && (
        <div className="modal-overlay" onClick={() => setUI({ showVersions: false })}>
          <div className="search-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2><Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Version History</h2><button className="btn-icon" onClick={() => setUI({ showVersions: false })}>×</button></div>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-gray)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Snapshot label (optional)"
                value={snapshotLabel} onChange={e => setSnapshotLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSnapshot() }} />
              <button className="btn btn-primary btn-sm" onClick={createSnapshot}><Save size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Snapshot</button>
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
                      <span><FileText size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />{v.word_count.toLocaleString()} words</span>
                      <span><Scissors size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />{v.char_count.toLocaleString()} chars</span>
                      <span><BookOpen size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} />{v.chapter_count} chapters</span>
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => restoreSnapshot(v.id)}><RotateCcw size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Restore</button>
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
          <button className="titlebar-btn" onClick={handleMaximize}>{ui.isMaximized ? <Maximize2 size={12} /> : <Square size={12} />}</button>
          <button className="titlebar-btn close" onClick={handleClose}>×</button>
        </div>
      </div>

      {ui.showBookDialog && (
        <div className="modal-overlay" onClick={() => setUI({ showBookDialog: false })}>
          <div className="book-dialog" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>{ui.bookDialogMode === 'open' ? <><FolderOpen size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Open Book</> : <><Save size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Save Book As</>}</h2>
              <button className="btn-icon" onClick={() => setUI({ showBookDialog: false })}>×</button>
            </div>
            <div className="book-dialog-body">
              {ui.bookDialogMode === 'open' ? (
                <>
                  <button className="book-dialog-option" onClick={() => { setUI({ showBookDialog: false }); bookManager.openBookFolder() }}>
                    <span className="book-dialog-icon"><FolderOpen size={24} /></span>
                    <span className="book-dialog-label">Open Folder</span>
                    <span className="book-dialog-desc">Open a book from a folder on your computer</span>
                  </button>
                  <button className="book-dialog-option" onClick={() => { setUI({ showBookDialog: false }); bookManager.openBearFile() }}>
                    <span className="book-dialog-icon"><Package size={24} /></span>
                    <span className="book-dialog-label">Open .bear File</span>
                    <span className="book-dialog-desc">Open a .bear archive file</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="book-dialog-option" onClick={() => { setUI({ showBookDialog: false }); bookManager.saveAsBear() }}>
                    <span className="book-dialog-icon"><Package size={24} /></span>
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
            <div className="welcome-logo"><BookMarked size={48} /></div>
            <h1 className="welcome-title">{t('app.title')}</h1>
            <p className="welcome-subtitle">{t('app.subtitle')}</p>
            <div className="welcome-tabs">
              <button className="welcome-tab active" onClick={() => setUI({ welcomeTab: 'create' })}>
                <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('app.welcome.newBook')}
              </button>
              <button className="welcome-tab" onClick={() => setUI({ welcomeTab: 'open' })}>
                <FolderOpen size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('app.welcome.openBook')}
              </button>
            </div>
            <div className="welcome-panel">
              {(!ui.welcomeTab || ui.welcomeTab === 'create') ? (
                <div className="welcome-section">
                   <button className="welcome-option" onClick={bookManager.createNewBook}>
                    <span className="welcome-option-icon"><FolderOpen size={24} /></span>
                    <div>
                      <div className="welcome-option-title">New Book (Folder)</div>
                      <div className="welcome-option-desc">Create a new book in a folder on your computer</div>
                    </div>
                  </button>
                  <button className="welcome-option" onClick={bookManager.createNewBearBook}>
                    <span className="welcome-option-icon"><Package size={24} /></span>
                    <div>
                      <div className="welcome-option-title">New Book (.bear)</div>
                      <div className="welcome-option-desc">Create and save as a .bear archive file</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="welcome-section">
                  <button className="welcome-option" onClick={bookManager.openBookFolder}>
                    <span className="welcome-option-icon"><FolderOpen size={24} /></span>
                    <div>
                      <div className="welcome-option-title">Open Folder</div>
                      <div className="welcome-option-desc">Open an existing book from a folder</div>
                    </div>
                  </button>
                  <button className="welcome-option" onClick={bookManager.openBearFile}>
                    <span className="welcome-option-icon"><Package size={24} /></span>
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
               <button className="btn btn-icon" onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })}><Menu size={16} /></button>
              {bookConfig && (
                <div className="book-info-inline">
                  <input type="text" className="book-info-title" value={bookConfig.title}
                    onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, title: e.target.value } })}
                    onBlur={bookManager.saveBookConfig} title={t('settings.bookTitle')} />
                  <input type="text" className="book-info-author" value={bookConfig.author}
                    onChange={e => updateActiveBook({ bookConfig: { ...bookConfig, author: e.target.value } })}
                    onBlur={bookManager.saveBookConfig} placeholder={t('settings.bookAuthor')} />
                  <span className="book-info-genre">{bookConfig.bookType || bookConfig.genre}</span>
                </div>
              )}
            </div>
            <div className="header-center">
              {openBooks.length > 1 && (
                <div className="book-tabs">
                  {openBooks.map(book => (
                    <div key={book.id} className={`book-tab ${book.id === activeBookId ? 'active' : ''}`}
                      onClick={() => setActiveBookId(book.id)}>
                      <span className="tab-name">{book.title}</span>
                      {book.isModified && <span className="modified-dot">•</span>}
                      <button className="tab-close" onClick={(e) => {
                        e.stopPropagation();
                        useBookStore.setState({ openBooks: openBooks.filter(b => b.id !== book.id), activeBookId: activeBookId === book.id ? (openBooks.find(b => b.id !== book.id)?.id || null) : activeBookId })
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="header-right">
              <div className="toolbar-group">
                <button className="btn btn-primary btn-sm" onClick={bookManager.saveChapter} title={t('status.saved')}><Save size={14} /> {t('header.save')}</button>
                <div className="toolbar-dropdown">
                  <button className="btn btn-sm" onClick={() => setUI({ showBookDialog: true, bookDialogMode: 'save' })}><Package size={14} /> .bear</button>
                  <div className="toolbar-dropdown-content">
                    <button onClick={() => bookManager.exportBook('docx')}>[DOCX]</button>
                    <button onClick={() => bookManager.exportBook('pdf')}>[PDF]</button>
                  </div>
                </div>
              </div>
              <div className="toolbar-divider" />
              <button className={`btn btn-icon ${ui.showNotes ? 'active' : ''}`} onClick={() => setUI({ showNotes: !ui.showNotes })} title="Notes"><StickyNote size={16} /></button>
              <button className={`btn btn-icon ${ui.showTimeline ? 'active' : ''}`} onClick={() => setUI({ showTimeline: !ui.showTimeline })} title="Timeline"><CalendarDays size={16} /></button>
              <button className={`btn btn-icon ${ui.showWorld ? 'active' : ''}`} onClick={() => setUI({ showWorld: !ui.showWorld })} title="World"><Globe size={16} /></button>
              <button className={`btn btn-icon ${ui.showKanban ? 'active' : ''}`} onClick={() => setUI({ showKanban: !ui.showKanban })} title="Kanban"><LayoutGrid size={16} /></button>
              <div className="toolbar-divider" />
              <button className="btn btn-icon" onClick={() => { loadVersions(); setUI({ showVersions: true }) }}><Clock size={16} /></button>
              <button className="btn btn-icon" onClick={() => setUI({ showSearch: true })}><Search size={16} /></button>
              <button className="btn btn-icon" onClick={() => setUI({ showSettings: true })}><Settings size={16} /></button>
            </div>
          </header>

          <div className="main">
            {ui.sidebarOpen && (
              <aside className="sidebar">
                <div className="sidebar-header"><span className="sidebar-title">{t('sidebar.chapters')}</span></div>
                <div className="chapter-list">
                  {chapters.map((ch, i) => (
                    <div key={ch.id} className={`chapter-item ${ch.id === activeChapterId ? 'active' : ''}`}
                      onClick={() => updateActiveBook({ activeChapterId: ch.id })} onDoubleClick={() => bookManager.startRenameChapter(ch.id)}>
                      <span className="chapter-number">{i + 1}</span>
                      {ch.renaming ? (
                        <input className="chapter-name-input" defaultValue={ch.name} autoFocus
                          onBlur={e => bookManager.finishRenameChapter(ch.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') bookManager.finishRenameChapter(ch.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') updateActiveBook({ chapters: chapters.map(c => c.id === ch.id ? { ...c, renaming: false } : c) }) }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="chapter-name">{ch.name}</span>
                      )}
                      {ch.isModified && !ch.renaming && <span className="modified-dot">•</span>}
                      <button className="chapter-delete" onClick={e => { e.stopPropagation(); confirmAction(t('chapter.deleteConfirm'), () => bookManager.deleteChapter(ch.id)) }}>×</button>
                    </div>
                  ))}
                  <button className="btn btn-sm chapter-add" onClick={bookManager.addChapter}>+</button>
                </div>
                {contextData.length > 0 && (
                  <div className="context-section">
                    <div className="context-header">
                      {t('sidebar.context')}
                      <div className="context-header-right">
                        <button className="btn btn-sm" onClick={() => { const newEntry = { name: '', type: 'character' as const, details: {}, relations: [], notes: '' }; updateActiveBook({ contextData: [...contextData, newEntry] }); setUI({ showContextEditor: true }) }}>+</button>
                        <button className="btn btn-sm" onClick={() => setUI({ showWiki: true })}><BookOpen size={14} /></button>
                        <button className="btn btn-sm" onClick={() => setUI({ showMindMap: true })}><GitGraph size={14} /></button>
                      </div>
                    </div>
                    {contextGroups.map((g, gi) => {
                      const items = contextData.filter(c => (c.group || t('context.noGroup')) === g.name)
                      return (
                        <div key={gi}>
                          <div className="context-group-label">{g.name}</div>
                          {items.map((ctx, i) => (
                            <div key={i} className="context-item" title={Object.entries(ctx.details).map(([k, v]) => `${k}: ${v}`).join('\n')}>
                               <span className="context-icon">{ctx.type === 'character' ? <User size={12} /> : ctx.type === 'place' ? <MapPin size={12} /> : ctx.type === 'date' ? <CalendarDays size={12} /> : <Box size={12} />}</span>
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
                     <input ref={editor.colorInputRef} type="color" style={{ display: 'none' }}
                       value={ui.selectedColor}
                       onChange={e => setUI({ selectedColor: e.target.value })}
                       onBlur={e => editor.handleColor(e.target.value, false)} />
                     <input ref={editor.bgColorInputRef} type="color" style={{ display: 'none' }}
                       value={ui.selectedBgColor}
                       onChange={e => setUI({ selectedBgColor: e.target.value })}
                       onBlur={e => editor.handleColor(e.target.value, true)} />
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
                          title={t(btn.titleKey) || ''} onClick={() => editor.handleFormat(btn)} style={style}>
                          {formatIconComponents[btn.id] ? (
                            React.createElement(formatIconComponents[btn.id], { size: 14 })
                          ) : (
                            btn.icon
                          )}
                          {btn.id === 'color' && <span className="format-color-swatch" style={{ background: ui.selectedColor }} />}
                          {btn.id === 'bgColor' && <span className="format-color-swatch" style={{ background: ui.selectedBgColor }} />}
                        </button>
                      )
                    })}
                    <span className="format-sep" />
                    <button className={`format-btn format-btn-preview ${ui.showPreview ? 'active' : ''}`}
                      title="Toggle Preview Mode" onClick={() => setUI({ showPreview: !ui.showPreview })}>
                      <Eye size={16} />
                    </button>
                  </div>
                  <div className="editor" style={{ flex: ui.showPreview ? 1 : 2, display: 'flex', flexDirection: 'column' }}>
                    {ui.showPreview ? (
                      <div className="editor-preview" style={{ flex: 1, overflow: 'auto', padding: '20px 40px' }}>
                        <div className="preview-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(activeChapter.code) }} />
                      </div>
                    ) : (
                      <Editor
                        value={activeChapter.code}
                        height="100%"
                        onChange={editor.handleEditorChange}
                        onCreateEditor={editor.handleEditorCreate}
                        basicSetup={{ lineNumbers: false, highlightActiveLine: true, history: true, defaultKeymap: true, historyKeymap: true }}
                        extensions={[
                          ...(settings.showLineNumbers ? [lineNumbers()] : []),
                          ...editor.editorExtensions,
                          EditorView.lineWrapping,
                        ]}
                        style={{ fontSize: `${settings.fontSize}px`, fontFamily: fontCss }}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-editor"><p>{t('chapter.selectOrCreate')}</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {ui.showTimeline && activeBook && (
        <TimelinePanel
          timelineData={activeBook.timelineData}
          contextData={contextData}
          onUpdate={bookManager.updateTimeline}
          onClose={() => setUI({ showTimeline: false })}
          t={t}
          confirmAction={confirmAction}
          onOpenWiki={(entry) => setUI({ showTimeline: false, wikiSelected: entry, showWiki: true })}
        />
      )}

      <NotesPanel />

      <WorldPanel />

      <KanbanPanel />

       {ui.toast && (
         <div className={`toast toast-${ui.toast.type}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
           {ui.toast.type === 'success' ? <Check size={14} /> : ui.toast.type === 'error' ? <X size={14} /> : <Info size={14} />} {ui.toast.message}
         </div>
       )}

      {ui.confirmDialog && (
        <div className="modal-overlay" onClick={() => setUI({ confirmDialog: null })}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-message">{ui.confirmDialog.message}</div>
            <div className="confirm-actions">
              <button className="btn btn-sm" onClick={() => setUI({ confirmDialog: null })}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { ui.confirmDialog!.onConfirm(); setUI({ confirmDialog: null }) }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {ui.inputDialog && (
        <div className="modal-overlay" onClick={() => setUI({ inputDialog: null })}>
          <div className="input-dialog" onClick={e => e.stopPropagation()}>
            <div className="input-dialog-title">{ui.inputDialog.title}</div>
            <div className="form-group">
              <label>{ui.inputDialog.label}</label>
              {ui.inputDialog.multiline ? (
                <textarea className="form-textarea" ref={inputDialogRef as unknown as React.RefObject<HTMLTextAreaElement>} defaultValue={ui.inputDialog.defaultValue} autoFocus rows={4} />
              ) : (
                <input type="text" className="form-input" ref={inputDialogRef as React.RefObject<HTMLInputElement>} defaultValue={ui.inputDialog.defaultValue} autoFocus onKeyDown={e => { if (e.key === 'Enter') { ui.inputDialog!.onSubmit((inputDialogRef.current as HTMLInputElement)?.value || ''); setUI({ inputDialog: null }) } else if (e.key === 'Escape') setUI({ inputDialog: null }) }} />
              )}
            </div>
            <div className="input-dialog-actions">
              <button className="btn btn-sm" onClick={() => setUI({ inputDialog: null })}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { ui.inputDialog!.onSubmit((inputDialogRef.current as HTMLInputElement | HTMLTextAreaElement)?.value || ''); setUI({ inputDialog: null }) }}>OK</button>
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
