# Paddyngton — Complete Project Context for AI Agents

> **Last updated:** 2026-04-23  
> **Purpose:** This document exists so any AI agent can read it once and understand the entire codebase architecture, design system, data model, state management, editor internals, build pipeline, and testing infrastructure without needing to explore the codebase blindly.

---

## 1. What is Paddyngton?

A cross-platform desktop application for writing books (novels, short stories, screenplays, non-fiction). Think Scrivener but open-source, lightweight, and with a built-in character relationship mind map, timeline, world-building wiki, and kanban board for plot planning.

**Tech stack:**
- **Frontend:** React 19 + TypeScript + Vite 8
- **Backend:** Rust (Tauri 2.x)
- **Editor:** CodeMirror 6 with 4 custom ViewPlugins
- **State:** Zustand (3 stores)
- **Styling:** Tailwind CSS 4 + hand-written component CSS files
- **Icons:** Lucide React (zero emoji in UI except user content)
- **i18n:** English, Russian, Spanish with type-safe translation keys
- **Math rendering:** KaTeX (inline + display)
- **Export:** DOCX (docx library), PDF (Rust printpdf + font-kit for Cyrillic)
- **Tests:** Vitest (unit) + Playwright (e2e)

---

## 2. Project Structure

```
paddyngton/
├── src/
│   ├── App.tsx                    # Root component (~338 lines). Layout + dialogs + panels composition.
│   ├── main.tsx                   # React entry point. Wraps app in I18nProvider.
│   ├── index.css                  # GLOBAL CSS: Fluent Acrylic design system, tokens, animations, buttons, forms, panels
│   ├── i18n.tsx                   # Translation context: useTranslation hook, 3 languages, type-safe keys
│   ├── vite-env.d.ts            # Vite types + Window.__TAURI_INTERNALS__ declaration
│   ├── types/index.ts             # ALL TypeScript types, constants, defaults, templates
│   ├── constants/
│   │   ├── formatButtons.ts       # Format toolbar button definitions (bold, italic, etc.)
│   │   └── index.ts               # Barrel export
│   ├── lib/
│   │   ├── markdownRender.ts      # marked.parse + protect/restore code blocks + KaTeX regex injection
│   │   ├── formatEditor.ts        # applyFormat / applyColor for CodeMirror
│   │   ├── contextHelpers.ts      # extractGroups, findContextEntry, getWordAtPos
│   │   └── bookIO.ts              # File I/O helpers for books
│   ├── store/
│   │   ├── index.ts               # Barrel exports for all stores
│   │   ├── useBookStore.ts        # openBooks, activeBookId, updateActiveBook, loadBook, closeBook
│   │   ├── useUIStore.ts          # All showX flags, modals, mind map state, toasts, confirmAction
│   │   └── useSettingsStore.ts    # theme, fontSize, typewriterMode, columnWidth, streak, etc. (persisted to localStorage)
│   ├── hooks/
│   │   ├── useBookManager.ts      # CRUD books/chapters, Bear import/export, PDF/DOCX export
│   │   ├── useEditor.ts           # 4 CodeMirror ViewPlugins + extension composition + format handlers
│   │   ├── useMindMap.ts          # drag/pan/zoom/fit-to-screen logic + Space+drag + Ctrl+0
│   │   ├── useKeyboardShortcuts.ts # ALL keyboard shortcuts (Ctrl+K, F11, Ctrl+Shift+., Ctrl+Shift+Y, etc.)
│   │   ├── useAutoSave.ts         # Debounced auto-save hook (~1s delay)
│   │   ├── useWritingStats.ts     # Word count tracking, daily target, streak calculation
│   │   ├── useRecentBooks.ts      # localStorage recent books list
│   │   ├── useVersions.ts         # Version snapshots (in VersionsPanel)
│   │   ├── useWindowControls.ts   # minimize/maximize/close window
│   │   └── useSettings.ts         # Settings-related helpers
│   ├── components/
│   │   ├── layout/
│   │   │   ├── index.ts           # Barrel exports
│   │   │   ├── TitleBar.tsx       # Custom window title bar (min/max/close buttons)
│   │   │   ├── Header.tsx         # Top bar: save, search, settings, chapter nav, export
│   │   │   ├── Sidebar.tsx        # Left sidebar: chapters list + context list
│   │   │   ├── StatusBar.tsx      # Bottom bar: timer, word count, progress bar, streak, theme, font
│   │   │   └── WelcomeScreen.tsx  # Landing screen: hero SVG, template cards, recent books
│   │   ├── editor/
│   │   │   ├── index.ts           # Barrel exports
│   │   │   ├── FormatToolbar.tsx  # Bold/italic/headers/lists/color/etc buttons
│   │   │   └── Editor.css         # ALL editor styling (CodeMirror overrides, preview, focus mode, wikilinks, char highlight)
│   │   ├── panels/
│   │   │   ├── index.ts           # Barrel exports
│   │   │   ├── SettingsPanel.tsx  # Appearance, Book info, About tabs
│   │   │   ├── ContextEditor.tsx  # Add/edit context entries (characters/places/items)
│   │   │   ├── WikiPanel.tsx      # Read/edit wiki for a selected context entry
│   │   │   ├── MindMapCanvas.tsx  # SVG-based interactive character relationship map (Bézier curves)
│   │   │   ├── TimelinePanel.tsx  # Chronological events with linked characters
│   │   │   ├── NotesPanel.tsx     # Quick notes
│   │   │   ├── WorldPanel.tsx     # World-building entries grid
│   │   │   ├── KanbanPanel.tsx    # Kanban board with columns/cards + color legend
│   │   │   ├── SearchPanel.tsx    # Full-text search across chapters + context
│   │   │   └── VersionsPanel.tsx  # Snapshot / restore version history
│   │   └── dialogs/
│   │       ├── index.ts           # Barrel exports
│   │       ├── CommandPalette.tsx # Ctrl+K quick command search
│   │       ├── BookDialog.tsx     # New book / open book dialog
│   │       ├── InputDialog.tsx    # Generic text input prompt
│   │       ├── ConfirmDialog.tsx  # Generic confirm/cancel dialog
│   │       └── Toast.tsx          # Toast notification system
│   └── translations/
│       ├── en.json                # Source of truth for all UI strings
│       ├── ru.json                # Russian translations
│       ├── es.json                # Spanish translations
│       └── keys.ts                # Auto-generated union type of 273 translation keys (from en.json)
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                # Tauri app entry point
│   │   ├── lib.rs                 # Tauri Builder + command registrations + plugin setup
│   │   ├── models.rs              # Rust structs (VersionSnapshot, ChapterData)
│   │   ├── utils.rs               # chrono_now(), rand_id(), walkdir_files()
│   │   └── commands/
│   │       ├── mod.rs             # Module re-exports
│   │       ├── window.rs          # minimize, maximize, close, is_maximized, set_always_on_top
│   │       ├── version.rs         # get_version, get_system_fonts
│   │       ├── fs.rs              # save_binary_file (atomic), create_test_book, delete_file
│   │       ├── snapshot.rs        # save_version_snapshot, list, restore
│   │       ├── bear.rs            # open_bear, save_bear (ZIP archive format)
│   │       └── pdf.rs             # generate_pdf with system font fallback for Cyrillic
│   ├── capabilities/default.json  # Tauri permissions (fs, shell, dialog, etc.)
│   ├── Cargo.toml                 # Rust dependencies: tauri, printpdf, chrono, zip, font-kit
│   ├── build.rs                   # Tauri build script
│   └── tauri.conf.json            # App config
│
├── tests/
│   ├── unit/
│   │   └── utils.spec.ts          # Vitest tests: extractGroups, findContextEntry, getWordAtPos, renderMarkdown
│   └── e2e/
│       └── smoke.spec.ts          # Playwright smoke: welcome screen renders
│
├── scripts/
│   └── generate-translation-types.ts  # Generates src/translations/keys.ts from en.json
│
├── context-template.json          # Default template for new .context.json files
├── book-template.json             # Default template for new .book.json files
├── build.bat                      # One-click build: npm install -> vite build -> tauri build
├── vitest.config.ts               # Vitest configuration (node env, tests/unit/**/*.spec.ts)
├── playwright.config.ts           # Playwright configuration (Chromium, webServer on :1420)
└── package.json
```

