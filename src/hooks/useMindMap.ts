import { useCallback, useRef, useEffect } from 'react'
import { useBookStore } from '../store/useBookStore'
import { useUIStore } from '../store/useUIStore'

interface DragStart {
  x: number
  y: number
  zoom: number
  panX: number
  panY: number
}

interface PanStart {
  panX: number
  panY: number
  cursorX: number
  cursorY: number
}

export function useMindMap() {
  const mindMapDragRef = useRef<string | null>(null)
  const mindMapDragCursorStart = useRef<DragStart | null>(null)
  const mindMapDragEntryStart = useRef<{ x: number; y: number } | null>(null)
  const mindMapPanRef = useRef<string | null>(null)
  const mindMapPanStart = useRef<PanStart | null>(null)
  const mindMapCanvasRef = useRef<HTMLDivElement>(null)
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spacePressedRef = useRef(false)

  const activeBook = useBookStore((s) => {
    const id = s.activeBookId
    return s.openBooks.find((b) => b.id === id) || null
  })
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)
  const mindMapZoom = useUIStore((s) => s.mindMapZoom)
  const mindMapPanX = useUIStore((s) => s.mindMapPanX)
  const mindMapPanY = useUIStore((s) => s.mindMapPanY)
  const mindMapConnectFrom = useUIStore((s) => s.mindMapConnectFrom)
  const showMindMap = useUIStore((s) => s.showMindMap)

  const contextData = activeBook?.contextData || []

  // Space key tracking
  useEffect(() => {
    if (!showMindMap) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spacePressedRef.current = true
        if (mindMapCanvasRef.current) {
          mindMapCanvasRef.current.style.cursor = 'grab'
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'Digit0') {
        e.preventDefault()
        fitToScreen()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false
        if (mindMapCanvasRef.current) {
          mindMapCanvasRef.current.style.cursor = ''
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      spacePressedRef.current = false
    }
  }, [showMindMap])

  const fitToScreen = useCallback(() => {
    const entries = contextData.filter((e) => e.type === 'character' && e._x != null && e._y != null)
    if (entries.length === 0) {
      useUIStore.getState().set({ mindMapZoom: 1, mindMapPanX: 0, mindMapPanY: 0 })
      return
    }
    const xs = entries.map((e) => e._x!)
    const ys = entries.map((e) => e._y!)
    const minX = Math.min(...xs) - 80
    const maxX = Math.max(...xs) + 80
    const minY = Math.min(...ys) - 50
    const maxY = Math.max(...ys) + 50
    const contentW = maxX - minX
    const contentH = maxY - minY
    const canvas = mindMapCanvasRef.current
    const viewW = canvas ? canvas.clientWidth : 840
    const viewH = canvas ? canvas.clientHeight : 460
    const padding = 40
    const zoomX = (viewW - padding * 2) / contentW
    const zoomY = (viewH - padding * 2) / contentH
    const zoom = Math.min(zoomX, zoomY, 1.5)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const panX = viewW / 2 - centerX * zoom
    const panY = viewH / 2 - centerY * zoom
    useUIStore.getState().set({ mindMapZoom: Math.max(0.2, zoom), mindMapPanX: panX, mindMapPanY: panY })
  }, [contextData])

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      try {
        const canvas = mindMapCanvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const x =
          (e.clientX - rect.left - centerX - mindMapPanX) /
            mindMapZoom +
          420
        const y =
          (e.clientY - rect.top - centerY - mindMapPanY) /
            mindMapZoom +
          230
        if (!isFinite(x) || !isFinite(y)) return { x: 0, y: 0 }
        return { x, y }
      } catch {
        return { x: 0, y: 0 }
      }
    },
    [mindMapZoom, mindMapPanX, mindMapPanY]
  )

  const handleMindMapMouseDown = useCallback(
    (e: React.MouseEvent, entryName: string) => {
      e.stopPropagation()
      if (e.button === 1) return
      if (spacePressedRef.current) {
        // Space+drag on node = pan canvas
        mindMapPanStart.current = {
          panX: mindMapPanX,
          panY: mindMapPanY,
          cursorX: e.clientX,
          cursorY: e.clientY,
        }
        mindMapPanRef.current = 'panning'
        return
      }
      if (mindMapConnectFrom) return
      const existing = contextData.find((c) => c.name === entryName)
      const startX = existing?._x ?? 420
      const startY = existing?._y ?? 230
      const coords = getCanvasCoords(e)
      mindMapDragEntryStart.current = { x: startX, y: startY }
      mindMapDragCursorStart.current = {
        x: coords.x,
        y: coords.y,
        zoom: mindMapZoom,
        panX: mindMapPanX,
        panY: mindMapPanY,
      }
      mindMapDragRef.current = entryName
      mindMapPanRef.current = null
      useUIStore.getState().set({ mindMapDrag: entryName })
    },
    [mindMapConnectFrom, mindMapZoom, mindMapPanX, mindMapPanY, contextData, getCanvasCoords]
  )

  const handleMindMapCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mindMapConnectFrom) return
      if (e.button === 1) return
      if (mindMapDragRef.current) return
      mindMapDragRef.current = null
      mindMapDragCursorStart.current = null
      mindMapDragEntryStart.current = null
      if (e.button === 0 || spacePressedRef.current) {
        mindMapPanStart.current = {
          panX: mindMapPanX,
          panY: mindMapPanY,
          cursorX: e.clientX,
          cursorY: e.clientY,
        }
        mindMapPanRef.current = 'panning'
        if (spacePressedRef.current && mindMapCanvasRef.current) {
          mindMapCanvasRef.current.style.cursor = 'grabbing'
        }
      }
    },
    [mindMapConnectFrom, mindMapPanX, mindMapPanY]
  )

  const handleMindMapMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!activeBook) return
      if (mindMapPanRef.current === 'panning' && mindMapPanStart.current) {
        const start = mindMapPanStart.current
        const dx = e.clientX - start.cursorX
        const dy = e.clientY - start.cursorY
        useUIStore.getState().set({
          mindMapPanX: start.panX + dx,
          mindMapPanY: start.panY + dy,
        })
        return
      }
      if (
        !mindMapDragRef.current ||
        !mindMapDragCursorStart.current ||
        !mindMapDragEntryStart.current
      )
        return
      const start = mindMapDragCursorStart.current
      const zoom = start.zoom
      const panX = start.panX
      const panY = start.panY
      const coords = getCanvasCoords(e)
      if (isNaN(coords.x) || isNaN(coords.y)) return
      const dx = coords.x - start.x
      const dy = coords.y - start.y
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
      const entryName = mindMapDragRef.current
      const currentPos = mindMapDragEntryStart.current
      let newX = currentPos.x + dx
      let newY = currentPos.y + dy
      if (isNaN(newX) || isNaN(newY)) return
      newX = Math.max(0, Math.min(840, newX))
      newY = Math.max(0, Math.min(460, newY))
      const d = activeBook.contextData.map((c) =>
        c.name === entryName
          ? { ...c, _x: Math.round(newX), _y: Math.round(newY) }
          : c
      )
      updateActiveBook({ contextData: d })
      mindMapDragCursorStart.current = {
        x: coords.x,
        y: coords.y,
        zoom,
        panX,
        panY,
      }
      mindMapDragEntryStart.current = { x: newX, y: newY }
    },
    [activeBook, contextData, updateActiveBook, getCanvasCoords]
  )

  const handleMindMapMouseUp = useCallback(() => {
    if (!activeBook) return
    const wasDraggingCharacter = mindMapDragRef.current !== null
    if (wasDraggingCharacter && mindMapDragEntryStart.current) {
      const entryName = mindMapDragRef.current
      const currentPos = mindMapDragEntryStart.current
      if (!isNaN(currentPos.x) && !isNaN(currentPos.y)) {
        const d = activeBook.contextData.map((c) =>
          c.name === entryName
            ? {
                ...c,
                _x: Math.round(currentPos.x),
                _y: Math.round(currentPos.y),
              }
            : c
        )
        updateActiveBook({ contextData: d })
      }
    }
    mindMapDragRef.current = null
    mindMapDragCursorStart.current = null
    mindMapDragEntryStart.current = null
    mindMapPanRef.current = null
    mindMapPanStart.current = null
    if (mindMapCanvasRef.current) {
      mindMapCanvasRef.current.style.cursor = spacePressedRef.current ? 'grab' : ''
    }
    useUIStore.getState().set({ mindMapDrag: null })
  }, [activeBook, updateActiveBook])

  const handleMindMapMouseLeave = useCallback(() => {
    mindMapDragRef.current = null
    mindMapDragCursorStart.current = null
    mindMapDragEntryStart.current = null
    mindMapPanRef.current = null
    mindMapPanStart.current = null
    if (mindMapCanvasRef.current) {
      mindMapCanvasRef.current.style.cursor = ''
    }
  }, [])

  const handleMindMapWheel = useCallback((e: React.WheelEvent) => {
    if (zoomTimeoutRef.current) return
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    zoomTimeoutRef.current = setTimeout(() => {
      zoomTimeoutRef.current = null
    }, 50)
    const state = useUIStore.getState()
    useUIStore.getState().set({
      mindMapZoom: Math.max(0.3, Math.min(2.5, state.mindMapZoom + delta)),
    })
  }, [])

  return {
    mindMapCanvasRef,
    getCanvasCoords,
    handleMindMapMouseDown,
    handleMindMapCanvasMouseDown,
    handleMindMapMouseMove,
    handleMindMapMouseUp,
    handleMindMapMouseLeave,
    handleMindMapWheel,
    fitToScreen,
  }
}
