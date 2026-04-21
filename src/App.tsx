import React, { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import Editor from '@uiw/react-codemirror'
import { lineNumbers, EditorView } from '@codemirror/view'

import 'katex/dist/katex.min.css'
import { Check, X, Info } from 'lucide-react'
import { useTranslation } from './i18n'
import {
  Toast, ConfirmDialog, InputDialog, CommandPalette, BookDialog,
} from './components/dialogs'
import {
  TimelinePanel, SearchPanel, NotesPanel, WorldPanel, KanbanPanel,
  SettingsPanel, ContextEditor, WikiPanel, MindMapCanvas, VersionsPanel,
} from './components/panels'
import { TitleBar, Header, Sidebar, StatusBar, WelcomeScreen } from './components/layout'
import { FormatToolbar } from './components/editor'
import { renderMarkdown } from './lib/markdownRender'
import { extractGroups, findContextEntry, getWordAtPos } from './lib/contextHelpers'
import { useUIStore } from './store/useUIStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useBookStore } from './store/useBookStore'
import { useBookManager } from './hooks/useBookManager'
import { useAutoSave } from './hooks/useAutoSave'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useEditor } from './hooks/useEditor'
import {
  type ContextEntry,
  type ContextGroup,
  type BookConfig,
  type BookInstance,
} from './types'