---

## 3. Design System: Microsoft Fluent Acrylic

The app uses a **Fluent 2.0 Acrylic** aesthetic inspired by Windows 11.

### Core visual principles
- **Backdrop blur:** `backdrop-filter: blur(60px) saturate(125%)` applied once on `.app::before`
- **Noise texture:** SVG `feTurbulence` noise overlay at 3% opacity via `background` on `::before`
- **Acrylic tint:** Semi-transparent surface (`--surface: rgba(255,255,255,0.85)`) over tinted background
- **Elevation shadows:** Soft, diffused shadows using CSS variables `--shadow-elev1/2/3`
- **Typography:** Segoe UI Variable / Inter fallback, Fluent type ramp (`--text-xs` through `--text-3xl`)
- **Radii:** 4px (sm), 8px (md/lg) — unified from previous 7-theme chaos
- **Transitions:** 83ms fast, 167ms base, 333ms slow — all `cubic-bezier(0,0,0,1)`

### Theme system (3 themes)
Previously there were 7 themes (galaxy, aurora, forest, etc.). They were replaced with 3 acrylic themes:

```ts
type ThemeName = 'light' | 'dark' | 'paper'
```

**Theme migration protection:** If an old theme name is found in `localStorage` (e.g. `galaxy`), `useSettingsStore.ts` automatically resets it to `'light'` during load.

