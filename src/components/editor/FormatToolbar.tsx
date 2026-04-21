import React from 'react'
import { Eye } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useEditor } from '../../hooks/useEditor'
import { FORMAT_BUTTONS } from '../../constants'
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Code, Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Type, Paintbrush, Highlighter,
  Subscript, Superscript,
} from 'lucide-react'

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

interface FormatToolbarProps {
  systemFonts: string[]
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({ systemFonts }) => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const editor = useEditor()

  return (
    <div className="format-toolbar">
      <input
        ref={editor.colorInputRef}
        type="color"
        style={{ display: 'none' }}
        value={ui.selectedColor}
        onChange={(e) => setUI({ selectedColor: e.target.value })}
        onBlur={(e) => editor.handleColor(e.target.value, false)}
      />
      <input
        ref={editor.bgColorInputRef}
        type="color"
        style={{ display: 'none' }}
        value={ui.selectedBgColor}
        onChange={(e) => setUI({ selectedBgColor: e.target.value })}
        onBlur={(e) => editor.handleColor(e.target.value, true)}
      />
      {FORMAT_BUTTONS.map((btn) => {
        if (btn.type === 'sep') return <span key={btn.id} className="format-sep" />
        const style: React.CSSProperties = {}
        if (btn.id === 'bold') style.fontWeight = 700
        else if (btn.id === 'italic') style.fontStyle = 'italic'
        else if (btn.id === 'underline') style.textDecoration = 'underline'
        else if (btn.id === 'strike') style.textDecoration = 'line-through'
        if (btn.type === 'fontFamily') {
          return (
            <select
              key={btn.id}
              className="format-font-select"
              title={t(btn.titleKey) || ''}
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            >
              {systemFonts.slice(0, 50).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )
        }
        if (btn.type === 'fontSize') {
          return (
            <div key={btn.id} className="format-font-size-wrap" title={t(btn.titleKey) || ''}>
              <span className="format-font-size-label">T</span>
              <input
                type="range"
                className="format-font-size"
                min="10"
                max="36"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              />
            </div>
          )
        }
        return (
          <button
            key={btn.id}
            className={`format-btn ${btn.id === 'color' ? 'format-btn-color' : ''} ${btn.id === 'bgColor' ? 'format-btn-bgcolor' : ''}`}
            title={t(btn.titleKey) || ''}
            onClick={() => editor.handleFormat(btn)}
            style={style}
          >
            {formatIconComponents[btn.id] ? React.createElement(formatIconComponents[btn.id], { size: 14 }) : btn.icon}
            {btn.id === 'color' && <span className="format-color-swatch" style={{ background: ui.selectedColor }} />}
            {btn.id === 'bgColor' && <span className="format-color-swatch" style={{ background: ui.selectedBgColor }} />}
          </button>
        )
      })}
      <span className="format-sep" />
      <button
        className={`format-btn format-btn-preview ${ui.showPreview ? 'active' : ''}`}
        title="Toggle Preview Mode"
        onClick={() => setUI({ showPreview: !ui.showPreview })}
      >
        <Eye size={16} />
      </button>
    </div>
  )
}
