import React, { useState, useCallback } from 'react'
import { X, Link, User, BookMarked, FileText, Scissors, RotateCcw, BookOpen } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useUIStore } from '../../store/useUIStore'
import { useBookStore } from '../../store/useBookStore'
import { useMindMap } from '../../hooks/useMindMap'
import { RELATION_COLORS, CONTEXT_TEMPLATES } from '../../types'

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
  const [relationTypeSelect, setRelationTypeSelect] = useState<keyof typeof RELATION_COLORS>('neutral')

  const {
    mindMapCanvasRef,
    handleMindMapMouseDown,
    handleMindMapCanvasMouseDown,
    handleMindMapMouseMove,
    handleMindMapMouseUp,
    handleMindMapWheel,
  } = useMindMap()

  const contextData = activeBook?.contextData || []
  const bookConfig = activeBook?.bookConfig || null
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

  const cx = 420
  const cy = 230
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
    const nodeRights = members.map((e) => (memberPositions[e.name]?.x ?? 0) + 100)
    const nodeBottoms = members.map((e) => (memberPositions[e.name]?.y ?? 0) + 35)
    const minX = Math.min(...nodeLefts)
    const maxX = Math.max(...nodeRights)
    const minY = Math.min(...nodeTops)
    const maxY = Math.max(...nodeBottoms)
    const margin = 18
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
      <div className="mindmap-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="panel-header">
          <h2>[Map] {t('mindmap.title')}</h2>
          <div className="panel-header-actions">
            <button className="btn btn-sm" onClick={handleAddCharacter}>
              [+] {t('mindmap.addCharacter')}
            </button>
            {ui.mindMapConnectFrom ? (
              <button className="btn btn-sm btn-warning" onClick={() => setUI({ mindMapConnectFrom: null })}>
                <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t('mindmap.disconnectMode')}
              </button>
            ) : (
              <button className="btn btn-sm btn-secondary" onClick={() => setUI({ mindMapConnectFrom: '__start__' })}>
                <Link size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t('mindmap.connectMode')}
              </button>
            )}
            <button className="btn-icon" onClick={() => setUI({ showMindMap: false, mindMapConnectFrom: null, mindMapConnectGroupFrom: null })}>
              ×
            </button>
          </div>
        </div>

        {pendingRelation && (
          <div style={{ padding: '12px 16px', background: 'var(--accent)', color: 'var(--near-white)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {pendingRelation.from} → {pendingRelation.to}
            </span>
            <select
              value={relationTypeSelect}
              onChange={(e) => setRelationTypeSelect(e.target.value as keyof typeof RELATION_COLORS)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value="ally" style={{ color: 'var(--success)' }}>[Ally] {t('relations.friendly')}</option>
              <option value="family" style={{ color: 'var(--accent)' }}>[Family] {t('relations.family')}</option>
              <option value="romantic" style={{ color: 'var(--purple)' }}>[Love] {t('relations.romantic')}</option>
              <option value="neutral" style={{ color: 'var(--cool-gray)' }}>[Neutral] {t('relations.neutral')}</option>
              <option value="rival" style={{ color: 'var(--purple)' }}>[Rival] {t('relations.rival')}</option>
              <option value="enemy" style={{ color: 'var(--danger)' }}>[Enemy] {t('relations.hostile')}</option>
            </select>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--near-white)', border: 'none' }}
              onClick={() => {
                const newD = contextData.map((e) =>
                  e.name === pendingRelation.from && !e.relations?.find((r) => r.name === pendingRelation.to)
                    ? { ...e, relations: [...(e.relations || []), { name: pendingRelation.to, type: relationTypeSelect }] }
                    : e
                )
                updateActiveBook({ contextData: newD })
                setPendingRelation(null)
              }}
            >
              Add Connection
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--near-white)', border: 'none' }}
              onClick={() => setPendingRelation(null)}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="mindmap-toolbar">
          <span style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>
            {mindMapEntries.length} {t('mindmap.characters')}
          </span>
          {(() => {
            const groupList = [...new Set(mindMapEntries.map((e) => e.group || t('context.noGroup')))]
            return groupList.length > 1 ? (
              <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{groupList.length} groups</span>
            ) : null
          })()}
          {ui.mindMapConnectFrom && ui.mindMapConnectFrom !== '__start__' && (
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{t('mindmap.connectionFrom')}</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setUI({ mindMapZoom: Math.max(0.3, ui.mindMapZoom - 0.1) })}
            >
              −
            </button>
            <span style={{ fontSize: '11px', color: 'var(--cool-gray)', minWidth: '36px', textAlign: 'center' }}>
              {Math.round(ui.mindMapZoom * 100)}%
            </span>
            <button
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setUI({ mindMapZoom: Math.min(2.5, ui.mindMapZoom + 0.1) })}
            >
              +
            </button>
          </div>
        </div>

        <div
          className="mindmap-canvas"
          ref={mindMapCanvasRef}
          style={{ position: 'relative', minHeight: '450px', overflow: 'hidden', cursor: ui.mindMapDrag ? 'grabbing' : 'default' }}
          onMouseMove={handleMindMapMouseMove}
          onMouseLeave={handleMindMapMouseUp}
          onMouseDown={handleMindMapCanvasMouseDown}
          onMouseUp={handleMindMapMouseUp}
          onWheel={handleMindMapWheel}
        >
          <div
            className="mindmap-canvas-inner"
            style={{
              transform: `translate(${ui.mindMapPanX}px, ${ui.mindMapPanY}px) scale(${ui.mindMapZoom})`,
              transformOrigin: 'center',
              transition: ui.mindMapDrag ? 'none' : 'transform 0.15s ease',
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: '-420px',
              marginTop: '-230px',
            }}
          >
            <div style={{ width: '840px', height: '460px', position: 'relative' }}>
              {mindMapEntries.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cool-gray)',
                    fontSize: '14px',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {t('mindmap.noCharacters')}
                  <button className="btn btn-primary btn-sm" onClick={handleAddCharacter}>
                    [+] {t('mindmap.addCharacter')}
                  </button>
                </div>
              )}

              {mindMapEntries.length > 0 && (
                <>
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    {mindMapEntries.flatMap((entry, i) =>
                      (entry.relations || []).map((rel) => {
                        const j = mindMapEntries.findIndex((e) => e.name === rel.name)
                        if (j <= i) return null
                        const p1 = memberPositions[entry.name]
                        const p2 = memberPositions[rel.name]
                        if (!p1 || !p2) return null
                        const sameGroup =
                          (entry.group || t('context.noGroup')) === (mindMapEntries[j].group || t('context.noGroup'))
                        const isActive = ui.mindMapConnectFrom === entry.name || ui.mindMapConnectFrom === rel.name
                        const color = isActive ? 'var(--accent)' : RELATION_COLORS[rel.type]
                        const e1 = getNodeEdgePoint(p1, p2)
                        const e2 = getNodeEdgePoint(p2, p1)
                        return (
                          <line
                            key={`${i}-${j}`}
                            x1={e1.x}
                            y1={e1.y}
                            x2={e2.x}
                            y2={e2.y}
                            stroke={color}
                            strokeWidth={isActive ? 2.5 : 2}
                            opacity={isActive ? 1 : sameGroup ? 0.6 : 0.4}
                            strokeDasharray={rel.type === 'enemy' || rel.type === 'rival' ? '6 3' : '0'}
                          />
                        )
                      })
                    )}
                  </svg>
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    {/* Group backgrounds & labels */}
                    {groups.map((g) => {
                      const b = groupBounds[g]
                      if (!b) return null
                      return (
                        <div key={`bg-${g}`}>
                          <div
                            style={{
                              position: 'absolute',
                              left: b.minX,
                              top: b.minY,
                              width: b.width,
                              height: b.height,
                              background: 'var(--accent)',
                              opacity: 0.08,
                              borderRadius: '16px',
                              border: '2px dashed var(--accent)',
                              zIndex: 0,
                            }}
                          />
                          <div className="mindmap-group-label" style={{ position: 'absolute', left: b.minX + 10, top: b.minY + 6, zIndex: 1 }}>
                            {g}
                          </div>
                        </div>
                      )
                    })}
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
                                  cursor: ui.mindMapDrag ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
                                  zIndex: isDragging ? 100 : 2,
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
                                      setRelationTypeSelect('neutral')
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
                    <div className="mindmap-node center-node" style={{ left: cx - 60, top: cy - 20, cursor: 'default', zIndex: 2 }}>
                      <span>
                        <BookMarked size={14} />
                      </span>
                      <span>{bookConfig?.title || 'Book'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {mindMapEntries.length > 0 && (
          <div
            className="mindmap-relations-list"
            style={{ borderTop: '1px solid var(--border-gray)', padding: '8px 16px', maxHeight: '140px', overflowY: 'auto' }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--cool-gray)',
                marginBottom: '4px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t('mindmap.connections')}
            </div>
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
                  if (
                    toEntry &&
                    mindMapEntries.findIndex((me) => me.name === r.name) > mindMapEntries.findIndex((me) => me.name === e.name)
                  ) {
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
                <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>{t('mindmap.noConnections')}</div>
              ) : (
                rels.map((rel, i) => (
                  <div
                    key={i}
                    className="mindmap-relation-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '2px 0' }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: RELATION_COLORS[rel.type], flexShrink: 0 }} />
                    <span className="mindmap-rel-group">{rel.fromGroup}</span>
                    <span style={{ fontWeight: 600 }}>{rel.from}</span>
                    <span style={{ color: 'var(--accent)' }}>→</span>
                    <span style={{ fontWeight: 600 }}>{rel.to}</span>
                    <span className="mindmap-rel-group">{rel.toGroup}</span>
                    <span style={{ marginLeft: '4px', fontSize: '10px', color: RELATION_COLORS[rel.type], fontWeight: 600 }}>
                      {t('relations.' + rel.type)}
                    </span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: '11px', padding: '1px 5px', marginLeft: 'auto' }}
                      onClick={() => {
                        confirmAction('Remove this connection?', () => {
                          const d = [...contextData]
                          const from = d.find((e) => e.name === rel.from)
                          if (from?.relations) from.relations = from.relations.filter((r) => r.name !== rel.to)
                          updateActiveBook({ contextData: d })
                        })
                      }}
                    >
                      [D]
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