All colors come from CSS variables defined in `src/index.css`. Key variables:
```css
/* Light */
--bg: #F3F3F3;
--surface: rgba(255,255,255,0.85);
--surface-solid: #F9F9F9;
--accent: #0078D4;          /* Fluent blue */
--near-black: #1C1C1C;
--cool-gray: #5F5F5F;
--danger: #C42B1C;
--success: #0F7B0F;

/* Dark */
--bg: #202020;
--surface: rgba(45,45,45,0.75);
--accent: #4CC2FF;          /* Fluent light blue */
--near-black: #FFFFFF;

/* Paper — muted warm gray, easy on the eyes */
--bg: #EDE8E3;              /* Warm beige-gray */
--surface: rgba(255,253,248,0.85);
--surface-solid: #F5F0EB;
--accent: #6B8E6B;          /* Muted olive green */
--near-black: #3D3A36;      /* Dark warm gray (not pure black) */
--cool-gray: #8A8580;
--danger: #C45C5C;          /* Muted terracotta */
--success: #6B9E6B;
--editor-bg: #F7F2EC;       /* Cream */
```

The **Paper** theme uses significantly lower contrast than Light/Dark — no pure blacks or whites, softer borders (`rgba(0,0,0,0.04)` vs `0.06`), and a muted olive accent instead of bright blue. Designed for users with eye strain or light sensitivity.

**Theme migration protection:** If an old theme name is found in `localStorage` (e.g. `galaxy`), `useSettingsStore.ts` automatically resets it to `'light'` during load.

All colors come from CSS variables in `src/index.css`:

```css
/* Light */
--bg: #F3F3F3;
--surface: rgba(255,255,255,0.85);
--surface-solid: #F9F9F9;
--accent: #0078D4;          /* Fluent blue */
--near-black: #1C1C1C;
--cool-gray: #5F5F5F;
--danger: #C42B1C;
--success: #0F7B0F;

/* Dark */
--bg: #202020;
--surface: rgba(45,45,45,0.75);
--accent: #4CC2FF;          /* Fluent light blue */
--near-black: #FFFFFF;
```

