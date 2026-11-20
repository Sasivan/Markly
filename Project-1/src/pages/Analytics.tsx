import { createSignal, createEffect, onMount, For, Show } from 'solid-js'
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
