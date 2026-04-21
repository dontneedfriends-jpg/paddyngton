# Paddyngton — Refactoring TODO

## Project Overview

A cross-platform desktop book writing app. Built with Tauri 2.x (Rust) + React 19 + TypeScript + CodeMirror 6 + Vite 8. The main frontend is a monolithic `src/App.tsx` (2609 lines) with `src/index.css` (1785 lines) and `src-tauri/src/lib.rs` (477 lines).

## What Was Done (Sprint 1)

### B0: Cleanup (COMPLETED)
- Deleted dead root files (~155MB): `temp_original.tsx`, `write.js`, `write_lib.js`, `write_lib.cjs`, `write-postcss.cjs`, `fix_lib.js`, `fix_lib.ps1`, `create_app.py`, `write_app.py`, `f.name`, `opencode.exe`, `paddyngton` binary, `write.ps1`, `.vs/`
- Removed dead npm deps (152 packages): `jspdf`, `pdfkit`, `pdfmake`, `react-markdown`, `remark-gfm`, `@codemirror/lang-go`, `@codemirror/lang-python`, `@codemirror/lang-rust`, `@codemirror/theme-one-dark`, `file-saver`
- Fixed duplicate useEffect for `get_version`/`get_system_fonts` (was calling both twice)
- Updated `.gitignore` with patterns for dead files

### Phase 2: State Management & Hooks (COMPLETED — files created, not yet wired)

#### Zustand Stores (installed via `npm install zustand`)

| File | Purpose |
|------|---------|
| `src/store/useBookStore.ts` | Book state: `openBooks`, `activeBookId`, `updateActiveBook()`, `addBook()`, `removeBook()`, `updateChapter()`, `updateContextData()`, `updateWorldData()`, `updateKanbanData()`, `updateNotes()`, `updateTimelineData()`, `updateBookConfig()` |
| `src/store/useUIStore.ts` | All UI state: `showX` booleans, `tooltip`, `searchQuery`, `mindMap*` state, `wikiSelected`, `wikiEditMode`, `commandPalette`, `toast`, `confirmDialog`, `inputDialog`, `selectedColor`, `selectedBgColor`, etc. Actions: `set()`, `showToast()`, `confirmAction()`, `closeAllPanels()` |
| `src/store/useSettingsStore.ts` | Settings with localStorage persistence: `theme`, `fontSize`, `fontFamily`, `showLineNumbers`, `autoSnapshotMinutes`, `autoSaveToast`. Actions: `updateSettings()`, `cycleTheme()` |
| `src/store/index.ts` | Barrel export for all stores |

#### Custom Hooks

| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useBookManager.ts` | Book CRUD (create/open/save/export), chapter management, all save functions, Bear import/export | Created, NOT wired |
| `src/hooks/useEditor.ts` | `applyFormat()`, `applyColor()`, `getCloseMarker()`, `markdownMarkerPlugin`, `editorExtensions`, `editorViewRef`, `colorInputRef`, `bgColorInputRef` | Created, NOT wired |
| `src/hooks/useMindMap.ts` | Drag/pan/zoom handlers, all mind map refs (`mindMapCanvasRef`, etc.), connect mode | Created, NOT wired |
| `src/hooks/useKeyboardShortcuts.ts` | All Ctrl+ shortcuts and Escape handler | Created, NOT wired |
| `src/hooks/useAutoSave.ts` | Auto-save interval (60s) + auto-snapshot interval | Created, NOT wired |
| `src/hooks/useVersions.ts` | `loadVersions()`, `createSnapshot()`, `restoreSnapshot()` | Created, NOT wired |
| `src/hooks/useWindowControls.ts` | `handleMinimize()`, `handleMaximize()`, `handleClose()` | Created, NOT wired |

### Phase 3: Pure Utility Extraction (COMPLETED — wired into App.tsx)

| File | Functions | Status |
|------|-----------|--------|
| `src/lib/markdownRender.ts` | `renderMarkdown(text)` — marked + KaTeX regex replacement | **Wired into App.tsx** |
| `src/lib/contextHelpers.ts` | `extractGroups(data, noGroupLabel)`, `findContextEntry(word, contextData)`, `getWordAtPos(doc, pos)` | **Wired into App.tsx** |
| `src/lib/formatEditor.ts` | `applyFormat(fmt, view, opts)`, `applyColor(color, isBg, view)`, `getCloseMarker(marker)` | Created, NOT wired |
| `src/lib/bookIO.ts` | `loadBookData()`, `saveAllBookData()`, `saveChapterFile()`, `saveContext()`, `saveBookConfig()`, `saveWorldData()`, `saveKanbanData()`, `saveNotes()`, `saveTimelineData()`, `loadChaptersFromDisk()`, `readJsonFile()` | Created, NOT wired |

### What's Wired vs Not

**Wired into App.tsx:**
- `renderMarkdown` from `./lib/markdownRender` replaces inline version
- `extractGroups`/`findContextEntry`/`getWordAtPos` from `./lib/contextHelpers` replace inline versions (note: `extractGroups` is called as `extractGroupsFn` in App.tsx — it wraps the import to pass `t('context.noGroup')`)
- Duplicate useEffect fixed

**NOT wired (still inline in App.tsx):**
- All Zustand stores (`useBookStore`, `useUIStore`, `useSettingsStore`)
- All hooks (`useBookManager`, `useAutoSave`, `useMindMap`, `useKeyboardShortcuts`, `useVersions`, `useWindowControls`)
- `formatEditor.ts` functions (`applyFormat`, `applyColor`)

---

## What Remains (Phase 4+)

### Phase 4A: Wire Zustand Stores into App.tsx

This requires replacing the monolithic `useState<AppState>` with Zustand store subscriptions. Approximately 115+ `state.X` references and 200+ `setState(...)` calls need to be changed.

**Key mapping:**
- `const [state, setState] = useState<AppState>({...})` → split between `useUIStore()`, `useBookStore()`, `useSettingsStore()`
- `const [settings, setSettings] = useState<AppSettings>(defaultSettings)` → `useSettingsStore()`
- `const [toast, setToast] = useState(...)` → `useUIStore().toast` / `useUIStore().showToast()`
- `const [confirmDialog, setConfirmDialog] = useState(...)` → `useUIStore().confirmDialog` / `useUIStore().confirmAction()`
- `const [inputDialog, setInputDialog] = useState(...)` → `useUIStore().inputDialog` / `useUIStore().set()`
- `const [selectedColor, setSelectedColor] = useState(...)` → `useUIStore().selectedColor`
- `const [selectedBgColor, setSelectedBgColor] = useState(...)` → `useUIStore().selectedBgColor`
- `const [commandQuery, setCommandQuery] = useState('')` → `useUIStore().commandQuery`
- `const [showCommandPalette, setShowCommandPalette] = useState(false)` → `useUIStore().showCommandPalette`
- All `state.X` → `ui.X`
- All `setState(s => ({ ...s, X: Y }))` → `setUI({ X: Y })`
- All `setState(s => ({ ...s, showX: true }))` → `setUI({ showX: true })`
- `settings.X` → still `settings.X` (from useSettingsStore)
- `updateSettings(patch)` → still `updateSettings(patch)` (from useSettingsStore)

**Important: `view.state` in CodeMirror must NOT be changed** — it's the CodeMirror editor state, not our UI state.

### Phase 4B: Wire Hooks into App.tsx

After stores are wired:
- Replace inline `createNewBook`, `openBookFolder`, etc. with `useBookManager(t)` return values
- Replace inline `applyFormat`, `applyColor` with `useEditor()` return values
- Replace inline mind map handlers with `useMindMap()` return values
- Replace inline keyboard shortcuts with `useKeyboardShortcuts()`
- Replace inline auto-save with `useAutoSave()`
- Replace inline window controls with `useWindowControls()`
- Remove all the now-unused vars: `mindMapDragRef`, `mindMapCanvasRef`, etc.

### Phase 5: Extract Panel Components

Break inline JSX into components, each reading from Zustand stores:
```
src/components/layout/   TitleBar.tsx, Header.tsx, Sidebar.tsx, StatusBar.tsx
src/components/dialogs/    CommandPalette.tsx, BookDialog.tsx, VersionHistory.tsx, AboutPanel.tsx (existing: Toast.tsx, ConfirmDialog.tsx, InputDialog.tsx)
src/components/panels/    SettingsPanel.tsx, ContextEditor.tsx, WikiPanel.tsx, SearchPanel.tsx, NotesPanel.tsx, WorldPanel.tsx, KanbanPanel.tsx (existing: TimelinePanel.tsx)
src/components/editor/    FormatToolbar.tsx, MarkdownEditor.tsx
src/components/mindmap/   MindMapCanvas.tsx
```

Goal: App.tsx drops from ~2600 → ~400 lines (just layout composition).

### Phase 6: CSS Modules

Split `index.css` (1785 lines) into per-component CSS:
- `index.css` keeps only: CSS variables, theme definitions, global resets, `.btn`, `.form-input`
- Each component gets its own `.css` file
- Target: `index.css` → ~300 lines

### Phase 7: Rust Backend Split

Split `src-tauri/src/lib.rs` (477 lines) into modules:
```
src-tauri/src/
  lib.rs           # tauri builder + plugin registration only
  commands/
    mod.rs
    window.rs      # minimize, maximize, close, is_maximized, set_always_on_top
    version.rs     # get_version, get_system_fonts
    fs.rs          # save_binary_file, delete_file, create_test_book
    snapshot.rs     # save/list/restore version snapshots
    bear.rs        # open_bear, save_bear
    pdf.rs         # generate_pdf
  models.rs        # VersionSnapshot, ChapterData structs
  utils.rs         # chrono_lite_now, rand_id, walkdir_files