### Component styling pattern
Every component has its own `.css` file alongside `.tsx`. The global `index.css` provides utility classes:
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-sm`, `.btn-danger`
- `.form-input`, `.form-textarea`, `.form-group`
- `.panel`, `.panel-header`, `.panel-content`, `.panel-actions`
- `.modal-overlay` (Fluent smoke overlay with `backdrop-filter: blur(8px)`)
- Utility animations: `.animate-fadeIn`, `.animate-scaleIn`, `.animate-slideInRight`, etc.

**Rule:** No inline `style={{}}` in App.tsx. Component files may use inline styles ONLY for dynamic values (e.g. `left: ${x}px`).

---

## 4. State Architecture (Zustand)

Three separate Zustand stores. All use **primitive selectors** (or `getState()` in callbacks) to avoid unnecessary re-renders.

### useBookStore (`src/store/useBookStore.ts`)
```ts
interface BookStore {
  openBooks: BookInstance[]
  activeBookId: string | null
  updateActiveBook: (patch: Partial<BookInstance>) => void
  loadBook: (dir: string, contextData: ContextEntry[], groups: ContextGroup[], bookConfig: BookConfig) => void
  closeBook: (id: string) => void
}
```
- Holds ALL book data: chapters, context, timeline, notes, world, kanban
- `updateActiveBook` merges a patch into the currently active book
- Every mutation triggers auto-save via `useAutoSave`
- Uses immer-style immutable updates (spread copies)

### useUIStore (`src/store/useUIStore.ts`)
```ts
interface UIStore {
  showSettings: boolean
  showMindMap: boolean
  showWiki: boolean
  showSearch: boolean
  showTimeline: boolean
  showNotes: boolean
  showWorld: boolean
  showKanban: boolean
  showPreview: boolean
  showCommandPalette: boolean
  zenMode: boolean
  focusMode: boolean
  mindMapZoom: number
  mindMapPanX: number
  mindMapPanY: number
  mindMapConnectFrom: string | null
  mindMapDrag: string | null
  tooltip: Tooltip | null
  toast: { message: string; type: 'success'|'error'|'info' } | null
  confirmDialog: { title: string; message: string; onConfirm: () => void } | null
  inputDialog: { title: string; label: string; defaultValue: string; onSubmit: (val: string) => void } | null
  set: (patch: Partial<UIStore>) => void
  closeAllPanels: () => void
  confirmAction: (message: string, onConfirm: () => void) => void
}
```
- All UI visibility flags
- Modal/dialog state
- Mind map transient state (zoom, pan, drag)
- `confirmAction` is the standard pattern for showing a confirm dialog

### useSettingsStore (`src/store/useSettingsStore.ts`)
```ts
interface SettingsStore {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  cycleTheme: () => void
}
```
- Persisted to `localStorage` under key `paddyngton-settings`
- `AppSettings` includes: theme, fontSize, fontFamily, showLineNumbers, typewriterMode, columnWidth, autoSnapshotMinutes, autoSaveToast, sessionTarget, wordsToday, lastWritingDate, streak
- **Theme validation:** On load, invalid old themes (galaxy, aurora, etc.) are automatically reset to `'light'`

---

## 5. Data Model

### Core Types (`src/types/index.ts`)

```ts
export type RelationType = 'ally' | 'enemy' | 'family' | 'neutral' | 'romantic' | 'rival'

export interface Relation {
  name: string
  type: RelationType
}

export type ContextEntryType = 'character' | 'place' | 'date' | 'item'

export interface ContextEntry {
  name: string
  type: ContextEntryType
  details: Record<string, string>
  group?: string
  relations?: Relation[]
  notes?: string
  _x?: number
  _y?: number
}

export interface Chapter {
  id: string
  name: string
  path: string | null
  code: string
  isModified: boolean
}

export interface BookConfig {
  title: string
  author: string
  genre: string
  bookType: string
  description: string
  createdAt: string
  chapters: { id: string; name: string; file: string }[]
}

export interface BookInstance {
  id: string           // book directory path (used as ID)
  title: string
  dir: string
  bookConfig: BookConfig
  chapters: Chapter[]
  activeChapterId: string | null
  contextData: ContextEntry[]
  contextGroups: ContextGroup[]
  timelineData: TimelineEntry[]
  notes: Note[]
  worldData: WorldEntry[]
  kanbanData: KanbanBoard
  isModified: boolean
}

export type ThemeName = 'light' | 'dark'
export type ColumnWidth = 'default' | 'narrow' | 'medium' | 'wide'

export interface AppSettings {
  theme: ThemeName
  fontSize: number
  fontFamily: string
  showLineNumbers: boolean
  typewriterMode: boolean
  columnWidth: ColumnWidth        // Editor max-width: default=800px, narrow=60ch, medium=72ch, wide=90ch
  autoSnapshotMinutes: number
  autoSaveToast: boolean
  sessionTarget: number           // Daily word target (default 500)
  wordsToday: number
  lastWritingDate: string
  streak: number                  // Consecutive days with writing activity
}
```

### On-disk format
A "book" is a **folder** containing:

#### `.book.json` — Book metadata + chapter list
```json
{
  "title": "My Novel",
  "author": "Author Name",
  "genre": "Fantasy",
  "bookType": "Novel",
  "description": "...",
  "createdAt": "2026-04-22T...",
  "chapters": [
    { "id": "uuid", "name": "Chapter 1", "file": "Chapter 1.md" }
  ]
}
```

#### `.context.json` — All book data EXCEPT chapter text
```json
{
  "context": [
    {
      "name": "Aragorn",
      "type": "character",
      "details": { "Age": "87", "Gender": "Male" },
      "relations": [{ "name": "Arwen", "type": "romantic" }],
      "group": "Fellowship",
      "notes": "King of Gondor",
      "_x": 420,
      "_y": 230
    }
  ],
  "timelineData": [{ "id": "...", "date": "Year 3019", "label": "Battle", "content": "...", "color": "#C42B1C", "notes": "", "characterIds": [] }],
  "notes": [{ "id": "...", "title": "Idea", "content": "...", "createdAt": "..." }],
  "worldData": [{ "id": "...", "title": "Middle-earth", "content": "...", "category": "Geography" }],
  "kanbanData": { "columns": [...], "colorLabels": { "#e53e3e": "Urgent" } }
}
```

#### Chapter files
Each chapter is a separate `.md` file. File name matches the `file` field in `.book.json`.

### ContextEntry types
- `character` — People in the story
- `place` — Locations
- `date` — Events / time periods
- `item` — Objects / artifacts

Every type has a template in `CONTEXT_TEMPLATES` (`types/index.ts`).

### Relations
```ts
type RelationType = 'ally' | 'enemy' | 'family' | 'neutral' | 'romantic' | 'rival'
```
Colors (in `RELATION_COLORS`):
- ally: `#0F7B0F` (green)
- enemy: `#C42B1C` (red)
- family: `#0078D4` (blue)
- neutral: `#616161` (gray)
- romantic: `#D89600` (yellow)
- rival: `#8764B8` (purple)