function parseVersion(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0)
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
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const openBooks = useBookStore((s) => s.openBooks)
  const activeBookId = useBookStore((s) => s.activeBookId)
  const updateActiveBookStore = useBookStore((s) => s.updateActiveBook)
  const bookManager = useBookManager(t)
  useAutoSave()
  const editor = useEditor()

  const activeBook = openBooks.find((b) => b.id === activeBookId) || null
  const chapters = activeBook?.chapters || []
  const activeChapterId = activeBook?.activeChapterId || null
  const activeChapter = chapters.find((c) => c.id === activeChapterId) || null
  const contextData = activeBook?.contextData || []
  const contextGroups = activeBook?.contextGroups || []
  const bookConfig = activeBook?.bookConfig || null

  const updateActiveBook = useCallback(
    (patch: Partial<BookInstance>) => {
      updateActiveBookStore(patch)
    },
    [updateActiveBookStore]
  )

  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const { inputRef } = useKeyboardShortcuts({
    createNewBook: bookManager.createNewBook,
    saveChapter: bookManager.saveChapter,
    addChapter: bookManager.addChapter,
    editorViewRef: editor.editorViewRef,
  })
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!activeChapter || contextData.length === 0 || !editor.editorViewRef.current) return
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current)
        tooltipTimeout.current = null
      }
      tooltipTimeout.current = setTimeout(() => {
        const view = editor.editorViewRef.current
        if (!view) return
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
        if (pos == null) return
        const doc = view.state.doc.toString()
        const word = getWordAtPos(doc, pos)
        if (word.length > 2) {
          const entry = findContextEntry(word, contextData)
          if (entry) {
            setUI({ tooltip: { ...entry, x: e.clientX, y: e.clientY } })
            return
          }
        }
        setUI({ tooltip: null })
      }, 800)
    },
    [activeChapter, contextData, setUI, editor.editorViewRef]
  )

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current)
      tooltipTimeout.current = null
    }
    setUI({ tooltip: null })
  }, [setUI])

  useEffect(() => {
    invoke<boolean>('is_maximized').then((res) => setUI({ isMaximized: res }))
  }, [setUI])

  useEffect(() => {
    if (window.__TAURI_INTERNALS__?.testMode) {
      const initTestBook = async () => {
        try {
          const testDir = await invoke<string>('create_test_book')
          const contextData: ContextEntry[] = JSON.parse(
            await readTextFile(`${testDir}/.context.json`)
          )
          const bookConfig: BookConfig | null = JSON.parse(
            await readTextFile(`${testDir}/.book.json`)
          )
          const groups = extractGroups(contextData, t('context.noGroup'))
          bookManager.loadBook(testDir, contextData, groups, bookConfig)
        } catch {}
      }
      initTestBook()
    }
  }, [bookManager, t])

  useEffect(() => {
    invoke<string[]>('get_system_fonts')
      .then((fonts) => setSystemFonts(fonts.sort((a, b) => a.localeCompare(b))))
      .catch(() => {})

    const checkForUpdates = async () => {
      let localVersion = '0.0.0'
      try {
        localVersion = await invoke<string>('get_version')
        setUI({ currentVersion: localVersion })
        console.log('[Updater] Local version:', localVersion)
      } catch (err) {
        console.error('[Updater] Failed to get local version:', err)
        setUI({ currentVersion: localVersion })
      }

      await new Promise((r) => setTimeout(r, 1500))

      try {
        setUI({ updateLoading: true })
        const resp = await fetch(
          'https://github.com/dontneedfriends-jpg/paddyngton/releases/latest/download/latest.json',
          { headers: { Accept: 'application/json' } }
        )
        if (resp.ok) {
          const data = await resp.json()
          const remoteVersion = data.version as string
          if (isNewerVersion(remoteVersion, localVersion)) {
            setUI({ updateAvailable: remoteVersion, updateLoading: false })
          } else {
            setUI({ updateAvailable: null, updateLoading: false })
          }
        } else {
          setUI({ updateAvailable: null, updateLoading: false })
        }
      } catch (err) {
        console.error('[Updater] Fetch error:', err)
        setUI({ updateAvailable: null, updateLoading: false })
      }
    }
    checkForUpdates()
  }, [setUI])

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (useUIStore.getState().inputDialog || useUIStore.getState().confirmDialog) {
      invoke('set_always_on_top', { value: true }).catch(() => {})
    }
    return () => {
      invoke('set_always_on_top', { value: false }).catch(() => {})
    }
  }, [])

  const fontCss = settings.fontFamily
    ? `'${settings.fontFamily}', sans-serif`
    : "'IBM Plex Sans', sans-serif"

  return (
    <div className={`app ${settings.theme}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {ui.tooltip && (
        <div className="context-tooltip" style={{ left: ui.tooltip.x + 14, top: ui.tooltip.y + 14 }}>
          <div className="context-tooltip-name">{ui.tooltip.name}</div>
          <div className="context-tooltip-type">
            {ui.tooltip.type === 'character'
              ? '[C] ' + t('context.types.character')
              : ui.tooltip.type === 'place'
                ? '[P] ' + t('context.types.place')
                : ui.tooltip.type === 'date'
                  ? '[D] ' + t('context.types.date')
                  : '[I] ' + t('context.types.item')}
          </div>
          <div className="context-tooltip-details">
            {Object.entries(ui.tooltip.details)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="context-tooltip-detail">
                  <strong>{k}:</strong> {v}
                </div>
              ))}
          </div>
        </div>
      )}

      <CommandPalette inputRef={inputRef} />
      <SettingsPanel />
      <ContextEditor />
      <WikiPanel />
      <MindMapCanvas />
      <SearchPanel />
      <VersionsPanel />
      <TitleBar />
      <BookDialog />

      {activeBook === null ? (
        <WelcomeScreen />
      ) : (
        <>
          <Header />
          <div className="main">
            <Sidebar />
            <div className="editor-container">
              {activeChapter ? (
                <>
                  <FormatToolbar systemFonts={systemFonts} />
                  <div
                    className="editor"
                    style={{ flex: ui.showPreview ? 1 : 2, display: 'flex', flexDirection: 'column' }}
                  >
                    {ui.showPreview ? (
                      <div
                        className="editor-preview"
                        style={{ flex: 1, overflow: 'auto', padding: '20px 40px' }}
                      >
                        <div
                          className="preview-content"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(activeChapter.code) }}
                        />
                      </div>
                    ) : (
                      <Editor
                        value={activeChapter.code}
                        height="100%"
                        onChange={editor.handleEditorChange}
                        onCreateEditor={editor.handleEditorCreate}
                        basicSetup={{
                          lineNumbers: false,
                          highlightActiveLine: true,
                          history: true,
                          defaultKeymap: true,
                          historyKeymap: true,
                        }}
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
                <div className="empty-editor">
                  <p>{t('chapter.selectOrCreate')}</p>
                </div>
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
          confirmAction={useUIStore.getState().confirmAction}
          onOpenWiki={(entry) => setUI({ showTimeline: false, wikiSelected: entry, showWiki: true })}
        />
      )}

      <NotesPanel />
      <WorldPanel />
      <KanbanPanel />

      <Toast toast={ui.toast} />
      <ConfirmDialog
        confirmDialog={ui.confirmDialog}
        onCancel={() => setUI({ confirmDialog: null })}
      />
      <InputDialog
        inputDialog={ui.inputDialog}
        onCancel={() => setUI({ inputDialog: null })}
      />

      <StatusBar />
    </div>
  )
}

export default App
