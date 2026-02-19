'use client'

import * as React from 'react'
import { Loader2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'

interface SearchResult {
  id: string
  group_name: string
  sender_name: string
  body: string
  timestamp: string
  similarity: number
  match_type: string
}

interface GraphNode {
  id: string
  label: string
  type: 'sender' | 'group' | 'keyword'
  count: number
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  source: string
  target: string
  weight: number
}

// Simple force simulation (no external deps)
function runForceSimulation(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number, ticks = 180) {
  const cx = width / 2
  const cy = height / 2

  for (let t = 0; t < ticks; t++) {
    const alpha = 1 - t / ticks // cooling factor

    // Center gravity
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.008 * alpha
      n.vy += (cy - n.y) * 0.008 * alpha
    }

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const repelStrength = 3500 / (dist * dist) * alpha
        const fx = (dx / dist) * repelStrength
        const fy = (dy / dist) * repelStrength
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // Spring attraction along edges
    const nodeById = new Map(nodes.map(n => [n.id, n]))
    for (const e of edges) {
      const a = nodeById.get(e.source)
      const b = nodeById.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const idealDist = 120 + e.weight * 10
      const force = ((dist - idealDist) / dist) * 0.2 * alpha
      a.vx += dx * force
      a.vy += dy * force
      b.vx -= dx * force
      b.vy -= dy * force
    }

    // Integrate velocities
    for (const n of nodes) {
      n.vx *= 0.85 // damping
      n.vy *= 0.85
      n.x += n.vx
      n.y += n.vy
      // Clamp to bounds
      n.x = Math.max(40, Math.min(width - 40, n.x))
      n.y = Math.max(40, Math.min(height - 40, n.y))
    }
  }
}

const GROUP_COLORS = [
  '#22d3ee', '#a78bfa', '#34d399', '#f59e0b',
  '#f87171', '#60a5fa', '#fb923c', '#c084fc',
]

function extractKeywords(text: string, stopwords: Set<string>): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
}

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'they', 'will', 'have', 'been', 'were',
  'their', 'there', 'when', 'what', 'which', 'your', 'some', 'also', 'more',
  'than', 'then', 'just', 'only', 'very', 'about', 'like', 'into', 'over',
  'after', 'before', 'would', 'could', 'should', 'shall', 'need',
])

interface Props {
  query: string
  results: SearchResult[]
}

