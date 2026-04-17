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

export interface ContextGroup {
  name: string
  type: ContextEntryType
}

export interface Chapter {
  id: string
  name: string
  path: string | null
  code: string
  isModified: boolean
  renaming?: boolean
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

export interface WorldEntry {
  id: string
  title: string
  content: string
  category: string
}

export interface KanbanCard {
  id: string
  title: string
  content: string
  color: string
}

export interface KanbanColumn {
  id: string
  name: string
  cards: KanbanCard[]
}

export interface KanbanBoard {
  columns: KanbanColumn[]
}

export interface TimelineEntry {
  id: string
  date: string
  label: string
  content: string
  characterIds: string[]
  color: string
  notes: string
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
}

export interface BookInstance {
  id: string
  title: string
  dir: string
  bookConfig: BookConfig
  contextData: ContextEntry[]
  contextGroups: ContextGroup[]
  chapters: Chapter[]
  activeChapterId: string | null
  isModified: boolean
  worldData: WorldEntry[]
  kanbanData: KanbanBoard
  notes: Note[]
  timelineData: TimelineEntry[]
}

export type ThemeName = 'galaxy' | 'aurora' | 'forest' | 'obsidian' | 'neon' | 'retro' | 'monochrome'

export interface AppSettings {
  theme: ThemeName
  fontSize: number
  fontFamily: string
  showLineNumbers: boolean
  autoSnapshotMinutes: number
  autoSaveToast: boolean
}

export interface Tooltip {
  name: string
  type: string
  details: Record<string, string>
  x: number
  y: number
}

export interface AppState {
  openBooks: BookInstance[]
  activeBookId: string | null
  sidebarOpen: boolean
  showSettings: boolean
  showContextEditor: boolean
  showBookEditor: boolean
  showBookDialog: boolean
  bookDialogMode: 'open' | 'save'
  showAbout: boolean
  showWiki: boolean
  showMindMap: boolean
  showSearch: boolean
  showVersions: boolean
  isMaximized: boolean
  tooltip: Tooltip | null
  settingsTab: number
  wikiSelected: ContextEntry | null
  wikiEditMode: boolean
  welcomeTab: 'create' | 'open'
  showTemplateSelector: boolean
  searchQuery: string
  mindMapConnectFrom: string | null
  mindMapEditEntry: ContextEntry | null
  showLinkModal: boolean
  showColorPicker: boolean
  colorPickerType: 'color' | 'bgColor'
  mindMapConnectGroupFrom: string | null
  mindMapSelectedGroup: string | null
  mindMapDrag: string | null
  showTimeline: boolean
  showNotes: boolean
  showWorld: boolean
  showKanban: boolean
  mindMapZoom: number
}

export interface VersionSnapshot {
  id: string
  timestamp: string
  label: string
  files: string[]
  word_count: number
  char_count: number
  chapter_count: number
}

export type FormatButtonType = 'wrap' | 'line' | 'block' | 'color' | 'bgColor' | 'align' | 'link' | 'codeblock' | 'sub' | 'sup' | 'sep' | 'fontFamily' | 'fontSize'

export interface FormatButton {
  id: string
  icon: string
  titleKey: string
  type?: FormatButtonType
  value?: string
}

export interface Command {
  name: string
  shortcut: string
  action: () => void
}

export const BOOK_TYPES = ['Novel', 'Novella', 'Short Story', 'Flash Fiction', 'Poetry', 'Non-Fiction', 'Memoir', 'Biography', 'Essay', 'Script', 'Anthology', 'Other'] as const

export const THEME_ORDER: ThemeName[] = ['galaxy', 'aurora', 'forest', 'obsidian', 'neon', 'retro', 'monochrome']

export const THEME_LABELS: Record<ThemeName, string> = {
  galaxy: 'Galaxy',
  aurora: 'Aurora',
  forest: 'Forest',
  obsidian: 'Obsidian',
  neon: 'Neon',
  retro: 'Retro',
  monochrome: 'Mono',
}

export const THEME_ICONS: Record<ThemeName, string> = {
  galaxy: '🌌',
  aurora: '🌿',
  forest: '🌲',
  obsidian: '◼️',
  neon: '💡',
  retro: '📺',
  monochrome: '◑',
}

export const RELATION_COLORS: Record<RelationType, string> = {
  ally: '#38a169',
  enemy: '#e53e3e',
  family: '#3182ce',
  neutral: '#718096',
  romantic: '#d69e2e',
  rival: '#805ad5',
}

export const RELATION_KEYS: RelationType[] = ['ally', 'enemy', 'family', 'neutral', 'romantic', 'rival']

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'galaxy',
  fontSize: 16,
  fontFamily: 'IBM Plex Sans',
  showLineNumbers: true,
  autoSnapshotMinutes: 0,
  autoSaveToast: false,
}

export const CONTEXT_TEMPLATES: Record<ContextEntryType, Record<string, string>> = {
  character: {
    Age: '',
    Gender: '',
    Occupation: '',
    Personality: '',
    Appearance: '',
    Background: '',
    Motivation: '',
    Flaws: '',
    Strengths: '',
    Skills: '',
    Status: 'Alive',
    FirstAppearance: '',
  },
  place: {
    Type: '',
    Location: '',
    Description: '',
    Atmosphere: '',
    Inhabitants: '',
    History: '',
    Significance: '',
    Rules: '',
  },
  date: {
    Year: '',
    Era: '',
    Season: '',
    Description: '',
    Significance: '',
    Events: '',
  },
  item: {
    Type: '',
    Description: '',
    Origin: '',
    Owner: '',
    Significance: '',
    Properties: '',
    Condition: '',
  },
}

export const TEMPLATE_NAMES = Object.keys(CONTEXT_TEMPLATES.character)
