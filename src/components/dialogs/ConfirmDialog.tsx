import React from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  confirmDialog: { message: string; onConfirm: () => void } | null
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ confirmDialog, onCancel }) => {
  if (!confirmDialog) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-message">{confirmDialog.message}</div>
        <div className="confirm-actions">
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { confirmDialog.onConfirm(); onCancel() }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
