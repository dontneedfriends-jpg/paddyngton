import React, { useState, useCallback } from 'react'
import './MindMapCanvas.css'
import { X, Link, User, BookMarked, Maximize } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useMindMap } from '../../hooks/useMindMap'
import { RELATION_COLORS, CONTEXT_TEMPLATES } from '../../types'

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1
  const offset = Math.abs(dx) * 0.35
  const cx1 = x1 + (dx > 0 ? offset : -offset)
  const cy1 = y1
  const cx2 = x2 - (dx > 0 ? offset : -offset)
  const cy2 = y2
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

function getNodeEdgePoint(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return from
  const angle = Math.atan2(dy, dx)
  const hw = 60
  const hh = 20
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const tx = Math.abs(hw / (Math.abs(cos) < 0.001 ? 0.001 : cos))
  const ty = Math.abs(hh / (Math.abs(sin) < 0.001 ? 0.001 : sin))
  const t = Math.min(tx, ty)
  return { x: from.x + cos * t, y: from.y + sin * t }
}

export const MindMapCanvas: React.FC = () => {
  const { t } = useTranslation()
  const ui = useUIStore()
  const setUI = useUIStore((s) => s.set)
  const confirmAction = useUIStore((s) => s.confirmAction)
  const activeBook = useBookStore((s) => s.openBooks.find((b) => b.id === s.activeBookId))
  const updateActiveBook = useBookStore((s) => s.updateActiveBook)

  const [pendingRelation, setPendingRelation] = useState<{ from: string; to: string } | null>(null)
  const [relationTypeForward, setRelationTypeForward] = useState<keyof typeof RELATION_COLORS>('neutral')
  const [relationTypeBackward, setRelationTypeBackward] = useState<keyof typeof RELATION_COLORS>('neutral')

  const {
    mindMapCanvasRef,
    handleMindMapMouseDown,
    handleMindMapCanvasMouseDown,
    handleMindMapMouseMove,
    handleMindMapMouseUp,
    handleMindMapWheel,
    fitToScreen,
  } = useMindMap()

  const contextData = activeBook?.contextData || []
  const mindMapEntries = contextData.filter((e) => e.type === 'character')

  const handleAddCharacter = useCallback(() => {
    setUI({
      inputDialog: {
        title: t('mindmap.addCharacter'),
        label: t('mindmap.enterName'),
        defaultValue: '',
        onSubmit: (name) => {
          if (name && name.trim()) {
            const details: Record<string, string> = {}
            Object.keys(CONTEXT_TEMPLATES.character).forEach((k) => {
              details[k] = ''
            })
            updateActiveBook({
              contextData: [
                ...contextData,
                {
                  name: name.trim(),
                  type: 'character',
                  details,
                  relations: [],
                  group: '',
                  notes: '',
                },
              ],
            })
          }
        },
      },
    })
  }, [contextData, updateActiveBook, setUI, t])

  if (!ui.showMindMap) return null

  const cx = 450
  const cy = 250
  const r = 200

  const groups = [...new Map(mindMapEntries.map((e) => [e.group || t('context.noGroup'), e.group || t('context.noGroup')])).keys()]
  const gc = groups.length || 1

  const groupPositions: Record<string, { x: number; y: number }> = {}
  groups.forEach((g, gi) => {
    const angle = (gi / gc) * Math.PI * 2 - Math.PI / 2
    groupPositions[g] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const memberPositions: Record<string, { x: number; y: number }> = {}
  groups.forEach((g) => {
    const members = mindMapEntries.filter((e) => (e.group || t('context.noGroup')) === g)
    const gp = groupPositions[g]
    members.forEach((e, mi) => {
      if (e._x !== undefined && e._y !== undefined) {
        memberPositions[e.name] = { x: e._x, y: e._y }
      } else {
        const ma = members.length > 1 ? (mi / members.length) * Math.PI * 2 : 0
        const mr = members.length > 1 ? 70 : 0
        memberPositions[e.name] = {
          x: gp.x + mr * Math.cos(ma - Math.PI / 2),
          y: gp.y + mr * Math.sin(ma - Math.PI / 2),
        }
      }
    })
  })

  const groupBounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }> = {}
  groups.forEach((g) => {
    const members = mindMapEntries.filter((e) => (e.group || t('context.noGroup')) === g)
    if (members.length === 0) return
    const nodeLefts = members.map((e) => (memberPositions[e.name]?.x ?? 0) - 60)
    const nodeTops = members.map((e) => (memberPositions[e.name]?.y ?? 0) - 20)
    const nodeRights = members.map((e) => (memberPositions[e.name]?.x ?? 0) + 110)
    const nodeBottoms = members.map((e) => (memberPositions[e.name]?.y ?? 0) + 35)
    const minX = Math.min(...nodeLefts)
    const maxX = Math.max(...nodeRights)
    const minY = Math.min(...nodeTops)
    const maxY = Math.max(...nodeBottoms)
    const margin = 20
    groupBounds[g] = {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin - 26,
      maxY: maxY + margin,
      width: Math.max(maxX + margin - (minX - margin), 160),
      height: Math.max(maxY + margin - (minY - margin - 26), 90),
    }
  })

  return (
    <div className="modal-overlay" onClick={() => setUI({ showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null })}>
      <div className="mindmap-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2><BookMarked size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />{t('mindmap.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={handleAddCharacter}>
              {t('mindmap.addCharacter')}
            </button>
            {ui.mindMapConnectFrom ? (
              <button className="btn btn-sm btn-warning" onClick={() => setUI({ mindMapConnectFrom: null })}>
                <X size={14} /> {t('mindmap.disconnectMode')}
              </button>
            ) : (
              <button className="btn btn-sm btn-secondary" onClick={() => setUI({ mindMapConnectFrom: '__start__' })}>
                <Link size={14} /> {t('mindmap.connectMode')}
              </button>
            )}
            <button className="btn-icon" onClick={fitToScreen} title={t('mindmap.fitToScreen')}>
              <Maximize size={16} />
            </button>
            <button className="btn-icon" onClick={() => setUI({ showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null })}>
              <X size={16} />
            </button>
          </div>
        </div>

        {pendingRelation && (
          <div className="mindmap-pending-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="mindmap-pending-label">
                {pendingRelation.from} → {pendingRelation.to}
              </span>
              <select
                className="mindmap-pending-select"
                value={relationTypeForward}
                onChange={(e) => setRelationTypeForward(e.target.value as keyof typeof RELATION_COLORS)}
              >
                <option value="ally">{t('relations.friendly')}</option>
                <option value="family">{t('relations.family')}</option>
                <option value="romantic">{t('relations.romantic')}</option>
                <option value="neutral">{t('relations.neutral')}</option>
                <option value="rival">{t('relations.rival')}</option>
                <option value="enemy">{t('relations.hostile')}</option>
              </select>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>|</span>
              <span className="mindmap-pending-label">
                {pendingRelation.to} → {pendingRelation.from}
              </span>
              <select
                className="mindmap-pending-select"
                value={relationTypeBackward}
                onChange={(e) => setRelationTypeBackward(e.target.value as keyof typeof RELATION_COLORS)}
              >
                <option value="ally">{t('relations.friendly')}</option>
                <option value="family">{t('relations.family')}</option>
                <option value="romantic">{t('relations.romantic')}</option>
                <option value="neutral">{t('relations.neutral')}</option>
                <option value="rival">{t('relations.rival')}</option>
                <option value="enemy">{t('relations.hostile')}</option>
              </select>
            </div>
            <div className="mindmap-pending-actions">
              <button
                className="mindmap-pending-btn primary"
                onClick={() => {
                  const newD = contextData.map((e) => {
                    if (e.name === pendingRelation.from && !e.relations?.find((r) => r.name === pendingRelation.to)) {
                      return { ...e, relations: [...(e.relations || []), { name: pendingRelation.to, type: relationTypeForward }] }
                    }
                    if (e.name === pendingRelation.to && !e.relations?.find((r) => r.name === pendingRelation.from)) {
                      return { ...e, relations: [...(e.relations || []), { name: pendingRelation.from, type: relationTypeBackward }] }
                    }
                    return e
                  })
                  updateActiveBook({ contextData: newD })
                  setPendingRelation(null)
                }}
              >
                {t('dialogs.confirm')}
              </button>
              <button
                className="mindmap-pending-btn ghost"
                onClick={() => setPendingRelation(null)}
              >
                {t('dialogs.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="mindmap-toolbar">
          <span className="mindmap-toolbar-info">
            {mindMapEntries.length} {t('mindmap.characters')}
          </span>
          {(() => {
            const groupList = [...new Set(mindMapEntries.map((e) => e.group || t('context.noGroup')))]
            return groupList.length > 1 ? (
              <span className="mindmap-toolbar-info" style={{ color: 'var(--accent)' }}>{groupList.length} groups</span>
            ) : null
          })()}
          {ui.mindMapConnectFrom && ui.mindMapConnectFrom !== '__start__' && (
            <span className="mindmap-toolbar-status">{t('mindmap.connectionFrom')}</span>
          )}
        </div>

        <div
          className="mindmap-canvas"
          ref={mindMapCanvasRef}
          style={{ cursor: ui.mindMapDrag ? 'grabbing' : 'grab' }}
          onMouseMove={handleMindMapMouseMove}
          onMouseLeave={handleMindMapMouseUp}
          onMouseDown={handleMindMapCanvasMouseDown}
          onMouseUp={handleMindMapMouseUp}
          onWheel={handleMindMapWheel}
        >
          <div
            className="mindmap-canvas-inner"
            style={{
              transform: `translate(${ui.mindMapPanX}px, ${ui.mindMapPanY}px)`,
            }}
          >
            <div className="mindmap-world">
              {mindMapEntries.length === 0 && (
                <div className="mindmap-empty">
                  {t('mindmap.noCharacters')}
                  <button className="btn btn-primary btn-sm" onClick={handleAddCharacter}>
                    {t('mindmap.addCharacter')}
                  </button>
                </div>
              )}

              {mindMapEntries.length > 0 && (
                <>
                  <svg className="mindmap-svg-layer">
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--cool-gray)" />
                      </marker>
                    </defs>
                    {mindMapEntries.flatMap((entry) =>
                      (entry.relations || []).map((rel, ri) => {
                        const targetEntry = mindMapEntries.find((e) => e.name === rel.name)
                        if (!targetEntry) return null
                        const p1 = memberPositions[entry.name]
                        const p2 = memberPositions[rel.name]
                        if (!p1 || !p2) return null
                        const isActive = ui.mindMapConnectFrom === entry.name || ui.mindMapConnectFrom === rel.name
                        const color = isActive ? 'var(--accent)' : RELATION_COLORS[rel.type]
                        const e1 = getNodeEdgePoint(p1, p2)
                        const e2 = getNodeEdgePoint(p2, p1)
                        // Check if reverse relation exists for offset
                        const hasReverse = targetEntry.relations?.some((r) => r.name === entry.name)
                        let ox = 0, oy = 0
                        if (hasReverse) {
                          const dx = e2.x - e1.x
                          const dy = e2.y - e1.y
                          const dist = Math.sqrt(dx * dx + dy * dy)
                          if (dist > 1) {
                            const perpX = -dy / dist
                            const perpY = dx / dist
                            ox = perpX * 3
                            oy = perpY * 3
                          }
                        }
                        const pathD = getBezierPath(e1.x + ox, e1.y + oy, e2.x + ox, e2.y + oy)
                        const isDashed = rel.type === 'enemy' || rel.type === 'rival'
                        return (
                          <path
                            key={`${entry.name}-${rel.name}-${ri}`}
                            d={pathD}
                            stroke={color}
                            strokeWidth={isActive ? 2.5 : 2}
                            opacity={isActive ? 1 : 0.55}
                            strokeDasharray={isDashed ? '6 3' : undefined}
                            markerEnd="url(#arrowhead)"
                            fill="none"
                            className={!isDashed ? 'mindmap-line' : ''}
                          />
                        )
                      })
                    )}
                  </svg>

                <div className="mindmap-groups-layer">
                  {groups.map((g) => {
                    const b = groupBounds[g]
                    if (!b) return null
                    return (
                      <div key={`bg-${g}`}>
                        <div
                          className="mindmap-group-bg"
                          style={{
                            left: b.minX,
                            top: b.minY,
                            width: b.width,
                            height: b.height,
                          }}
                        />
                        <div
                          className="mindmap-group-label"
                          style={{ left: b.minX + 12, top: b.minY + 8 }}
                        >
                          {g}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mindmap-nodes-layer">
                  {groups.map((g) => {
                    const members = mindMapEntries.filter((e) => (e.group || t('context.noGroup')) === g)
                    return (
                      <div key={g}>
                        {members.map((entry) => {
                          const mp = memberPositions[entry.name]
                          const isConnectFrom = ui.mindMapConnectFrom === entry.name
                          const isConnectTarget = ui.mindMapConnectFrom && ui.mindMapConnectFrom !== '__start__' && ui.mindMapConnectFrom !== entry.name
                          const isDragging = ui.mindMapDrag === entry.name
                          return (
                            <div
                              key={entry.name}
                              className={`mindmap-node ${isConnectFrom ? 'connecting' : isConnectTarget ? 'target' : ''} ${isDragging ? 'dragging' : ''}`}
                              style={{
                                left: mp.x - 60,
                                top: mp.y - 20,
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleMindMapMouseDown(e, entry.name)
                              }}
                              onClick={() => {
                                if (ui.mindMapDrag) return
                                if (ui.mindMapConnectFrom === '__start__') {
                                  setUI({ mindMapConnectFrom: entry.name })
                                } else if (ui.mindMapConnectFrom && ui.mindMapConnectFrom !== entry.name) {
                                  const fromName = ui.mindMapConnectFrom
                                  const fromEntry = contextData.find((e) => e.name === fromName)
                                  const toEntry = contextData.find((e) => e.name === entry.name)
                                  if (fromEntry && toEntry && !fromEntry.relations?.find((r) => r.name === entry.name)) {
                                    setPendingRelation({ from: fromName, to: entry.name })
                                    setRelationTypeForward('neutral')
                                    setRelationTypeBackward('neutral')
                                  }
                                  setUI({ mindMapConnectFrom: null })
                                }
                              }}
                              onDoubleClick={() => {
                                setUI({ mindMapEditEntry: entry, showContextEditor: true, showMindMap: false })
                              }}
                            >
                              <span className="mindmap-node-icon">
                                <User size={14} />
                              </span>
                              <span className="mindmap-node-name">{entry.name}</span>
                              {(entry.relations?.length ?? 0) > 0 && (
                                <span className="mindmap-node-relations">{entry.relations!.length}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        {mindMapEntries.length > 0 && (
          <div className="mindmap-relations-list">
            <div className="mindmap-relations-header">{t('mindmap.connections')}</div>
            {(() => {
              const rels: {
                from: string
                to: string
                toName: string
                fromGroup: string
                toGroup: string
                type: 'ally' | 'enemy' | 'family' | 'neutral' | 'romantic' | 'rival'
              }[] = []
              mindMapEntries.forEach((e) => {
                ;(e.relations || []).forEach((r) => {
                  const toEntry = mindMapEntries.find((me) => me.name === r.name)
                  if (toEntry) {
                    rels.push({
                      from: e.name,
                      to: r.name,
                      toName: r.name,
                      fromGroup: e.group || t('context.noGroup'),
                      toGroup: toEntry.group || t('context.noGroup'),
                      type: r.type,
                    })
                  }
                })
              })
              return rels.length === 0 ? (
                <div className="mindmap-no-relations">{t('mindmap.noConnections')}</div>
              ) : (
                rels.map((rel, i) => (
                  <div key={i} className="mindmap-relation-row">
                    <span className="mindmap-relation-dot" style={{ background: RELATION_COLORS[rel.type] }} />
                    <span className="mindmap-rel-group">{rel.fromGroup}</span>
                    <span className="mindmap-relation-name">{rel.from}</span>
                    <span className="mindmap-relation-arrow">→</span>
                    <span className="mindmap-relation-name">{rel.to}</span>
                    <span className="mindmap-rel-group">{rel.toGroup}</span>
                    <span className="mindmap-relation-type" style={{ color: RELATION_COLORS[rel.type] }}>
                      {t('relations.' + rel.type)}
                    </span>
                    <button
                      className="mindmap-relation-delete"
                      onClick={() => {
                        confirmAction(t('dialogs.confirmDelete'), () => {
                          const d = [...contextData]
                          const from = d.find((e) => e.name === rel.from)
                          if (from?.relations) from.relations = from.relations.filter((r) => r.name !== rel.to)
                          updateActiveBook({ contextData: d })
                        })
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