---

## 6. Core Features — Detailed

### 6.1 Markdown Editor
- **CodeMirror 6** via `@uiw/react-codemirror`
- **4 Custom ViewPlugins** (defined in `useEditor.ts`):
  1. `markdownMarkerPlugin` — Fades `**`, `*`, `#`, `[]` brackets when not hovered (like iA Writer)
  2. `wikiLinkPlugin` — Highlights `[[Name]]` with `.wiki-link` class + faded brackets via `RangeSetBuilder`
  3. `wikiLinkClickHandler` — `domEventHandlers` catching clicks on `.wiki-link`, extracts name, opens Wiki
  4. `typewriterPlugin` — Scrolls viewport to keep cursor vertically centered (only when `typewriterMode` is true)
  5. `characterHighlightPlugin` — Highlights all character names from `contextData` in editor text (accent color + background)
- **Extensions array:**
```ts
[
  highlightActiveLine(),
  search({ top: false }),
  markdownMarkerPlugin,
  wikiLinkPlugin,
  wikiLinkClickHandler,
  characterHighlightPlugin,
  ...(typewriterMode ? [typewriterPlugin] : []),
  ...(showLineNumbers ? [lineNumbers()] : []),
  EditorView.lineWrapping,
]
```
- **Focus mode:** Dims non-active paragraphs to 35% opacity (`Ctrl+Shift+.`)
- **Zen mode:** Hides all chrome except editor (`F11`)
- **Preview mode:** Renders markdown via `marked.parse` + protect/restore code blocks + KaTeX regex injection
- **Auto-save:** Debounced save on every keystroke (~1s delay via `useAutoSave`)

### 6.2 Welcome Screen
Shown when no book is open:
- Hero SVG illustration (two books with a quill)
- Template cards: Novel, Short Story, Screenplay, Non-fiction
- "New Book (.bear)" option
- Recent Books list (from `localStorage.recentBooks`, via `useRecentBooks` hook)
- Open folder / open .bear file options
- Tab navigation: Create vs Open

### 6.3 Mind Map (Interaction Map)
- **SVG canvas** with pan, zoom (wheel), drag characters
- **Bézier curves** connect related characters (cubic curves via `<path>` with `C` command, not straight `<line>`)
- **Groups:** Characters can be grouped; group backgrounds follow members
- **Connect mode:** Click "Connect", select source, then target → pick relation type for both directions
- **Space+drag:** Pan canvas like Figma
- **Ctrl+0 / button:** Fit all nodes to screen (calculates bounding box + centers)
- **Double-click node:** Opens Context Editor for that character

### 6.4 Wiki Panel
- Shows details, properties, notes, and relationships for a context entry
- Relationships displayed as color-coded badges
- "Open Mind Map" button to jump to the map
- Inline relation type editing via `<select>` dropdown

### 6.5 Timeline
- Chronological events with date, end date, date note, label, color
- Link characters/places/items to events
- Color-coded timeline cards

### 6.6 World Building
- Grid of world entries with title, content, category
- Categories are free-form text (e.g., "Geography", "Magic System")

### 6.7 Kanban Board
- Columns with cards
- Cards have title, content (description), and color label
- Color legend bar with editable labels
- Inline add/edit forms (no `inputDialog`)

### 6.8 Notes
- Simple title + content notes
- Created with timestamp

### 6.9 Search
- Full-text search across all chapters AND context entries
- Results grouped by chapter with occurrence count

