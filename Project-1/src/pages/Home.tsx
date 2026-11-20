import { createSignal, onMount, For, Show } from 'solid-js'
import { A, useNavigate } from '@solidjs/router'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherAurora from '../dither-kit/solid/Aurora'
import DitherGradientText from '../dither-kit/solid/GradientText'
import DitherAsciiText from '../dither-kit/solid/AsciiText'
import DitherReveal from '../dither-kit/solid/DitherReveal'
import { AreaChart } from '../dither-kit/solid/area-chart'
import Area from '../dither-kit/solid/Area'
import Grid from '../dither-kit/solid/Grid'
import XAxis from '../dither-kit/solid/XAxis'
import YAxis from '../dither-kit/solid/YAxis'
import type { ChartConfig } from '../dither-kit/engine/chart-types'
import { db } from '../data/db'
import { SAMPLE_BOOKMARKS, SAMPLE_FOLDERS, SAMPLE_STASH } from '../data/sample-data'

export default function Home() {
  const navigate = useNavigate()
  const [hasData, setHasData] = createSignal(false)

  onMount(async () => {
    const bms = await db.getAllBookmarks(false)
    setHasData(bms.length > 0)
  })

  const loadSampleData = async () => {
    for (const f of SAMPLE_FOLDERS) await db.saveFolder(f)
    for (const b of SAMPLE_BOOKMARKS) await db.saveBookmark(b)
    await db.saveStashSession(SAMPLE_STASH)
    setHasData(true)
    navigate('/library')
  }

  const teaserChartData = [
    { x: 'Sep', y: 14 },
    { x: 'Oct', y: 28 },
    { x: 'Nov', y: 56 },
    { x: 'Dec', y: 72 },
  ]

  const teaserConfig: ChartConfig = {
    y: { label: 'Knowledge Growth', color: 'blue' },
  }

  return (
    <div class="space-y-24 pb-24">
      {/* 1. Immersive Hero Section */}
      <section class="relative min-h-[85vh] flex flex-col justify-center items-center text-center px-4 overflow-hidden border-b border-border/60">
        {/* Generative Dither Aurora Art Background Layer */}
        <div class="absolute inset-0 pointer-events-none opacity-25">
          <DitherAurora />
        </div>

        <div class="relative z-10 max-w-4xl mx-auto space-y-6 pt-12">
          {/* Brand mark */}
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-card/80 text-xs font-mono text-muted-foreground mb-4">
            <span class="w-2 h-2 rotate-45 bg-accent" />
            <span>Markly 1.0 — Dither-Native Knowledge Archive</span>
          </div>

          {/* Headline */}
          <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            A quieter place for <br />
            <DitherGradientText class="bg-clip-text text-transparent">
              everything worth keeping.
            </DitherGradientText>
          </h1>

          {/* Support copy */}
          <p class="max-w-xl mx-auto text-muted-foreground text-base sm:text-lg">
            Save articles, repositories, documents and visual references. Group them into recursive folders, search instantly, and understand your archive without noise.
          </p>

          {/* Primary & Secondary Actions */}
          <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
            <DitherButton variant="gradient" onClick={() => navigate('/library')} class="h-11 px-6 text-sm font-semibold">
              Open Archive →
            </DitherButton>
            <DitherButton variant="dotted" onClick={() => navigate('/analytics')} class="h-11 px-6 text-sm font-medium">
              Explore Visual Analytics
            </DitherButton>
            <Show when={!hasData()}>
              <DitherButton variant="solid" onClick={loadSampleData} class="h-11 px-6 text-sm">
                ⚡ Load Sample Archive
              </DitherButton>
            </Show>
          </div>

          {/* Interactive Living Archive Preview Artifact */}
          <div class="pt-12 max-w-2xl mx-auto">
            <div class="p-4 rounded-xl border border-border bg-card/90 shadow-2xl space-y-3 text-left">
              <div class="flex items-center justify-between pb-2 border-b border-border/40 text-xs text-muted-foreground font-mono">
                <span class="flex items-center gap-2">
                  <span class="size-2 rounded-full bg-accent animate-pulse" />
                  LIVING ARCHIVE ARTIFACT
                </span>
                <span>LOCAL-FIRST PERSISTENCE</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div class="p-2.5 rounded bg-muted/40 border border-border/60">
                  <div class="text-[10px] text-muted-foreground font-mono">PRIMARY SCOPE</div>
                  <div class="font-semibold text-foreground pt-1">Personal Archive</div>
                  <div class="text-[11px] text-accent font-mono pt-0.5">IndexedDB local-first</div>
                </div>
                <div class="p-2.5 rounded bg-muted/40 border border-border/60">
                  <div class="text-[10px] text-muted-foreground font-mono">DESIGN SYSTEM</div>
                  <div class="font-semibold text-foreground pt-1">Dither UI</div>
                  <div class="text-[11px] text-accent font-mono pt-0.5">312 catalogue items</div>
                </div>
                <div class="p-2.5 rounded bg-muted/40 border border-border/60">
                  <div class="text-[10px] text-muted-foreground font-mono">ANALYTICS</div>
                  <div class="font-semibold text-foreground pt-1">Dedicated Canvas</div>
                  <div class="text-[11px] text-accent font-mono pt-0.5">Zero dashboard clutter</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Story Section A: Capture */}
      <section class="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div class="space-y-4">
          <div class="text-xs uppercase font-mono tracking-wider text-accent font-semibold">01 / CAPTURE</div>
          <h2 class="text-3xl font-bold tracking-tight text-foreground">Save anything in seconds.</h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Paste a URL, customize the title, assign tags, and route it to any nested folder. Everything is stored locally in your browser's IndexedDB with no tracking, no mandatory cloud accounts, and no sync delays.
          </p>
          <div class="pt-2">
            <A href="/library" class="text-xs text-accent font-mono hover:underline">
              Try adding a link in Library →
            </A>
          </div>
        </div>
        <div class="p-6 rounded-lg border border-border bg-card shadow-lg space-y-3">
          <div class="text-xs text-muted-foreground font-mono pb-1 border-b border-border/50">Capture Interface</div>
          <div class="p-3 bg-background border border-border rounded font-mono text-xs text-foreground">
            https://dither-ui.com/
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono bg-accent/15 text-accent px-2 py-0.5 rounded">#dither</span>
            <span class="text-xs font-mono bg-accent/15 text-accent px-2 py-0.5 rounded">#design-system</span>
            <span class="text-xs text-muted-foreground font-mono">📁 Engineering / UI</span>
          </div>
        </div>
      </section>

      {/* 3. Story Section B: Find */}
      <section class="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div class="p-6 rounded-lg border border-border bg-card shadow-lg space-y-3 order-2 md:order-1">
          <div class="flex items-center justify-between text-xs text-muted-foreground font-mono pb-1 border-b border-border/50">
            <span>Global Command Overlay</span>
            <kbd class="px-1.5 py-0.5 bg-background border border-border rounded">⌘K</kbd>
          </div>
          <div class="space-y-2">
            <div class="p-2.5 rounded bg-accent/15 border-l-2 border-accent text-xs">
              <div class="font-semibold text-foreground">Dither UI — Ordered Dither UI Toolkit</div>
              <div class="text-muted-foreground font-mono text-[10px]">dither-ui.com • visited 42 times</div>
            </div>
            <div class="p-2.5 rounded bg-muted/40 text-xs">
              <div class="font-semibold text-foreground">WebGL Fundamentals</div>
              <div class="text-muted-foreground font-mono text-[10px]">webglfundamentals.org</div>
            </div>
          </div>
        </div>
        <div class="space-y-4 order-1 md:order-2">
          <div class="text-xs uppercase font-mono tracking-wider text-accent font-semibold">02 / FIND</div>
          <h2 class="text-3xl font-bold tracking-tight text-foreground">Instant cross-field search.</h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Press <code class="font-mono text-foreground bg-muted px-1 py-0.5 rounded">⌘K</code> or <code class="font-mono text-foreground bg-muted px-1 py-0.5 rounded">Ctrl+K</code> from any page to invoke the global command palette. Search titles, domains, descriptions, notes, and tags in real-time.
          </p>
        </div>
      </section>

      {/* 4. Story Section C: Organize with Dither File Tree */}
      <section class="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div class="space-y-4">
          <div class="text-xs uppercase font-mono tracking-wider text-accent font-semibold">03 / ORGANIZE</div>
          <h2 class="text-3xl font-bold tracking-tight text-foreground">Recursive folder tree with nested guide rails.</h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Markly uses Dither UI's signature File Tree component: infinite subfolder nesting, active item highlighting with ordered-dither rails, and collapsible groups that keep your reading hierarchy organized.
          </p>
        </div>
        <div class="p-6 rounded-lg border border-border bg-card shadow-lg font-mono text-xs space-y-2">
          <div class="text-muted-foreground pb-1 border-b border-border/50">ARCHIVE EXPLORER</div>
          <div class="text-foreground">📁 Engineering</div>
          <div class="pl-4 text-accent border-l border-border/80">└── 📁 Frontend & UI (2)</div>
          <div class="pl-4 text-foreground border-l border-border/80">└── 📁 Shaders & Canvas (1)</div>
          <div class="text-foreground">📁 Design Systems (2)</div>
          <div class="text-foreground">📁 Research Papers (1)</div>
        </div>
      </section>

      {/* 5. Story Section D: Dedicated Visual Analytics Teaser */}
      <section class="max-w-5xl mx-auto px-4 space-y-8">
        <div class="text-center max-w-xl mx-auto space-y-3">
          <div class="text-xs uppercase font-mono tracking-wider text-accent font-semibold">04 / UNDERSTAND</div>
          <h2 class="text-3xl font-bold tracking-tight text-foreground">Dedicated Visual Analytics.</h2>
          <p class="text-muted-foreground text-sm">
            We don't put KPI counters and charts on every page. All intelligence lives in one focused, canvas-first workspace where you create, configure, and save visual boxes.
          </p>
        </div>

        <div class="p-8 rounded-xl border border-border bg-card shadow-xl max-w-3xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">Archive Growth Trajectory</span>
            <span class="text-xs text-accent font-mono">Dither Area Chart</span>
          </div>
          <div class="h-44 w-full">
            <AreaChart data={teaserChartData} config={teaserConfig} class="h-44 w-full">
              <Grid />
              <XAxis dataKey="x" />
              <YAxis />
              <Area dataKey="y" />
            </AreaChart>
          </div>
          <div class="text-center pt-2">
            <A href="/analytics">
              <DitherButton variant="gradient" class="text-xs px-4">
                Open Visual Analytics Workspace →
              </DitherButton>
            </A>
          </div>
        </div>
      </section>

      {/* 6. Built with Dither UI & Lab Link */}
      <section class="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div class="text-xs uppercase font-mono tracking-wider text-accent font-semibold">05 / DESIGN SOURCE</div>
        <h2 class="text-3xl font-bold tracking-tight text-foreground">Crafted entirely with Dither UI.</h2>
        <p class="text-muted-foreground text-sm max-w-xl mx-auto">
          Every button, chart, input, dialog, background and animation comes directly from the official Dither UI kit. Visit Dither Lab to explore the complete 312-item catalogue.
        </p>
        <div>
          <A href="/lab">
            <DitherButton variant="dotted" class="px-6 text-sm">
              Explore Dither Lab Catalogue (312 items) →
            </DitherButton>
          </A>
        </div>
      </section>

      {/* Footer */}
      <footer class="max-w-5xl mx-auto px-4 pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div>Markly — A quieter digital archive</div>
        <div class="flex items-center gap-4">
          <A href="/library" class="hover:text-foreground">Library</A>
          <A href="/analytics" class="hover:text-foreground">Analytics</A>
          <A href="/lab" class="hover:text-foreground">Dither Lab</A>
          <A href="/feedback" class="hover:text-foreground">Feedback</A>
        </div>
      </footer>
    </div>
  )
}
