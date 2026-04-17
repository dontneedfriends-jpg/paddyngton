import React from 'react'

interface ToastProps {
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
    </div>
  )
}
