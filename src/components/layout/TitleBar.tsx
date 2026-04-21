import React from 'react'
import { Maximize2, Square, X } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useWindowControls } from '../../hooks/useWindowControls'

export const TitleBar: React.FC = () => {
  const ui = useUIStore()
  const bookConfig = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))?.bookConfig
  const { handleMinimize, handleMaximize, handleClose } = useWindowControls()

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-logo">P</div>
      </div>
      <div className="titlebar-center">
        {bookConfig && <span className="book-title">{bookConfig.title}</span>}
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={handleMinimize}>—</button>
        <button className="titlebar-btn" onClick={handleMaximize}>
          {ui.isMaximized ? <Maximize2 size={12} /> : <Square size={12} />}
        </button>
        <button className="titlebar-btn close" onClick={handleClose}>
          ×
        </button>
      </div>
    </div>
  )
}
