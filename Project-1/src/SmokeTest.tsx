import { createSignal } from 'solid-js'
import DitherButton from './dither-kit/solid/DitherButton'
import DitherInput from './dither-kit/solid/DitherInput'
import DitherDialog from './dither-kit/solid/DitherDialog'
import DitherPopover from './dither-kit/solid/DitherPopover'
import DitherSidebar from './dither-kit/solid/DitherSidebar'
import DitherSidebarGroup from './dither-kit/solid/DitherSidebarGroup'
import DitherSidebarItem from './dither-kit/solid/DitherSidebarItem'
import DitherSidebarSub from './dither-kit/solid/DitherSidebarSub'
import { AreaChart } from './dither-kit/solid/area-chart'
import { BarChart } from './dither-kit/solid/bar-chart'
import Area from './dither-kit/solid/Area'
import Bar from './dither-kit/solid/Bar'
import Grid from './dither-kit/solid/Grid'
import XAxis from './dither-kit/solid/XAxis'
import YAxis from './dither-kit/solid/YAxis'
import Sparkline from './dither-kit/solid/Sparkline'
import DitherAurora from './dither-kit/solid/Aurora'
import DitherAsciiText from './dither-kit/solid/AsciiText'
import DitherGradientText from './dither-kit/solid/GradientText'
import DitherReveal from './dither-kit/solid/DitherReveal'
import type { ChartConfig } from './dither-kit/engine/chart-types'

