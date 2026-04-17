import React, { useRef, useEffect } from 'react'

interface InputDialogProps {
  inputDialog: {
    title: string
    label: string
    defaultValue: string
    multiline?: boolean
    onSubmit: (value: string) => void
  } | null
  onCancel: () => void
}

export const InputDialog: React.FC<InputDialogProps> = ({ inputDialog, onCancel }) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputDialog) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [inputDialog])

  if (!inputDialog) return null

  const handleSubmit = () => {
    const value = (inputRef.current as HTMLInputElement)?.value || (inputRef.current as HTMLTextAreaElement)?.value || ''
    inputDialog.onSubmit(value)
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !inputDialog.multiline) {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="input-dialog" onClick={e => e.stopPropagation()}>
        <div className="input-dialog-title">{inputDialog.title}</div>
        <div className="form-group">
          <label>{inputDialog.label}</label>
          {inputDialog.multiline ? (
            <textarea
              className="form-textarea"
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              defaultValue={inputDialog.defaultValue}
              rows={4}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <input
              type="text"
              className="form-input"
              ref={inputRef as React.RefObject<HTMLInputElement>}
              defaultValue={inputDialog.defaultValue}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          )}
        </div>
        <div className="input-dialog-actions">
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>OK</button>
        </div>
      </div>
    </div>
  )
}
