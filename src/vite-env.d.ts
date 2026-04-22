/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

interface Window {
  __TAURI_INTERNALS__?: {
    testMode?: boolean
    [key: string]: unknown
  }
}
