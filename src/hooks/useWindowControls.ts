import { invoke } from '@tauri-apps/api/core'
import { useUIStore } from '../store/useUIStore'

export function useWindowControls() {
  const setUI = useUIStore((s) => s.set)

  const handleMinimize = () => invoke('minimize_window')

  const handleMaximize = async () => {
    await invoke('maximize_window')
    const isMax = await invoke<boolean>('is_maximized')
    setUI({ isMaximized: isMax })
  }

  const handleClose = () => invoke('close_window')

  const checkIsMaximized = async (): Promise<boolean> => {
    return invoke<boolean>('is_maximized')
  }

  return { handleMinimize, handleMaximize, handleClose, checkIsMaximized }
}