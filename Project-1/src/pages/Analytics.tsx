import { createSignal, createEffect, createMemo, onMount, For, Show } from 'solid-js'
import { useSearchParams } from '@solidjs/router'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherDialog from '../dither-kit/solid/DitherDialog'
import { AreaChart } from '../dither-kit/solid/area-chart'
import { BarChart } from '../dither-kit/solid/bar-chart'
import Area from '../dither-kit/solid/Area'
import Bar from '../dither-kit/solid/Bar'
import Grid from '../dither-kit/solid/Grid'
import XAxis from '../dither-kit/solid/XAxis'
import YAxis from '../dither-kit/solid/YAxis'
import Sparkline from '../dither-kit/solid/Sparkline'
import type { ChartConfig } from '../dither-kit/engine/chart-types'
import { analyticsService } from '../services/analyticsService'
import { folderService } from '../services/folderService'
import { bookmarkService } from '../services/bookmarkService'
import type { Bookmark, Folder, VisualBoard, VisualBox } from '../domain/types'

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [scope, setScope] = createSignal<'entire-archive' | 'folder' | 'tag' | 'domain'>(
    (searchParams.scope as any) || 'entire-archive',
  )
  const [scopeId, setScopeId] = createSignal<string>((searchParams.scopeId as string) || '')
  const [folders, setFolders] = createSignal<Folder[]>([])
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([])
  const [board, setBoard] = createSignal<VisualBoard | null>(null)
  const [addVisualOpen, setAddVisualOpen] = createSignal(false)
  const [newVisualType, setNewVisualType] = createSignal<'area' | 'bar'>('area')
  const [newVisualTitle, setNewVisualTitle] = createSignal('')
  const [newVisualDimension, setNewVisualDimension] = createSignal<'domain' | 'folder' | 'date'>('date')
  const [activeTab, setActiveTab] = createSignal<'canvas' | 'graph'>('canvas')
  const [hoveredNode, setHoveredNode] = createSignal<{ id: string; label: string; type: string; connections: number } | null>(null)

  // Interactive Relationship Graph computation
  const graphData = createMemo(() => {
    const bms = bookmarks()
    const flds = folders()
    const width = 900
    const height = 520
    const cx = width / 2
    const cy = height / 2

    const nodes: Array<{ id: string; label: string; type: 'folder' | 'bookmark' | 'tag'; x: number; y: number; connections: number; color: string }> = []
    const links: Array<{ source: string; target: string; x1: number; y1: number; x2: number; y2: number }> = []

    // 1. Folders in scope
    const activeFolderIds = new Set(bms.map(b => b.folderId).filter(Boolean))
    const relevantFolders = flds.filter(f => activeFolderIds.has(f.id)).slice(0, 8)
    const fAngleStep = (2 * Math.PI) / Math.max(1, relevantFolders.length)

    relevantFolders.forEach((f, idx) => {
      const angle = idx * fAngleStep - Math.PI / 2
      nodes.push({
        id: f.id,
        label: f.name,
        type: 'folder',
        x: cx + Math.cos(angle) * 140,
        y: cy + Math.sin(angle) * 140,
        connections: bms.filter(b => b.folderId === f.id).length,
        color: '#60a5fa',
      })
    })

    // 2. Top Tags in scope
    const tagCounts: Record<string, number> = {}
    bms.forEach(b => b.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const tAngleStep = (2 * Math.PI) / Math.max(1, topTags.length)

    topTags.forEach(([tag, count], idx) => {
      const angle = idx * tAngleStep + 0.3
      nodes.push({
        id: `tag-${tag}`,
        label: `#${tag}`,
        type: 'tag',
        x: cx + Math.cos(angle) * 230,
        y: cy + Math.sin(angle) * 210,
        connections: count,
        color: '#c084fc',
      })
    })

    // 3. Representative Bookmarks
    const sampleBms = bms.slice(0, 20)
    const bAngleStep = (2 * Math.PI) / Math.max(1, sampleBms.length)

    sampleBms.forEach((b, idx) => {
      const angle = idx * bAngleStep + 0.15
      const bNode = {
        id: b.id,
        label: b.title.length > 22 ? b.title.slice(0, 20) + '...' : b.title,
        type: 'bookmark' as const,
        x: cx + Math.cos(angle) * 185,
        y: cy + Math.sin(angle) * 175,
        connections: b.tags.length + (b.folderId ? 1 : 0),
        color: '#f472b6',
      }
      nodes.push(bNode)

      if (b.folderId) {
        const fNode = nodes.find(n => n.id === b.folderId)
        if (fNode) {
          links.push({
            source: b.id,
            target: b.folderId,
            x1: bNode.x,
            y1: bNode.y,
            x2: fNode.x,
            y2: fNode.y,
          })
        }
      }

      b.tags.forEach(t => {
        const tNode = nodes.find(n => n.id === `tag-${t}`)
        if (tNode) {
          links.push({
            source: b.id,
            target: tNode.id,
            x1: bNode.x,
            y1: bNode.y,
            x2: tNode.x,
            y2: tNode.y,
          })
        }
      })
    })

    return { nodes, links, width, height }
  })

  // Computed data sets
  const [activityData, setActivityData] = createSignal<Array<{ x: string; y: number }>>([])
  const [domainData, setDomainData] = createSignal<Array<{ x: string; y: number }>>([])
  const [folderData, setFolderData] = createSignal<Array<{ x: string; y: number }>>([])

  const loadData = async () => {
    const [allF, bms, boards] = await Promise.all([
      folderService.getFolders(),
      analyticsService.getScopeBookmarks(scope(), scopeId() || undefined),
      analyticsService.getBoards(),
    ])

    setFolders(allF)
    setBookmarks(bms)
    setBoard(boards[0] || null)

    // Calculate aggregated metrics
    const [act, dom, fld] = await Promise.all([
      analyticsService.getActivityByWeekday(bms),
      analyticsService.getDomainDistribution(bms, 8),
      analyticsService.getFolderDistribution(bms),
    ])

    setActivityData(act)
    setDomainData(dom)
    setFolderData(fld)
  }

  onMount(() => {
    loadData()
  })

  createEffect(() => {
    scope()
    scopeId()
    loadData()
  })

  const areaConfig: ChartConfig = {
    y: { label: 'Activity', color: 'blue' },
  }

  const domainConfig: ChartConfig = {
    y: { label: 'Bookmarks', color: 'purple' },
  }

  const folderConfig: ChartConfig = {
    y: { label: 'Bookmarks', color: 'pink' },
  }

  const handleSaveBoard = async () => {
    if (board()) {
      await analyticsService.saveBoard(board()!)
      alert('Visual board configuration saved!')
    }
  }

  const handleAddVisualBox = () => {
    if (!board()) return

    const newBox: VisualBox = {
      id: `box-${Date.now()}`,
      boardId: board()!.id,
      type: newVisualType(),
      title: newVisualTitle().trim() || `${newVisualType().toUpperCase()} Analysis`,
      dimension: newVisualDimension(),
      measure: 'count',
      width: newVisualType() === 'area' ? '2' : '1',
      order: board()!.boxes.length + 1,
    }

    const updated = {
      ...board()!,
      boxes: [...board()!.boxes, newBox],
    }
    setBoard(updated)
    setAddVisualOpen(false)
    setNewVisualTitle('')
  }

  const handleRemoveBox = (boxId: string) => {
    if (!board()) return
    const updated = {
      ...board()!,
      boxes: board()!.boxes.filter(b => b.id !== boxId),
    }
    setBoard(updated)
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Scope Selector & Actions */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Visual Analytics</h1>
          <p class="text-xs text-muted-foreground font-mono">
            Dedicated chart & intelligence canvas for understanding your saved knowledge
          </p>
        </div>

        <div class="flex items-center gap-2">
          <DitherButton variant="dotted" onClick={() => setAddVisualOpen(true)} class="text-xs">
            + Add Visual Box
          </DitherButton>
          <DitherButton variant="gradient" onClick={handleSaveBoard} class="text-xs">
            Save Board
          </DitherButton>
        </div>
      </div>

      {/* View Mode Tabs: Visual Canvas vs Relationship Graph */}
      <div class="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('canvas')}
          class={`px-3.5 py-1.5 rounded-t text-xs font-mono font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab() === 'canvas'
              ? 'border-accent text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>📊</span>
          <span>Visual Boxes & Charts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('graph')}
          class={`px-3.5 py-1.5 rounded-t text-xs font-mono font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab() === 'graph'
              ? 'border-accent text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🕸️</span>
          <span>Relationship Graph</span>
        </button>
      </div>

      {/* Scope Selector Bar */}
      <div class="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border bg-card">
        <div class="text-xs font-mono text-muted-foreground uppercase">Data Scope:</div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScope('entire-archive')
              setScopeId('')
            }}
            class={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              scope() === 'entire-archive' ? 'bg-accent text-white font-semibold' : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            Entire Archive ({bookmarks().length})
          </button>

          <button
            type="button"
            onClick={() => {
              setScope('folder')
              if (folders().length > 0) setScopeId(folders()[0].id)
            }}
            class={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              scope() === 'folder' ? 'bg-accent text-white font-semibold' : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            By Folder
          </button>
        </div>

        <Show when={scope() === 'folder'}>
          <select
            value={scopeId()}
            onChange={(e) => setScopeId(e.currentTarget.value)}
            class="h-8 px-2.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <For each={folders()}>
              {(f) => <option value={f.id}>{f.name}</option>}
            </For>
          </select>
        </Show>
      </div>

      {/* Visual Canvas View */}
      <Show when={activeTab() === 'canvas'}>
        {/* Summary KPI Strip using Dither Sparklines */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
            <div>
              <div class="text-[10px] font-mono text-muted-foreground uppercase">Total In Scope</div>
              <div class="text-2xl font-bold text-foreground font-mono">{bookmarks().length}</div>
            </div>
            <Sparkline data={[5, 10, 8, 15, 12, 19, bookmarks().length]} color="blue" class="w-20 h-6" />
          </div>

          <div class="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
            <div>
              <div class="text-[10px] font-mono text-muted-foreground uppercase">Active Folders</div>
              <div class="text-2xl font-bold text-foreground font-mono">{folders().length}</div>
            </div>
            <Sparkline data={[2, 3, 3, 4, 4, 5, folders().length]} color="purple" class="w-20 h-6" />
          </div>

          <div class="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
            <div>
              <div class="text-[10px] font-mono text-muted-foreground uppercase">Total Visits</div>
              <div class="text-2xl font-bold text-foreground font-mono">
                {bookmarks().reduce((acc, b) => acc + b.visitCount, 0)}
              </div>
            </div>
            <Sparkline data={[10, 25, 40, 55, 70, 95, 120]} color="pink" class="w-20 h-6" />
          </div>
        </div>

        {/* Visual Canvas Board Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Activity History */}
          <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm relative group">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-foreground">Activity by Weekday</h3>
                <p class="text-xs text-muted-foreground font-mono">Capture density across days</p>
              </div>
              <span class="text-xs text-accent font-mono">AreaChart</span>
            </div>
            <div class="h-56 w-full">
              <AreaChart data={activityData()} config={areaConfig} class="h-56 w-full">
                <Grid />
                <XAxis dataKey="x" />
                <YAxis />
                <Area dataKey="y" />
              </AreaChart>
            </div>
          </div>

          {/* Box 2: Domain Breakdown */}
          <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm relative group">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-foreground">Top Domains</h3>
                <p class="text-xs text-muted-foreground font-mono">Links grouped by hostname</p>
              </div>
              <span class="text-xs text-purple-400 font-mono">BarChart</span>
            </div>
            <div class="h-56 w-full">
              <BarChart data={domainData()} config={domainConfig} class="h-56 w-full">
                <Grid />
                <XAxis dataKey="x" />
                <YAxis />
                <Bar dataKey="y" />
              </BarChart>
            </div>
          </div>

          {/* Box 3: Folder Distribution */}
          <Show when={folderData().length > 0}>
            <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm md:col-span-2">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">Distribution Across Folders</h3>
                  <p class="text-xs text-muted-foreground font-mono">Link concentration by hierarchy</p>
                </div>
                <span class="text-xs text-pink-400 font-mono">BarChart</span>
              </div>
              <div class="h-56 w-full">
                <BarChart data={folderData()} config={folderConfig} class="h-56 w-full">
                  <Grid />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Bar dataKey="y" />
                </BarChart>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Relationship Graph View */}
      <Show when={activeTab() === 'graph'}>
        <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm relative overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Knowledge Relationship Graph</h3>
              <p class="text-xs text-muted-foreground font-mono">
                Visualizing connections between Folders, Saved Bookmarks, and Category Tags
              </p>
            </div>
            <div class="flex items-center gap-3 text-[11px] font-mono">
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-blue-400"></span> Folders</span>
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-pink-400"></span> Bookmarks</span>
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-purple-400"></span> Tags</span>
            </div>
          </div>

          <div class="relative w-full h-[540px] rounded-lg bg-background/80 border border-border/80 flex items-center justify-center overflow-hidden">
            <svg
              viewBox={`0 0 ${graphData().width} ${graphData().height}`}
              class="w-full h-full select-none"
            >
              {/* Relationship Links */}
              <For each={graphData().links}>
                {(link) => (
                  <line
                    x1={link.x1}
                    y1={link.y1}
                    x2={link.x2}
                    y2={link.y2}
                    stroke="currentColor"
                    stroke-width="1"
                    class="text-border/80 hover:text-accent transition-colors opacity-40"
                    stroke-dasharray="2,2"
                  />
                )}
              </For>

              {/* Nodes */}
              <For each={graphData().nodes}>
                {(node) => (
                  <g
                    transform={`translate(${node.x}, ${node.y})`}
                    class="cursor-pointer transition-transform hover:scale-110"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      r={node.type === 'folder' ? 14 : (node.type === 'tag' ? 10 : 7)}
                      fill={node.color}
                      stroke="#000"
                      stroke-width="1.5"
                      class="opacity-90 hover:opacity-100 shadow-lg"
                    />
                    <text
                      y={node.type === 'folder' ? 22 : 18}
                      text-anchor="middle"
                      class="fill-foreground text-[10px] font-mono font-medium pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                )}
              </For>
            </svg>

            {/* Hover Inspector Card */}
            <Show when={hoveredNode()}>
              <div class="absolute bottom-4 left-4 p-3 bg-card/95 backdrop-blur border border-border rounded-lg shadow-xl text-xs font-mono space-y-1 max-w-xs pointer-events-none">
                <div class="font-bold text-foreground truncate">{hoveredNode()!.label}</div>
                <div class="text-[11px] text-accent uppercase">{hoveredNode()!.type}</div>
                <div class="text-[10px] text-muted-foreground">
                  {hoveredNode()!.connections} connected relations
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Add Visual Box Modal */}
      <DitherDialog
        open={addVisualOpen()}
        onClose={() => setAddVisualOpen(false)}
        title="Add Visual Box"
        description="Choose a chart type and data dimension to append a new card to your analytics canvas."
        footer={
          <div class="flex justify-end gap-2 pt-2">
            <DitherButton variant="dotted" onClick={() => setAddVisualOpen(false)}>
              Cancel
            </DitherButton>
            <DitherButton variant="gradient" onClick={handleAddVisualBox}>
              Add to Board
            </DitherButton>
          </div>
        }
      >
        <div class="space-y-4 py-2">
          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Box Title</label>
            <input
              type="text"
              placeholder="e.g. Domain Density Analysis..."
              value={newVisualTitle()}
              onInput={(e) => setNewVisualTitle(e.currentTarget.value)}
              class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">Chart Type</label>
              <select
                value={newVisualType()}
                onChange={(e) => setNewVisualType(e.currentTarget.value as any)}
                class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">Dimension</label>
              <select
                value={newVisualDimension()}
                onChange={(e) => setNewVisualDimension(e.currentTarget.value as any)}
                class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="date">Weekday Activity</option>
                <option value="domain">Top Domains</option>
                <option value="folder">Folder Hierarchy</option>
              </select>
            </div>
          </div>
        </div>
      </DitherDialog>
    </div>
  )
}
