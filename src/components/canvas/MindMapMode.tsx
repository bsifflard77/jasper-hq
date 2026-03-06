'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface MapNode {
  id: string
  label: string
  type: 'root' | 'branch' | 'leaf'
  parent?: string
  notes?: string
}

interface SavedMap {
  id: string
  title: string
  type: string
  project: string | null
  created_at: string
  updated_at: string
}

const NODE_STYLES = {
  root: {
    background: '#10b981',
    color: 'white',
    border: '2px solid #059669',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: 700,
    fontSize: '16px',
    boxShadow: '0 0 20px rgba(16,185,129,0.3)',
    minWidth: '140px',
    textAlign: 'center' as const,
  },
  branch: {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '2px solid #334155',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 600,
    fontSize: '13px',
    minWidth: '120px',
    textAlign: 'center' as const,
  },
  leaf: {
    background: '#0f172a',
    color: '#94a3b8',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    minWidth: '100px',
    textAlign: 'center' as const,
  },
}

const BRANCH_COLORS = [
  '#6366f1', '#f59e0b', '#3b82f6', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
]

function buildLayout(mapNodes: MapNode[]): { nodes: Node[]; edges: Edge[] } {
  const root = mapNodes.find(n => n.type === 'root')
  if (!root) return { nodes: [], edges: [] }

  const branches = mapNodes.filter(n => n.parent === root.id)
  const CANVAS_CX = 300
  const CANVAS_CY = 400

  const flowNodes: Node[] = []
  const flowEdges: Edge[] = []

  flowNodes.push({
    id: root.id,
    position: { x: CANVAS_CX, y: CANVAS_CY },
    data: { label: root.label },
    style: NODE_STYLES.root,
  })

  const BRANCH_X_OFFSET = 280
  const BRANCH_SPACING = 110
  const LEAF_X_OFFSET = 560
  const LEAF_SPACING = 60

  const totalBranchH = (branches.length - 1) * BRANCH_SPACING
  const branchStartY = CANVAS_CY - totalBranchH / 2

  branches.forEach((branch, bi) => {
    const branchColor = BRANCH_COLORS[bi % BRANCH_COLORS.length]
    const branchY = branchStartY + bi * BRANCH_SPACING
    const branchX = CANVAS_CX + BRANCH_X_OFFSET

    flowNodes.push({
      id: branch.id,
      position: { x: branchX, y: branchY },
      data: { label: branch.label },
      style: { ...NODE_STYLES.branch, border: `2px solid ${branchColor}`, color: '#f1f5f9' },
    })

    flowEdges.push({
      id: `e-${root.id}-${branch.id}`,
      source: root.id,
      target: branch.id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: branchColor },
      style: { stroke: branchColor, strokeWidth: 2 },
    })

    const leaves = mapNodes.filter(n => n.parent === branch.id)
    const totalLeafH = (leaves.length - 1) * LEAF_SPACING
    const leafStartY = branchY - totalLeafH / 2

    leaves.forEach((leaf, li) => {
      const leafY = leafStartY + li * LEAF_SPACING
      const leafX = CANVAS_CX + LEAF_X_OFFSET

      flowNodes.push({
        id: leaf.id,
        position: { x: leafX, y: leafY },
        data: { label: leaf.label },
        style: { ...NODE_STYLES.leaf, borderColor: branchColor + '40' },
      })

      flowEdges.push({
        id: `e-${branch.id}-${leaf.id}`,
        source: branch.id,
        target: leaf.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        style: { stroke: '#334155', strokeWidth: 1 },
      })
    })
  })

  return { nodes: flowNodes, edges: flowEdges }
}

