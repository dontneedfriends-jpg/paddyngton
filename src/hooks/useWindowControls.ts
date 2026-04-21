import { invoke } from '@tauri-apps/api/core'

export function useWindowControls() {
  const handleMinimize = () => invoke('minimize_window')

  const handleMaximize = async (): Promise<boolean> => {
    await invoke('maximize_window')
    return invoke<boolean>('is_maximized')
  }

  const handleClose = () => invoke('close_window')

  const checkIsMaximized = async (): Promise<boolean> => {
    return invoke<boolean>('is_maximized')
  }

  return { handleMinimize, handleMaximize, handleClose, checkIsMaximized }
}