export default function SmokeTest() {
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [popoverOpen, setPopoverOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('library')
  const [folderOpen, setFolderOpen] = createSignal(true)
  const [inputValue, setInputValue] = createSignal('')

  const sampleData = [
    { x: 'Mon', y: 12 },
    { x: 'Tue', y: 19 },
    { x: 'Wed', y: 8 },
    { x: 'Thu', y: 25 },
    { x: 'Fri', y: 32 },
    { x: 'Sat', y: 15 },
    { x: 'Sun', y: 28 },
  ]

  const areaConfig: ChartConfig = {
    y: { label: 'Activity', color: 'blue' }
  }

  const barConfig: ChartConfig = {
    y: { label: 'Bookmarks', color: 'purple' }
  }

  return (
    <div class="p-8 max-w-6xl mx-auto space-y-12">
      {/* Header with Dither Typography & Accent */}
      <header class="border-b border-border pb-6 space-y-2">
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 rotate-45 bg-accent" />
          <h1 class="text-3xl font-bold tracking-tight">Markly — Dither UI Smoke Test</h1>
        </div>
        <p class="text-muted-foreground text-sm">
          Stage 1 Verification: Proving official Dither UI kit compilation, rendering, and interaction.
        </p>
      </header>

      {/* Typography & Backgrounds */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">1. Typography & Art Background</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 rounded-lg border border-border bg-card space-y-4">
            <div class="text-xs uppercase tracking-wider text-muted-foreground">Text Effects</div>
            <DitherGradientText class="text-2xl font-bold">
              A quieter place for everything worth keeping
            </DitherGradientText>
            <div class="text-sm text-muted-foreground">
              Pure Dither tokens rendered with bone/ivory fonts and near-black surfaces.
            </div>
            <DitherAsciiText text="MARKLY" class="font-mono text-accent" />
          </div>

          <div class="p-6 rounded-lg border border-border bg-card relative overflow-hidden h-64 flex flex-col justify-end">
            <div class="absolute inset-0 pointer-events-none opacity-40">
              <DitherAurora />
            </div>
            <div class="relative z-10 text-xs text-muted-foreground">
              Background: Dither Aurora Canvas Layer (Generative & deterministic)
            </div>
          </div>
        </div>
      </section>

      {/* Controls & Inputs */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">2. Dither Buttons & Inputs</h2>
        <div class="flex flex-wrap gap-4 items-center">
          <DitherButton variant="gradient" onClick={() => alert('Dither Button clicked!')}>
            Primary Action
          </DitherButton>
          <DitherButton variant="dotted">
            Dotted Secondary
          </DitherButton>
          <DitherButton variant="solid">
            Solid Fill
          </DitherButton>
          <DitherButton variant="hatched" onClick={() => setDialogOpen(true)}>
            Open Dither Dialog
          </DitherButton>
        </div>

        <div class="max-w-md space-y-2 pt-2">
          <DitherInput
            placeholder="Search archive or paste URL..."
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
          />
          <div class="text-xs text-muted-foreground font-mono">
            Value: {inputValue() || '(empty)'}
          </div>
        </div>
      </section>

      {/* Popovers & Dialogs */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">3. Overlays & Dialogs</h2>
        <div class="flex gap-4">
          <DitherButton onClick={() => setDialogOpen(true)}>
            Test Dialog
          </DitherButton>
          
          <DitherPopover
            open={popoverOpen()}
            onClose={() => setPopoverOpen(false)}
            trigger={
              <DitherButton variant="dotted" onClick={() => setPopoverOpen(!popoverOpen())}>
                Toggle Popover
              </DitherButton>
            }
          >
            <div class="p-4 bg-popover text-popover-foreground border border-border rounded shadow-lg w-64 space-y-2">
              <div class="text-sm font-semibold">Dither Popover</div>
              <p class="text-xs text-muted-foreground">
                Accessible overlay positioned with native presence transitions.
              </p>
              <DitherButton variant="gradient" onClick={() => setPopoverOpen(false)}>
                Close
              </DitherButton>
            </div>
          </DitherPopover>
        </div>

        <DitherDialog
          open={dialogOpen()}
          onClose={() => setDialogOpen(false)}
          title="Dither Dialog Primitive"
          description="A fully accessible modal dialog with backdrop blur and focus trap."
          footer={
            <div class="flex justify-end gap-2">
              <DitherButton variant="dotted" onClick={() => setDialogOpen(false)}>
                Cancel
              </DitherButton>
              <DitherButton variant="gradient" onClick={() => setDialogOpen(false)}>
                Confirm
              </DitherButton>
            </div>
          }
        >
          <div class="py-4 text-sm text-muted-foreground">
            Dialog contents render cleanly inside the Dither portal root.
          </div>
        </DitherDialog>
      </section>

      {/* File Tree / Sidebar */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">4. Dither File Tree / Sidebar</h2>
        <div class="w-80 border border-border rounded-lg bg-card p-2">
          <DitherSidebar>
            <DitherSidebarGroup label="ARCHIVE">
              <DitherSidebarItem
                label="Library"
                active={activeTab() === 'library'}
                onClick={() => setActiveTab('library')}
              />
              <DitherSidebarItem
                label="Favorites"
                active={activeTab() === 'favorites'}
                onClick={() => setActiveTab('favorites')}
              />
              <DitherSidebarItem
                label="Recent"
                active={activeTab() === 'recent'}
                onClick={() => setActiveTab('recent')}
              />
            </DitherSidebarGroup>

            <DitherSidebarGroup label="FOLDERS">
              <DitherSidebarSub
                label="Engineering"
                modelValue={folderOpen()}
                onUpdateModelValue={(v) => setFolderOpen(v)}
              >
                <DitherSidebarItem
                  label="Frontend Architecture"
                  active={activeTab() === 'frontend'}
                  onClick={() => setActiveTab('frontend')}
                />
                <DitherSidebarItem
                  label="Dither Engine Specs"
                  active={activeTab() === 'specs'}
                  onClick={() => setActiveTab('specs')}
                />
              </DitherSidebarSub>
              <DitherSidebarItem
                label="Design Research"
                active={activeTab() === 'design'}
                onClick={() => setActiveTab('design')}
              />
            </DitherSidebarGroup>
          </DitherSidebar>
        </div>
      </section>

      {/* Dither Charts */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">5. Dither Charts & Sparklines</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 border border-border bg-card rounded-lg space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">Activity by Day (AreaChart)</span>
              <Sparkline data={[12, 19, 8, 25, 32, 15, 28]} color="blue" class="w-24 h-6" />
            </div>
            <div class="h-48 w-full">
              <AreaChart data={sampleData} config={areaConfig} class="h-48 w-full">
                <Grid />
                <XAxis dataKey="x" />
                <YAxis />
                <Area dataKey="y" />
              </AreaChart>
            </div>
          </div>

          <div class="p-6 border border-border bg-card rounded-lg space-y-4">
            <span class="text-sm font-medium">Bookmarks by Domain (BarChart)</span>
            <div class="h-48 w-full">
              <BarChart data={sampleData} config={barConfig} class="h-48 w-full">
                <Grid />
                <XAxis dataKey="x" />
                <YAxis />
                <Bar dataKey="y" />
              </BarChart>
            </div>
          </div>
        </div>
      </section>

      {/* Animation & Reveal */}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold border-b border-border/50 pb-2">6. Dither Reveal & Motion</h2>
        <DitherReveal>
          <div class="p-4 border border-accent/40 bg-accent/5 rounded text-sm text-foreground">
            Dither Reveal animation: Pixel transition effect respecting <code class="font-mono text-accent">prefers-reduced-motion</code>.
          </div>
        </DitherReveal>
      </section>
    </div>
  )
}