export default function KnowledgeGraph({ query, results }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(800)
  const height = 500
  const [nodes, setNodes] = React.useState<GraphNode[]>([])
  const [edges, setEdges] = React.useState<GraphEdge[]>([])
  const [selected, setSelected] = React.useState<GraphNode | null>(null)
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  // Measure container width
  React.useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Build graph from results
  React.useEffect(() => {
    if (results.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const senderCounts = new Map<string, number>()
    const groupCounts = new Map<string, number>()
    const keywordCounts = new Map<string, number>()
    const senderGroups = new Map<string, Set<string>>()
    const senderKeywords = new Map<string, Set<string>>()

    for (const r of results) {
      senderCounts.set(r.sender_name, (senderCounts.get(r.sender_name) || 0) + 1)
      groupCounts.set(r.group_name, (groupCounts.get(r.group_name) || 0) + 1)

      if (!senderGroups.has(r.sender_name)) senderGroups.set(r.sender_name, new Set())
      senderGroups.get(r.sender_name)!.add(r.group_name)

      // Extract top keywords from each message
      const kws = extractKeywords(r.body, STOPWORDS)
      const topKws = kws.slice(0, 4)
      if (!senderKeywords.has(r.sender_name)) senderKeywords.set(r.sender_name, new Set())
      for (const kw of topKws) {
        keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1)
        senderKeywords.get(r.sender_name)!.add(kw)
      }
    }

    // Keep only keywords appearing 2+ times
    const relevantKeywords = [...keywordCounts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k]) => k)

    const cx = width / 2
    const cy = height / 2

    const newNodes: GraphNode[] = []
    const newEdges: GraphEdge[] = []

    // Group nodes — positioned in a ring
    const groupList = [...groupCounts.keys()]
    groupList.forEach((g, i) => {
      const angle = (i / groupList.length) * 2 * Math.PI
      newNodes.push({
        id: `group:${g}`,
        label: g,
        type: 'group',
        count: groupCounts.get(g) || 1,
        x: cx + Math.cos(angle) * 180,
        y: cy + Math.sin(angle) * 180,
        vx: 0,
        vy: 0,
      })
    })

    // Sender nodes
    const senderList = [...senderCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    senderList.forEach(([s, count], i) => {
      const angle = (i / senderList.length) * 2 * Math.PI + 0.3
      newNodes.push({
        id: `sender:${s}`,
        label: s,
        type: 'sender',
        count,
        x: cx + Math.cos(angle) * 100 + (Math.random() - 0.5) * 60,
        y: cy + Math.sin(angle) * 100 + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
      })
    })

    // Keyword nodes
    relevantKeywords.forEach((kw, i) => {
      const angle = (i / relevantKeywords.length) * 2 * Math.PI + 1.0
      newNodes.push({
        id: `kw:${kw}`,
        label: kw,
        type: 'keyword',
        count: keywordCounts.get(kw) || 1,
        x: cx + Math.cos(angle) * 250 + (Math.random() - 0.5) * 80,
        y: cy + Math.sin(angle) * 250 + (Math.random() - 0.5) * 80,
        vx: 0,
        vy: 0,
      })
    })

    // Edges: sender → group
    for (const [sender, groups] of senderGroups.entries()) {
      const senderCount = senderCounts.get(sender) || 1
      for (const g of groups) {
        newEdges.push({ source: `sender:${sender}`, target: `group:${g}`, weight: senderCount })
      }
    }

    // Edges: sender → keyword (only relevant keywords)
    const relevantSet = new Set(relevantKeywords)
    for (const [sender, kws] of senderKeywords.entries()) {
      for (const kw of kws) {
        if (relevantSet.has(kw)) {
          newEdges.push({ source: `sender:${sender}`, target: `kw:${kw}`, weight: 1 })
        }
      }
    }

    // Run force simulation
    runForceSimulation(newNodes, newEdges, width, height)

    setNodes(newNodes)
    setEdges(newEdges)
    setSelected(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, width])

  const groupColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    const groups = nodes.filter(n => n.type === 'group')
    groups.forEach((g, i) => map.set(g.label, GROUP_COLORS[i % GROUP_COLORS.length]))
    return map
  }, [nodes])

  function getNodeColor(n: GraphNode) {
    if (n.type === 'group') return groupColorMap.get(n.label) || '#22d3ee'
    if (n.type === 'keyword') return '#94a3b8'
    // Sender: use color of first group it belongs to
    const firstEdge = edges.find(e => e.source === n.id && e.target.startsWith('group:'))
    if (firstEdge) {
      const groupName = firstEdge.target.replace('group:', '')
      return groupColorMap.get(groupName) || '#22d3ee'
    }
    return '#22d3ee'
  }

  function getNodeRadius(n: GraphNode) {
    if (n.type === 'group') return Math.min(10 + n.count * 0.8, 28)
    if (n.type === 'keyword') return Math.min(5 + n.count * 1.5, 16)
    return Math.min(6 + n.count * 1.2, 22)
  }

  // Drag-to-pan handlers
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as SVGElement).closest('.graph-node')) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart.current) return
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    })
  }

  function onMouseUp() {
    setIsDragging(false)
    dragStart.current = null
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-terminal-muted font-mono text-sm gap-3">
        <div className="text-4xl opacity-20">◎</div>
        <p>Search something to see the knowledge graph</p>
        <p className="text-xs text-terminal-muted/60">Nodes = senders & groups · Edges = connections</p>
      </div>
    )
  }

  const nodeById = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-terminal-accent/80" />
            Group
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border border-terminal-accent/60" style={{ background: 'rgba(34,211,238,0.3)' }} />
            Sender
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-400/60" />
            Keyword
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
            className="p-1.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}
            className="p-1.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            className="p-1.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        className="relative border border-terminal-border rounded-lg bg-terminal-dark overflow-hidden"
        style={{ height }}
      >
        <svg
          width="100%"
          height={height}
          className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
             style={{ transformOrigin: `${width / 2}px ${height / 2}px` }}>
            {/* Edges */}
            {edges.map((e, i) => {
              const a = nodeById.get(e.source)
              const b = nodeById.get(e.target)
              if (!a || !b) return null
              const isGroupEdge = e.target.startsWith('group:')
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y}
                  x2={b.x} y2={b.y}
                  stroke={isGroupEdge ? getNodeColor(a) : '#475569'}
                  strokeWidth={isGroupEdge ? Math.min(e.weight * 0.5 + 0.5, 3) : 0.8}
                  strokeOpacity={isGroupEdge ? 0.35 : 0.2}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const r = getNodeRadius(n)
              const color = getNodeColor(n)
              const isSelected = selected?.id === n.id
              return (
                <g
                  key={n.id}
                  className="graph-node cursor-pointer"
                  transform={`translate(${n.x},${n.y})`}
                  onClick={() => setSelected(isSelected ? null : n)}
                >
                  <circle
                    r={r}
                    fill={n.type === 'group' ? color : 'transparent'}
                    stroke={color}
                    strokeWidth={n.type === 'keyword' ? 1 : 1.5}
                    fillOpacity={n.type === 'sender' ? 0.25 : n.type === 'keyword' ? 0.15 : 0.7}
                    className="transition-all duration-150"
                    style={isSelected ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
                  />
                  {isSelected && (
                    <circle
                      r={r + 4}
                      fill="none"
                      stroke={color}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      strokeDasharray="3 2"
                    />
                  )}
                  <text
                    y={r + 10}
                    textAnchor="middle"
                    fontSize={n.type === 'keyword' ? 9 : 10}
                    fill={color}
                    fillOpacity={0.85}
                    className="pointer-events-none select-none"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
                  </text>
                  {n.count > 1 && n.type !== 'keyword' && (
                    <text
                      y={r + 20}
                      textAnchor="middle"
                      fontSize={8}
                      fill={color}
                      fillOpacity={0.5}
                      className="pointer-events-none select-none"
                      style={{ fontFamily: 'monospace' }}
                    >
                      {n.count} msg{n.count !== 1 ? 's' : ''}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Selected node info panel */}
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 bg-terminal-panel border border-terminal-border rounded-lg p-3 text-xs font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-terminal-accent font-semibold">{selected.label}</span>
              <button
                onClick={() => setSelected(null)}
                className="text-terminal-muted hover:text-terminal-text text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="text-terminal-muted">
              {selected.type === 'group' && `Group · ${selected.count} message${selected.count !== 1 ? 's' : ''} in results`}
              {selected.type === 'sender' && `Sender · ${selected.count} message${selected.count !== 1 ? 's' : ''} in results`}
              {selected.type === 'keyword' && `Keyword · appears in ${selected.count} messages`}
            </div>
            {selected.type === 'sender' && (
              <div className="text-terminal-muted/60 mt-1">
                Groups: {
                  edges
                    .filter(e => e.source === selected.id && e.target.startsWith('group:'))
                    .map(e => e.target.replace('group:', ''))
                    .join(', ')
                }
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] font-mono text-terminal-muted/50 text-center">
        {nodes.filter(n => n.type === 'sender').length} senders · {nodes.filter(n => n.type === 'group').length} groups · {nodes.filter(n => n.type === 'keyword').length} keywords from {results.length} results
      </p>
    </div>
  )
}