export default function MindMapMode() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [mapTitle, setMapTitle] = useState('')
  const [error, setError] = useState('')
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [lastRawNodes, setLastRawNodes] = useState<MapNode[]>([])

  // Load saved maps list on mount
  useEffect(() => {
    fetch('/api/canvas/save')
      .then(r => r.json())
      .then(d => setSavedMaps(d.maps || []))
      .catch(() => {})
  }, [])

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    setCurrentMapId(null)
    try {
      const res = await fetch('/api/canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const { nodes: flowNodes, edges: flowEdges } = buildLayout(data.nodes || [])
      setNodes(flowNodes)
      setEdges(flowEdges)
      setMapTitle(data.title || prompt)
      setLastRawNodes(data.nodes || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [prompt, loading, setNodes, setEdges])

  const saveMap = useCallback(async () => {
    if (!mapTitle || nodes.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/canvas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentMapId,
          title: mapTitle,
          type: 'mindmap',
          data: { nodes: lastRawNodes, flowNodes: nodes, flowEdges: edges },
          project: prompt,
        }),
      })
      const d = await res.json()
      if (d.map) {
        setCurrentMapId(d.map.id)
        // Refresh saved maps list
        const listRes = await fetch('/api/canvas/save')
        const listData = await listRes.json()
        setSavedMaps(listData.maps || [])
      }
    } catch {}
    setSaving(false)
  }, [mapTitle, nodes, edges, lastRawNodes, currentMapId, prompt])

  const loadMap = useCallback(async (mapId: string) => {
    try {
      const res = await fetch(`/api/canvas/load?id=${mapId}`)
      const d = await res.json()
      if (d.map?.data) {
        const { flowNodes, flowEdges, nodes: rawNodes } = d.map.data
        setNodes(flowNodes || [])
        setEdges(flowEdges || [])
        setMapTitle(d.map.title)
        setPrompt(d.map.project || d.map.title)
        setCurrentMapId(mapId)
        setLastRawNodes(rawNodes || [])
        setShowHistory(false)
      }
    } catch {}
  }, [setNodes, setEdges])

  const deleteMap = useCallback(async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/canvas/load?id=${mapId}`, { method: 'DELETE' })
    setSavedMaps(prev => prev.filter(m => m.id !== mapId))
    if (currentMapId === mapId) setCurrentMapId(null)
  }, [currentMapId])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-700/50 bg-slate-900/50">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="Enter a project or topic — e.g. GiftHQ, The Helm Method, Q2 Marketing…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          onClick={generate}
          disabled={!prompt.trim() || loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mapping…</>
          ) : (
            <><span>✨</span>Generate</>
          )}
        </button>

        {/* Save button */}
        {nodes.length > 0 && (
          <button
            onClick={saveMap}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {saving ? '💾 Saving…' : currentMapId ? '💾 Update' : '💾 Save'}
          </button>
        )}

        {/* History button */}
        <button
          onClick={() => setShowHistory(p => !p)}
          className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            showHistory ? 'bg-emerald-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          📂 {savedMaps.length > 0 ? `${savedMaps.length} saved` : 'History'}
        </button>
      </div>

      {/* Saved maps panel */}
      {showHistory && (
        <div className="border-b border-slate-700/50 bg-slate-900/80 p-3">
          {savedMaps.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-2">No saved maps yet — generate one and hit Save</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedMaps.map(m => (
                <button
                  key={m.id}
                  onClick={() => loadMap(m.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all group ${
                    currentMapId === m.id
                      ? 'bg-emerald-700/30 border-emerald-600/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  <span>🗺️</span>
                  <span>{m.title}</span>
                  <button
                    onClick={(e) => deleteMap(m.id, e)}
                    className="ml-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-lg font-medium text-slate-500">Enter a project or topic above</p>
          <p className="text-sm mt-1">Jasper will generate a visual mind map instantly</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
            {['GiftHQ', 'The Helm Method™', 'TVE Book', 'The Fort Strategy', 'Vortxx Features', 'AIDEN Product'].map(s => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map title bar */}
      {mapTitle && nodes.length > 0 && (
        <div className="px-4 py-1.5 text-xs text-slate-500 border-b border-slate-800 flex items-center gap-2">
          <span className="text-emerald-400 font-medium">{mapTitle}</span>
          <span>· {nodes.length} nodes · drag to rearrange · scroll to zoom</span>
          {currentMapId && <span className="ml-auto text-emerald-600">✓ Saved</span>}
        </div>
      )}

      {/* React Flow canvas */}
      {nodes.length > 0 && (
        <div className="flex-1" style={{ background: '#0a0f1a' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-right"
          >
            <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={24} size={1} />
            <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />
            <MiniMap
              style={{ background: '#0f172a', border: '1px solid #334155' }}
              nodeColor="#334155"
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}
