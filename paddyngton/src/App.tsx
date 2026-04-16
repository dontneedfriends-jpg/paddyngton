import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { oneDark } from '@codemirror/theme-one-dark'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, readDir } from '@tauri-apps/plugin-fs'

const languageExtensions: Record<string, () => any> = {
  javascript: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  rust: () => rust(),
  go: () => go(),
}

interface FileItem {
  name: string
  isDirectory: boolean
  path: string
}

interface Tab {
  id: string
  name: string
  path: string | null
  code: string
  language: string
  isModified: boolean
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([{
    id: '1',
    name: 'Untitled',
    path: null,
    code: '// Welcome to Paddyngton!\n// Start coding...\n\nconsole.log("Hello, World!");\n',
    language: 'javascript',
    isModified: false
  }])
  const [activeTabId, setActiveTabId] = useState('1')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentDir, setCurrentDir] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const inputRef = useRef<HTMLInputElement>(null)

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const commands = [
    { name: 'New File', icon: '+', shortcut: 'Ctrl+N', action: () => createNewTab() },
    { name: 'Open File', icon: '📂', shortcut: 'Ctrl+O', action: () => openFile() },
    { name: 'Save File', icon: '💾', shortcut: 'Ctrl+S', action: () => saveFile() },
    { name: 'Toggle Sidebar', icon: '☰', shortcut: 'Ctrl+B', action: () => setSidebarOpen(!sidebarOpen) },
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(commandQuery.toLowerCase())
  )

  const handleChange = useCallback((value: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, code: value, isModified: true }
        : tab
    ))
  }, [activeTabId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setShowCommandPalette(true)
        setCommandQuery('')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        openFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNewTab()
      }
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCommandPalette])

  useEffect(() => {
    if (showCommandPalette && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCommandPalette])

  const createNewTab = () => {
    const newId = Date.now().toString()
    setTabs(prev => [...prev, {
      id: newId,
      name: 'Untitled',
      path: null,
      code: '',
      language: 'javascript',
      isModified: false
    }])
    setActiveTabId(newId)
  }

  const openFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'html', 'css', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (selected) {
      try {
        const content = await readTextFile(selected as string)
        const fileName = (selected as string).split(/[/\\]/).pop() || 'Untitled'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        let lang = 'javascript'
        if (ext === 'py') lang = 'python'
        else if (ext === 'rs') lang = 'rust'
        else if (ext === 'go') lang = 'go'
        
        const existingTab = tabs.find(t => t.path === selected)
        if (existingTab) {
          setActiveTabId(existingTab.id)
        } else {
          const newId = Date.now().toString()
          setTabs(prev => [...prev, {
            id: newId,
            name: fileName,
            path: selected as string,
            code: content,
            language: lang,
            isModified: false
          }])
          setActiveTabId(newId)
        }
      } catch (err) {
        console.error('Error reading file:', err)
      }
    }
  }

  const saveFile = async () => {
    let path = activeTab.path
    if (!path) {
      path = await save({
        filters: [{ name: 'Code', extensions: ['js', 'ts', 'py', 'rs', 'go'] }],
      })
    }
    if (path) {
      try {
        await writeTextFile(path, activeTab.code)
        const fileName = path.split(/[/\\]/).pop() || 'Untitled'
        setTabs(prev => prev.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, path, name: fileName, isModified: false }
            : tab
        ))
      } catch (err) {
        console.error('Error saving file:', err)
      }
    }
  }

  const openFolder = async () => {
    const selected = await open({ directory: true })
    if (selected) {
      setCurrentDir(selected as string)
      loadDirectory(selected as string)
    }
  }

  const loadDirectory = async (dir: string) => {
    try {
      const entries = await readDir(dir)
      const fileList: FileItem[] = []
      for (const entry of entries) {
        if (!entry.name.startsWith('.')) {
          fileList.push({
            name: entry.name,
            isDirectory: entry.isDirectory ?? false,
            path: `${dir}/${entry.name}`.replace(/\\/g, '/')
          })
        }
      }
      setFiles(fileList.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      }))
    } catch (err) {
      console.error('Error loading directory:', err)
    }
  }

  const openFileFromSidebar = async (path: string, isDir: boolean) => {
    if (isDir) {
      setCurrentDir(path)
      loadDirectory(path)
    } else {
      try {
        const content = await readTextFile(path)
        const fileName = path.split(/[/\\]/).pop() || 'Untitled'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        let lang = 'javascript'
        if (ext === 'py') lang = 'python'
        else if (ext === 'rs') lang = 'rust'
        else if (ext === 'go') lang = 'go'
        
        const existingTab = tabs.find(t => t.path === path)
        if (existingTab) {
          setActiveTabId(existingTab.id)
        } else {
          const newId = Date.now().toString()
          setTabs(prev => [...prev, {
            id: newId,
            name: fileName,
            path,
            code: content,
            language: lang,
            isModified: false
          }])
          setActiveTabId(newId)
        }
      } catch (err) {
        console.error('Error opening file:', err)
      }
    }
  }

  const goUp = () => {
    if (currentDir) {
      const parts = currentDir.split(/[/\\]/)
      parts.pop()
      const parent = parts.join('/')
      if (parent) {
        setCurrentDir(parent)
        loadDirectory(parent)
      }
    }
  }

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return
    
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    
    if (activeTabId === tabId) {
      const newIndex = Math.min(tabIndex, newTabs.length - 1)
      setActiveTabId(newTabs[newIndex].id)
    }
  }

  return (
    <div className="app">
      {showCommandPalette && (
        <div className="command-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={e => e.stopPropagation()}>
            <div className="command-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="command-input"
                placeholder="Type a command..."
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
              />
            </div>
            <div className="command-list">
              {filteredCommands.map((cmd, i) => (
                <div key={i} className="command-item" onClick={() => { cmd.action(); setShowCommandPalette(false); }}>
                  <div className="command-icon">{cmd.icon}</div>
                  <span>{cmd.name}</span>
                  <span className="command-shortcut">{cmd.shortcut}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <div className="logo">P</div>
          <span className="app-name">Paddyngton</span>
        </div>
        
        <div className="header-center">
          <div className="file-tabs">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`file-tab ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.name}
                {tab.isModified && ' •'}
                {tabs.length > 1 && (
                  <button 
                    className="tab-close" 
                    onClick={(e) => closeTab(tab.id, e)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="header-right">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar">
            ☰
          </button>
          <button className="btn btn-secondary" onClick={openFile}>
            Open
          </button>
          <button className="btn btn-primary" onClick={saveFile}>
            Save
          </button>
        </div>
      </header>

      <div className="main">
        {sidebarOpen && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <span className="sidebar-title">Explorer</span>
              <div className="sidebar-actions">
                <button className="btn btn-icon" onClick={openFolder} title="Open Folder">
                  📂
                </button>
                {currentDir && (
                  <button className="btn btn-icon" onClick={goUp} title="Go Up">
                    ↑
                  </button>
                )}
              </div>
            </div>
            <div className="file-list">
              {files.map((file, i) => (
                <div 
                  key={i} 
                  className={`file-item ${activeTab.path === file.path ? 'active' : ''}`}
                  onClick={() => openFileFromSidebar(file.path, file.isDirectory)}
                >
                  <span className="file-icon">{file.isDirectory ? '📁' : '📄'}</span>
                  <span>{file.name}</span>
                </div>
              ))}
              {files.length === 0 && !currentDir && (
                <div className="file-item" style={{ color: 'var(--silver-blue)', cursor: 'default' }}>
                  Click 📂 to open a folder
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="editor-container">
          {tabs.length > 0 ? (
            <div className="editor">
              <Editor
                value={activeTab.code}
                height="100%"
                theme={oneDark}
                extensions={[languageExtensions[activeTab.language]!()]}
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-logo">
                <span>P</span>
              </div>
              <h1 className="welcome-title">Paddyngton</h1>
              <p className="welcome-subtitle">A modern code editor</p>
              <div className="welcome-actions">
                <button className="btn btn-primary" onClick={openFile}>
                  Open File
                </button>
                <button className="btn btn-outline" onClick={openFolder}>
                  Open Folder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="status-bar">
        <span className="status-item">
          {activeTab.language.charAt(0).toUpperCase() + activeTab.language.slice(1)}
        </span>
        <span className="status-item">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
        <span className="status-spacer"></span>
        <span className="status-badge">UTF-8</span>
        <span className="status-item">Ctrl+Shift+P</span>
      </footer>
    </div>
  )
}

export default App