```

Fixes needed:
- Replace hardcoded Russian strings in `generate_pdf` with params
- Replace `chrono_lite_now` with `chrono` crate
- Add Cyrillic font support to printpdf

### Phase 8: TypeScript Strict Mode & Cleanup

- Enable `strict: true` in tsconfig.json
- Add `noUncheckedIndexedAccess`
- Remove `any` types (especially in `markdownMarkerPlugin`)
- Remove 114 inline `style={{}}` → CSS classes
- Fix duplicate theme definitions in CSS

## Design System (from DESIGN.md)

Kraken-inspired design:
- Primary: `#7132f5` (Kraken Purple), dark `#5741d8`, deep `#5b1ecf`
- Subtle: `rgba(133,91,251,0.16)`
- Text: Near-black `#101114`
- Neutral: Cool gray `#686b82`, Silver blue `#9497a9`
- Button radius: 12px max (no pill)
- Shadow subtle: `rgba(0,0,0,0.03) 0px 4px 24px`
- Green accent: `#149e61`

## Known Issues (from IMPROVEMENT_PLAN.md)

1. 114 inline `style={{}}` in App.tsx
2. Duplicate `useEffect` for version/fonts — **FIXED**
3. Emoji icons should be replaced with Lucide React
4. Hardcoded colors (`#e53e3e` etc.) mixed with CSS variables
5. PDF uses Helvetica (no Cyrillic support)
6. `markdownMarkerPlugin` has untyped JS — needs TS strict fix
7. No tests despite Playwright in deps
8. No TypeScript strict mode
9. Custom `chrono_lite_now` in Rust instead of chrono crate
10. Markdown rendering uses regex for KaTeX instead of unified pipeline

## File Map (Current)

```
src/
  App.tsx                    # 2609 lines — MAIN MONOLITH (stores/hooks NOT yet wired)
  index.css                  # 1785 lines — all styles
  i18n.tsx                   # 95 lines — i18n setup
  main.tsx                    # 13 lines
  vite-env.d.ts               # 6 lines
  constants/
    index.ts                  # barrel export
    formatButtons.ts          # 46 lines — FORMAT_BUTTONS, MARKER_CLOSERS
  types/
    index.ts                  # 282 lines — all TS types + constants
  hooks/
    useSettings.ts            # 22 lines — localStorage load/save (keep for compat)
    useBookManager.ts          # ~550 lines — book CRUD (NOT wired)
    useEditor.ts               # ~200 lines — editor formatting (NOT wired)
    useMindMap.ts              # ~210 lines — mind map interactions (NOT wired)
    useKeyboardShortcuts.ts    # ~90 lines — keyboard shortcuts (NOT wired)
    useAutoSave.ts             # ~50 lines — auto-save/auto-snapshot (NOT wired)
    useVersions.ts             # ~50 lines — version snapshots (NOT wired)
    useWindowControls.ts        # ~15 lines — window controls (NOT wired)
  components/
    dialogs/
      index.ts                 # barrel
      Toast.tsx                # 14 lines
      ConfirmDialog.tsx        # 21 lines
      InputDialog.tsx          # 71 lines
    panels/
      index.ts                 # barrel
      TimelinePanel.tsx        # 252 lines
  store/
    index.ts                   # barrel export
    useBookStore.ts            # ~130 lines — Zustand book state (NOT wired)
    useUIStore.ts              # ~150 lines — Zustand UI state (NOT wired)
    useSettingsStore.ts        # ~50 lines — Zustand settings (NOT wired)
  translations/
    en.json                    # 272 lines
    ru.json                    # 271 lines
    es.json                    # 271 lines
  lib/
    bookIO.ts                  # ~200 lines — file I/O helpers (NOT wired)
    markdownRender.ts          # ~40 lines — renderMarkdown (WIRED)
    contextHelpers.ts          # ~40 lines — extractGroups etc. (WIRED)
    formatEditor.ts             # ~180 lines — format/apply helpers (NOT wired)
src-tauri/
  src/
    lib.rs                     # 477 lines — all Tauri commands (monolith)
    main.rs                    # entry point
  tauri.conf.json              # app config
```

## Build Instructions

```bash
npm install
npm run dev          # Dev server (Vite on :1420 + Tauri window)
npm run tauri dev    # Run in separate terminal
npm run tauri build  # Production build
npm run build        # Frontend build only
```

## Key Architecture Decisions

1. **Zustand** was chosen over Context+useReducer (per IMPROVEMENT_PLAN.md) — 3KB, no provider wrapping, built-in selectors
2. **Incremental migration** — stores and hooks are created but App.tsx still uses `useState<AppState>`. Wiring should be done in a dedicated session with visual verification.
3. **Pure utility functions** have been extracted first (Phase 3) — these are easy to wire since they have no React dependencies.
4. The `extractGroups` function in App.tsx is wrapped as `extractGroupsFn` to pass the `t()` translation function, since the lib version uses a default 'No Group' label.