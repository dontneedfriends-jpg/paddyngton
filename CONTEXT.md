# Paddyngton — Project Context

## What is Paddyngton?
A cross-platform desktop application for writing books. Built with Tauri + React + TypeScript + CodeMirror 6.

## Architecture
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Rust (Tauri 2.x)
- **Editor**: CodeMirror 6 with markdown support
- **Build**: Vite 8

## Project Structure
```
paddyngton/
├── src/                    # React frontend
│   ├── App.tsx            # Main component (~2500 lines) - all UI logic
│   ├── index.css          # Styles (~900 lines, 7 themes with light/dark)
│   ├── i18n.tsx          # i18n setup
│   └── translations/      # Language files
│       ├── en.json
│       ├── ru.json
│       └── es.json
├── src-tauri/             # Rust backend
│   ├── src/lib.rs         # Tauri commands
│   └── tauri.conf.json    # App config
├── package.json
├── context-template.json   # Template for new books
└── book-template.json     # Book structure template
```

## Core Features

### Markdown Editor
- CodeMirror 6 with markdown syntax highlighting
- Toolbar with formatting buttons (bold, italic, headers, lists, etc.)
- Line numbers toggle
- Auto-save with configurable interval

### Book Management
- Create/open books as folders
- Each book has `.book.json` config and `.context.json` data
- Import/export Bear app format
- Version snapshots with restore

### Context System (Characters, Places, Items)
- **ContextEntry interface**: name, type (character/place/date/item), details, relations, group, notes, \_x, \_y (for mindmap)
- **Relations**: name, type (ally/enemy/family/neutral/romantic/rival)
- Templates for new entries based on type

### Mind Map (Interaction Map)
- Visual representation of character relationships
- Drag & drop positioning
- SVG lines connecting related characters
- Colors based on relation type:
  - ally: #38a169 (green)
  - enemy: #e53e3e (red)
  - family: #3182ce (blue)
  - neutral: #718096 (gray)
  - romantic: #d69e2e (yellow)
  - rival: #805ad5 (purple)
- Connect mode: select two characters to link with relationship type

### Wiki View
- Display character/place/item details
- Edit properties
- **Relationships section**: shows all relations with color-coded badges
- Edit relation type via dropdown
- Delete relations
- Link to Mind Map

### Timeline
- Events with date, label, color, notes
- Link characters/places/items to events
- Sortable by date
- Color-coded markers and cards

### Notes
- Quick notes panel
- Create/edit/delete notes
- Textarea for content

### World Building
- World entries with category
- Grid view of entries

### Kanban Board
- Columns with cards
- Add/edit/delete columns and cards
- Color-coded cards

### Themes
- 7 presets: galaxy, aurora, forest, obsidian, neon, retro, monochrome
- Each has light + dark variants
- CSS variables for theming

### i18n
- 3 languages: English, Spanish, Russian
- All UI strings use translation keys
- Translation structure:
  - app, header, sidebar, chapter, editor, settings
  - context, wiki, mindmap, search, commands, about
  - format, status, versions, timeline, notes, world, kanban
  - dialogs, toast, export, relations

### About Panel
- Modern gradient design with version display
- Shows current version from built app
- Checks for updates on startup
- Displays "You're up to date" or update button
- Tech stack badges with hover effects
- Keyboard shortcuts grid

### Export
- **DOCX**: Uses `docx` library + native save dialog + Rust command
- **PDF**: Uses Rust `printpdf` crate for generation (no JS callbacks issues)

## Data Format