### 6.10 Versions
- Manual snapshots of entire book folder
- Auto-snapshots at configurable interval (`settings.autoSnapshotMinutes`)
- Restore from any snapshot (replaces current files)
- Rust backend: `save_version_snapshot`, `list_version_snapshots`, `restore_version_snapshot`

### 6.11 Status Bar
- Session timer (resets per chapter)
- Word count for current chapter
- Daily word target progress bar (`settings.sessionTarget`, default 500)
- Streak badge (consecutive days with writing activity) — Flame icon
- "Saved X ago" indicator (auto-updates every 10s)
- Modified indicator
- Current theme, font size, font family

### 6.12 Settings Panel (3 tabs)
- **Appearance:** Theme (light/dark), Language, Line numbers toggle, Typewriter mode toggle, Column width (default/narrow/medium/wide), Auto-save settings
- **Book:** Edit title, author, genre, type, description (only when book is open)
- **About:** Version, update check, tech stack badges, keyboard shortcuts grid

### 6.13 Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New chapter |
| `Ctrl+Shift+O` | New book |
| `Ctrl+O` | Open book folder |
| `Ctrl+S` | Save chapter |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+T` | Cycle theme |
| `Ctrl+Shift+F` | Search |
| `Ctrl+,` | Settings |
| `Ctrl+Shift+.` | Focus mode |
| `Ctrl+Shift+Y` | Typewriter mode |
| `F11` | Zen mode |
| `Ctrl+Z/Y` | Undo/Redo |
| `Space+drag` | Pan mind map |
| `Ctrl+0` | Fit mind map to screen |
| `Escape` | Close palette / panels |

---

## 7. Translation System

```ts
const { t, language, setLanguage } = useTranslation()
t('section.subsection.key')  // e.g., t('context.types.character')
```

### Type-safe keys (B11)
- `scripts/generate-translation-types.ts` parses `en.json` and generates `src/translations/keys.ts`
- Generated union: `export type TranslationKey = 'app.title' | 'app.subtitle' | ...` (273 keys)
- `t()` accepts `TranslationKey | string` — static strings get autocomplete, dynamic concatenation still works
- **Regeneration:** `npx tsx scripts/generate-translation-types.ts`

### Rules
- **ALL UI strings must use `t()`.** No hardcoded English or bracketed prefixes like `[C]`/`[P]`.
- Use `context.typeAbbr.*` keys for abbreviations (e.g. `t('context.typeAbbr.character')` → "Ch")
- Add new keys to **ALL THREE** translation files (en, ru, es) immediately

---

## 8. Editor Internals (CodeMirror)

### Editor CSS critical rules (`src/components/editor/Editor.css`)
- `.editor-container` must be `flex-direction: column` with `min-height: 0`
- `.editor > div` (the @uiw wrapper) must be `flex: 1 1 auto; min-height: 0`
- `.editor .cm-editor` must be `flex: 1 1 auto; min-height: 0` — **DO NOT set `flex-direction: column` here**, it breaks CodeMirror row layout
- `.editor .cm-scroller` must be `flex: 1 1 auto; overflow: auto`
- Focus mode: `.editor.focus-mode .cm-line { opacity: 0.35 }` + `.editor.focus-mode .cm-activeLine { opacity: 1 }`
- Column width classes: `.editor.width-default .cm-content { max-width: 800px }`, `.width-narrow { 60ch }`, `.width-medium { 72ch }`, `.width-wide { 90ch }`

### Custom CSS classes added by plugins
- `.md-faded-marker` — faded markdown syntax markers (opacity 0, hover → 0.4)
- `.wiki-link` — accent-colored underlined text for `[[Name]]`, clickable
- `.char-highlight` — accent color + light background for character names in text

---

## 9. Markdown Pipeline (`src/lib/markdownRender.ts`)

**Architecture:** protect/restore pattern to avoid KaTeX processing inside code blocks.

1. `marked.parse(text, { gfm: true, breaks: true })` → HTML
2. `protectCodeBlocks(html)` — replaces all `<pre><code>...</code></pre>` with `<!--CODEBLOCK_N-->` placeholders, storing originals
3. Apply KaTeX regex:
   - Display math: `$$...$$` → `katex.renderToString(..., { displayMode: true })`
   - Inline math: `$...$` → `katex.renderToString(..., { displayMode: false })`
4. `restoreCodeBlocks(processedHtml, blocks)` — swaps placeholders back to original code blocks

This is robust against `$variable$` in code blocks, which was the main failure mode of the old naive regex approach.

---

## 10. Build & Development

### Commands
```bash
# Frontend only (Vite dev server on port 1420)
npm run dev

