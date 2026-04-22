import { create } from 'zustand'
import { ContextEntry, RelationType } from '../types'

interface ToastState {
  message: string
  type: 'info' | 'success' | 'error'
}

interface ConfirmDialogState {
  message: string
  onConfirm: () => void
}

interface InputDialogState {
  title: string
  label: string
  defaultValue: string
  multiline?: boolean
  onSubmit: (value: string) => void
}

interface UIState {
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
  tooltip: { name: string; type: string; details: Record<string, string>; x: number; y: number } | null
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
  mindMapPanX: number
  mindMapPanY: number
  showTimeline: boolean
  showNotes: boolean
  showWorld: boolean
  showPreview: boolean
  showKanban: boolean
  mindMapZoom: number
  updateAvailable: string | null
  updateLoading: boolean
  currentVersion: string
  selectedColor: string
  selectedBgColor: string
  linkUrl: string
  pendingRelation: { from: string; to: string } | null
  relationTypeSelect: RelationType
  commandQuery: string
  showCommandPalette: boolean
  toast: ToastState | null
  confirmDialog: ConfirmDialogState | null
  inputDialog: InputDialogState | null
  lastSavedAt: number | null
}

const initialState: UIState = {
  sidebarOpen: true,
  showSettings: false,
  showContextEditor: false,
  showBookEditor: false,
  showBookDialog: false,
  bookDialogMode: 'open',
  showAbout: false,
  showWiki: false,
  showMindMap: false,
  showSearch: false,
  showVersions: false,
  isMaximized: false,
  tooltip: null,
  settingsTab: 0,
  wikiSelected: null,
  wikiEditMode: false,
  welcomeTab: 'create',
  showTemplateSelector: false,
  searchQuery: '',
  mindMapConnectFrom: null,
  mindMapEditEntry: null,
  showLinkModal: false,
  showColorPicker: false,
  colorPickerType: 'color',
  mindMapConnectGroupFrom: null,
  mindMapSelectedGroup: null,
  mindMapDrag: null,
  mindMapPanX: 0,
  mindMapPanY: 0,
  showTimeline: false,
  showNotes: false,
  showWorld: false,
  showPreview: false,
  showKanban: false,
  mindMapZoom: 1,
  updateAvailable: null,
  updateLoading: false,
  currentVersion: '0.0.0',
  selectedColor: '#e53e3e',
  selectedBgColor: '#faf089',
  linkUrl: '',
  pendingRelation: null,
  relationTypeSelect: 'neutral',
  commandQuery: '',
  showCommandPalette: false,
  toast: null,
  confirmDialog: null,
  inputDialog: null,
  lastSavedAt: null,
}

interface UIActions {
  set: (patch: Partial<UIState>) => void
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
  confirmAction: (message: string, onConfirm: () => void) => void
  closeAllPanels: () => void
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,
  set: (patch) => set(patch),
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
  confirmAction: (message, onConfirm) => {
    set({ confirmDialog: { message, onConfirm } })
  },
  closeAllPanels: () =>
    set((s) => ({
      ...s,
      showSettings: false,
      showContextEditor: false,
      showBookEditor: false,
      showAbout: false,
      showWiki: false,
      showMindMap: false,
      showSearch: false,
      showVersions: false,
      showTimeline: false,
      showNotes: false,
      showWorld: false,
      showKanban: false,
      mindMapConnectFrom: null,
    })),
}))