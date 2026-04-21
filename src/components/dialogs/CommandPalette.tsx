import React, { useMemo } from 'react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useBookManager } from '../../hooks/useBookManager'

interface CommandPaletteProps {
  inputRef: React.RefObject<HTMLInputElement | null>
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ inputRef }) => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const cycleTheme = useSettingsStore((s) => s.cycleTheme)
  const bookManager = useBookManager(t)

  const commands = useMemo(
    () => [
      { name: t('commands.newBook'), shortcut: 'Ctrl+N', action: () => bookManager.createNewBook() },
      { name: t('commands.openBook'), shortcut: 'Ctrl+O', action: () => setUI({ showBookDialog: true, bookDialogMode: 'open' }) },
      { name: t('commands.saveChapter'), shortcut: 'Ctrl+S', action: () => bookManager.saveChapter() },
      { name: 'Save Book As...', shortcut: '', action: () => setUI({ showBookDialog: true, bookDialogMode: 'save' }) },
      { name: t('commands.newChapter'), shortcut: 'Ctrl+Shift+N', action: () => bookManager.addChapter() },
      { name: t('commands.toggleSidebar'), shortcut: 'Ctrl+B', action: () => setUI({ sidebarOpen: !ui.sidebarOpen }) },
      { name: t('commands.toggleTheme'), shortcut: 'Ctrl+T', action: () => cycleTheme() },
      { name: t('commands.editBookInfo'), shortcut: '', action: () => setUI({ showSettings: true, settingsTab: 1 }) },
      { name: t('commands.editContext'), shortcut: '', action: () => setUI({ showContextEditor: true }) },
      { name: t('commands.wiki'), shortcut: '', action: () => setUI({ showWiki: true }) },
      { name: t('commands.mindMap'), shortcut: '', action: () => setUI({ showMindMap: true }) },
      { name: t('commands.search'), shortcut: 'Ctrl+Shift+F', action: () => setUI({ showSearch: true, searchQuery: '' }) },
      { name: 'Version History', shortcut: '', action: () => setUI({ showVersions: true }) },
      { name: t('commands.settings'), shortcut: 'Ctrl+,', action: () => setUI({ showSettings: true }) },
    ],
    [t, setUI, cycleTheme, bookManager, ui.sidebarOpen]
  )

  const filteredCommands = commands.filter((cmd) => cmd.name.toLowerCase().includes(ui.commandQuery.toLowerCase()))

  if (!ui.showCommandPalette) return null

  return (
    <div className="modal-overlay" onClick={() => setUI({ showCommandPalette: false })}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder={t('commands.title') + '...'}
            value={ui.commandQuery}
            onChange={(e) => setUI({ commandQuery: e.target.value })}
          />
        </div>
        <div className="command-list">
          {filteredCommands.map((cmd, i) => (
            <div
              key={i}
              className="command-item"
              onClick={() => {
                cmd.action()
                setUI({ showCommandPalette: false })
              }}
            >
              <div className="command-icon">{cmd.name[0]}</div>
              <span>{cmd.name}</span>
              {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