# Frontend production build
npm run build

# Tauri development (launches the desktop app)
npm run tauri dev

# Tauri production build (creates installer)
npm run tauri build

# One-click build script (Windows)
.\build.bat
```

### Testing
```bash
# Unit tests (Vitest)
npm run test
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:headed
```

**Important:** When using `npm run tauri dev`, the frontend auto-reloads. Do NOT rebuild manually.

### Build verification rule
**Run `npm run build` after every change.** The build must pass (chunk size warnings are OK, errors are NOT). Also run `cd src-tauri && cargo check` for Rust changes.

### Test mode
```bash
# Creates a temporary book with sample data
app.exe --test
```
In code: `window.__TAURI_INTERNALS__?.testMode` is checked in `App.tsx` useEffect.

---

## 11. Rust Backend

### Commands by module
| Module | Commands |
|--------|----------|
| **window** | `minimize_window`, `maximize_window`, `close_window`, `is_maximized`, `set_always_on_top` |
| **version** | `get_version`, `get_system_fonts` |
| **fs** | `save_binary_file` (atomic write), `create_test_book`, `delete_file` |
| **snapshot** | `save_version_snapshot`, `list_version_snapshots`, `restore_version_snapshot` |
| **bear** | `open_bear`, `save_bear` |
| **pdf** | `generate_pdf` |

### PDF generation (`src-tauri/src/commands/pdf.rs`)
Uses `printpdf` crate. Does NOT use pdfmake (broken in Tauri WebView).

**Cyrillic font support:** `load_font()` function uses `font-kit` to search system fonts in priority order:
1. Segoe UI (Windows)
2. Arial (universal)
3. DejaVu Sans (Linux)
4. Liberation Sans
5. Noto Sans
6. Helvetica Neue (macOS)

Falls back to `BuiltinFont::Helvetica` if none found. The font is embedded into the PDF via `doc.add_external_font()`.

**Parameters:**
- `path: String` — output PDF file path
- `title: String` — book title
- `chapters_json: String` — JSON array of `{ name, code }`
- `toc_label: Option<String>` — localized "Table of Contents" label

**Atomic writes:** PDF and binary files are written to `*.tmp` first, then `fs::rename()` to final path.

### Date handling
`chrono_lite_now()` replaced with `chrono::Local::now().to_rfc3339_opts(...)` — proper RFC 3339 timestamps.

### File permissions (`capabilities/default.json`)
Required: `fs:allow-mkdir`, `fs:allow-create`, `fs:allow-exists`, `fs:allow-remove`, plus `$TEMP/**` in scope.

---

## 12. Testing Infrastructure

### Unit tests (`tests/unit/utils.spec.ts`)
**Framework:** Vitest (configured in `vitest.config.ts`)

| Test group | Cases |
|-----------|-------|
| `extractGroups` | unique groups, noGroupLabel, empty input |
| `findContextEntry` | exact match, case-insensitive, not found, empty array |
| `getWordAtPos` | Latin, Cyrillic, whitespace position |
| `renderMarkdown` | basic markdown→HTML, inline KaTeX, display KaTeX, code block protection, fallback |

**Run:** `npm run test` (16 tests, all passing)

### E2E smoke tests (`tests/e2e/smoke.spec.ts`)
**Framework:** Playwright (configured in `playwright.config.ts`)

- Launches Vite dev server on `:1420` automatically
- Tests: Welcome screen renders without crashing, basic DOM elements visible

**Run:** `npm run test:e2e`

---

## 13. Known Issues & Critical Rules

1. **Modal z-index:** `inputDialog` and `confirmDialog` must be rendered AFTER panels in JSX order, or they may be obscured.
2. **Mind Map coordinates:** Use canvas-relative coordinates for smooth dragging. The `getCanvasCoords` helper in `useMindMap.ts` handles zoom/pan transforms.
3. **SVG z-index:** Mind map nodes (z-index: 2) must be above SVG lines (z-index: 1), which must be above group backgrounds (z-index: 0).
4. **Relation selectors:** Always use inline `<select>` dropdowns for relation types. Do NOT use `inputDialog` for this — it causes UX issues.
5. **i18n completeness:** ALL UI text must use `t('key')`. Add new keys to ALL THREE translation files immediately.
6. **PDF:** Never use pdfmake in the frontend. Always call the Rust `generate_pdf` command.
7. **mkdir before write:** Always call `mkdir(dir, { recursive: true })` before writing files to new directories (Tauri FS requirement).
8. **Button text colors:** Always use CSS variables like `var(--near-white)` instead of hardcoded `white` or `#fff`.
9. **Zustand selectors:** Use primitive selectors or `getState()` inside callbacks. Never create new objects in selectors without `shallow`.
10. **Hook order:** In components that may return `null` early, place ALL hooks BEFORE the early return. React hooks must be called in the same order every render.
11. **Acrylic performance:** The `backdrop-filter: blur(60px)` is applied once on `.app::before`. Do NOT add it to many elements — it kills performance.
12. **CodeMirror flex:** Never set `flex-direction: column` on `.cm-editor`. It breaks CodeMirror's internal row layout.

---

## 14. Improvement Plan Status

### ✅ Completed (all sprints)

| ID | Task | Status |
|----|------|--------|
| B0 | Cleanup dead files & dependencies | ✅ |
| B1 | Refactor: extract panels, hooks, stores | ✅ |
| B2 | Zustand state management (3 stores) | ✅ |
| B3 | Extract business logic into hooks | ✅ |
| B4 | Remove inline styles from App.tsx | ✅ |
| B5 | Markdown pipeline robustness (protect code blocks) | ✅ |
| B6 | Remove `any` types from CodeMirror plugins | ✅ |
| B7 | Rust: chrono, Cyrillic PDF fonts, atomic writes | ✅ |
| B8 | Tests: Vitest unit + Playwright e2e smoke | ✅ |
| B10 | TypeScript strict mode (`strict: true`) | ✅ |
| B11 | Type-safe translation keys (273 keys generated) | ✅ |
| A1 | Lucide icons (zero emoji in UI) | ✅ |
| A3 | Welcome Screen (hero, templates, recent books) | ✅ |
| A4 | Mind Map (groups, anchors, Bézier, Space+drag, fit) | ✅ |
| A5 | Zen + Focus + Typewriter + Column width | ✅ |
| A6 | StatusBar (timer, target, streak, saved-ago) | ✅ |
| A10 | App icon (bear in purple hat) | ✅ |
| A2 | Paper theme (muted warm gray, eye-friendly) | ✅ |

### ❌ Remaining backlog

| ID | Task | Why not done |
|----|------|-------------|
| A4 | Minimap for large mind maps | Complex rendering optimization |
| A5 | Character name syntax highlighting | ✅ Actually done — via `characterHighlightPlugin` |
| B5 | Unified markdown pipeline (remark→rehype) | Current protect/restore pattern is sufficient and simpler |
| B10 | `noUncheckedIndexedAccess: true` | Generates 40+ false positives across the codebase |
| B8 | Full Tauri WebDriver e2e tests | Requires running Tauri binary + WebDriver — complex CI setup |

---

## 15. Dependencies

### Frontend
- react, react-dom (v19)
- @tauri-apps/api, @tauri-apps/plugin-*
- @codemirror/*, @uiw/react-codemirror, codemirror
- zustand
- lucide-react
- docx
- katex
- marked
- tailwindcss, @tailwindcss/postcss, autoprefixer, postcss

### Rust
- tauri
- printpdf
- zip
- font-kit
- chrono

### Dev / Test
- vite, @vitejs/plugin-react
- typescript (`strict: true`)
- vitest (unit tests)
- @vitest/ui
- playwright (e2e tests)

---

## 16. How to Navigate This Codebase

**Start here for specific changes:**

| What you need | Go to |
|---------------|-------|
| Global styles / theme colors | `src/index.css` (`.app.light` / `.app.dark`) |
| Layout structure | `src/App.tsx` |
| New feature panel | `src/components/panels/` + add to `useUIStore` |
| New dialog | `src/components/dialogs/` |
| Editor behavior / plugins | `src/hooks/useEditor.ts` |
| Keyboard shortcuts | `src/hooks/useKeyboardShortcuts.ts` |
| Data types / constants | `src/types/index.ts` |
| Translations | `src/translations/en.json` (then sync to ru/es) |
| Translation key types | `src/translations/keys.ts` (auto-generated) |
| Backend command | `src-tauri/src/commands/` |
| Unit tests | `tests/unit/utils.spec.ts` |
| E2E tests | `tests/e2e/smoke.spec.ts` |

**When in doubt, grep for it.** The codebase is well-organized with descriptive names.
