import React from 'react'
import { Check, X, Info } from 'lucide-react'

interface ToastProps {
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' ? <Check size={14} /> : toast.type === 'error' ? <X size={14} /> : <Info size={14} />} {toast.message}
    </div>
  )
}