### .book.json
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "genre": "Genre",
  "bookType": "Novel",
  "description": "Description",
  "createdAt": "ISO date",
  "chapters": [{ "id": "uuid", "name": "Chapter 1", "file": "Chapter 1.md" }]
}
```

### .context.json
```json
{
  "context": [
    {
      "name": "Character Name",
      "type": "character",
      "details": { "Age": "", "Gender": "", ... },
      "relations": [{ "name": "Other", "type": "ally" }],
      "group": "Group Name",
      "notes": "Personal notes..."
    }
  ],
  "timelineData": [{ "id": "", "date": "", "label": "", "content": "", "color": "#e53e3e", "notes": "", "characterIds": [] }],
  "notes": [{ "id": "", "title": "", "content": "", "createdAt": "" }],
  "worldData": [{ "id": "", "title": "", "content": "", "category": "" }],
  "kanbanData": { "columns": [{ "id": "", "name": "", "cards": [{ "id": "", "title": "", "content": "", "color": "" }] }] }
}
```

## Key Components in App.tsx

### Interfaces
- `ContextEntry`: character/place/item context with relations
- `Relation`: { name, type }
- `TimelineEntry`: event with color, notes, linked characters
- `Note`, `WorldEntry`, `KanbanColumn`, `KanbanCard`
- `BookInstance`, `BookConfig`, `Chapter`
- `AppState`: all UI state

### State Management
- `useState` for all state (no external state library)
- `updateActiveBook()` for book data updates
- `saveBookConfig()`, `saveContext()`, `saveAllBookData()`
- Auto-save via `useEffect` with interval

### Translation
- `t()` function from `useTranslation()`
- Direct key access: `t('section.key')`
- Fallback for missing keys

## Build Instructions
```bash
cd paddyngton
npm install
npm run tauri build    # Production build
npm run tauri dev      # Development mode (live reload)
```

**Note:** Don't rebuild automatically when using `npm run tauri dev` - changes reload automatically.
Use `npm run tauri build` only when needed for production.

## Development Notes

### Running Dev Mode
1. Run `npm run dev` in one terminal (this starts Vite on port 1420)
2. In a separate terminal, run `npm run tauri dev` to launch the app

### Permissions (capabilities/default.json)
Required fs permissions for file operations:
- `fs:allow-mkdir`
- `fs:allow-create`
- `fs:allow-exists`
- `fs:allow-remove`
- `$TEMP/**` in fs:scope

## Tauri Commands (src-tauri/src/lib.rs)
- `minimize_window`, `maximize_window`, `close_window`, `is_maximized`
- `set_always_on_top` - for keeping dialogs on top
- `get_version` - returns current app version
- `get_system_fonts`
- `save_version_snapshot`, `list_version_snapshots`, `restore_version_snapshot`
- `open_bear`, `save_bear`
- `save_binary_file` - saves binary file (DOCX, PDF)
- `generate_pdf` - generates PDF using printpdf crate
- `create_test_book` - creates temp book for testing with `--test` flag

## Tauri Updater (Auto-Update)
- Built-in updater plugin checks GitHub Releases for new versions
- Pubkey configured in `tauri.conf.json`
- Endpoint: `https://github.com/dontneedfriends-jpg/paddyngton/releases/latest/download/latest.json`
- UI shows update available / "You're up to date" in About panel
- Users can download and install update with one click

## CI / GitHub Actions
- Auto-builds on push to main branch
- Signs release with `TAURI_SIGNING_PRIVATE_KEY`
- Creates GitHub Release automatically
- Secrets required:
  - `TAURI_SIGNING_PRIVATE_KEY` - private key content
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - key password

## Test Mode
Run app with `--test` flag to auto-create temporary book:
```bash
app.exe --test
```

## Known Issues / Gotchas
1. **Modal z-index**: `inputDialog` and `confirmDialog` must be rendered after panels in JSX
2. **Mind Map drag**: Use canvas-relative coordinates for smooth dragging
3. **SVG z-index**: Mind map nodes (z-index: 2) must be above SVG lines (z-index: 1)
4. **State-based relation selector**: Don't use inputDialog for selecting relation type - use inline dropdown
5. **Translation keys**: All UI text should use `t('key')` - no hardcoded strings
6. **relationLabels removed**: Use `t('relations.' + type)` instead
7. **mkdir required**: Always use `mkdir(dir, { recursive: true })` before writing files to new directories

## File Templates
- `context-template.json`: Template for `.context.json`
- `book-template.json`: Template for `.book.json`

## Dependencies
- **Frontend**: react, @tauri-apps/api, @codemirror/*, @uiw/react-codemirror, docx, katex
- **Backend (Rust)**: tauri, printpdf, zip, font-kit
