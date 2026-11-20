import { createSignal, createMemo, For, Show, Switch, Match } from 'solid-js'
import { useSearchParams } from '@solidjs/router'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherInput from '../dither-kit/solid/DitherInput'
import DitherAvatar from '../dither-kit/solid/DitherAvatar'
import DitherBadge from '../dither-kit/solid/DitherBadge'
import DitherRating from '../dither-kit/solid/DitherRating'
import DitherSwitch from '../dither-kit/solid/DitherSwitch'
import DitherProgress from '../dither-kit/solid/DitherProgress'
import DitherSlider from '../dither-kit/solid/DitherSlider'
import DitherTooltip from '../dither-kit/solid/DitherTooltip'
import DitherPopover from '../dither-kit/solid/DitherPopover'
import DitherAccordion from '../dither-kit/solid/DitherAccordion'
import DitherTimeline from '../dither-kit/solid/DitherTimeline'
import DitherConsole from '../dither-kit/solid/DitherConsole'

// Backgrounds
import DitherAurora from '../dither-kit/solid/Aurora'
import DitherPoster from '../dither-kit/solid/DitherPoster'
import DitherDither from '../dither-kit/solid/Dither'
import DitherGalaxy from '../dither-kit/solid/Galaxy'
import DitherGrainient from '../dither-kit/solid/Grainient'
import DitherDotGrid from '../dither-kit/solid/DotGrid'
import DitherCircuit from '../dither-kit/solid/Circuit'
import DitherWaves from '../dither-kit/solid/Waves'
import DitherSilk from '../dither-kit/solid/Silk'
import DitherBalatro from '../dither-kit/solid/Balatro'
import DitherBallpit from '../dither-kit/solid/Ballpit'
import DitherPlasma from '../dither-kit/solid/Plasma'
import DitherNoise from '../dither-kit/solid/Noise'

// Text Effects
import DitherAsciiText from '../dither-kit/solid/AsciiText'
import DitherGradientText from '../dither-kit/solid/GradientText'
import DitherDecryptedText from '../dither-kit/solid/DecryptedText'
import DitherShinyText from '../dither-kit/solid/ShinyText'
import DitherGlitchText from '../dither-kit/solid/GlitchText'
import DitherFuzzyText from '../dither-kit/solid/FuzzyText'
import DitherTrueFocus from '../dither-kit/solid/TrueFocus'
import DitherCircularText from '../dither-kit/solid/CircularText'

// Animations & Motion
import DitherReveal from '../dither-kit/solid/DitherReveal'
import DitherScrollReveal from '../dither-kit/solid/ScrollReveal'
import DitherElectricBorder from '../dither-kit/solid/ElectricBorder'
import DitherStarBorder from '../dither-kit/solid/StarBorder'
import DitherMagnet from '../dither-kit/solid/Magnet'
import DitherGlareHover from '../dither-kit/solid/GlareHover'
import DitherDock from '../dither-kit/solid/Dock'

// Charts
import Sparkline from '../dither-kit/solid/Sparkline'
import { AreaChart } from '../dither-kit/solid/area-chart'
import { BarChart } from '../dither-kit/solid/bar-chart'
import { PieChart } from '../dither-kit/solid/pie-chart'
import Area from '../dither-kit/solid/Area'
import Bar from '../dither-kit/solid/Bar'
import Grid from '../dither-kit/solid/Grid'
import XAxis from '../dither-kit/solid/XAxis'
import YAxis from '../dither-kit/solid/YAxis'
import type { ChartConfig } from '../dither-kit/engine/chart-types'

// Manifest
import manifestData from '../../markly-dither-fresh-start/catalogue-manifest.json'

interface ManifestItem {
  index: number
  id: string
  name: string
  title: string
  category: string
  subcategory: string | null
  docsUrl: string
  sourceUrl: string
  frameworkVariant: string
  status: string
  marklyLocation: string
  interactiveChecks: string[]
  notes: string
}

export default function Lab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = createSignal<string>(
    (searchParams.cat as string) || 'All',
  )
  const [searchQuery, setSearchQuery] = createSignal('')
  const [selectedItemId, setSelectedItemId] = createSignal<string>(
    (searchParams.item as string) || 'button',
  )
  const [interactiveSeed, setInteractiveSeed] = createSignal(42)
  const [popoverOpen, setPopoverOpen] = createSignal(false)
  const [switchChecked, setSwitchChecked] = createSignal(true)
  const [sliderVal, setSliderVal] = createSignal(65)
  const [ratingVal, setRatingVal] = createSignal(4)
  const [copiedCode, setCopiedCode] = createSignal(false)

  const items = manifestData.items as ManifestItem[]
  const categories = [
    'All',
    'Overview',
    'Primitives',
    'Typography',
    'Handbook',
    'Examples',
    'Components',
    'Backgrounds',
    'Text',
    'Animations',
    'Utils',
  ]

  const categoryCounts = () => {
    const counts: Record<string, number> = { All: items.length }
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1
    }
    return counts
  }

  const filteredItems = createMemo(() => {
    let list = items
    if (selectedCategory() !== 'All') {
      list = list.filter(i => i.category === selectedCategory())
    }
    if (searchQuery().trim()) {
      const q = searchQuery().toLowerCase().trim()
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.subcategory && i.subcategory.toLowerCase().includes(q)),
      )
    }
    return list
  })

  const selectedItem = createMemo(() => {
    return items.find(i => i.id === selectedItemId()) || filteredItems()[0] || items[0]
  })

  const sampleChartData = [
    { x: 'Mon', y: 15 },
    { x: 'Tue', y: 32 },
    { x: 'Wed', y: 22 },
    { x: 'Thu', y: 48 },
    { x: 'Fri', y: 64 },
    { x: 'Sat', y: 38 },
    { x: 'Sun', y: 52 },
  ]
  const sampleConfig: ChartConfig = {
    y: { label: 'Metric', color: 'blue' },
  }

  const handleCopyCode = () => {
    const code = `import { ${selectedItem()?.name.replace(/[^A-Za-z0-9]/g, '')} } from "@dither-kit"`
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <div class="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      {/* 1. Left Catalogue Navigation Rail */}
      <aside class="w-full md:w-80 border-r border-border bg-card/60 flex flex-col shrink-0 overflow-hidden">
        {/* Header & Search */}
        <div class="p-3.5 border-b border-border space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm tracking-tight text-foreground">Dither Lab</span>
            <span class="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded font-semibold">
              312 Items
            </span>
          </div>

          <DitherInput
            placeholder="Search all 312 components..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />

          {/* Category Chips */}
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
            <For each={categories}>
              {(cat) => (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  class={`px-2 py-0.5 rounded whitespace-nowrap transition-colors ${
                    selectedCategory() === cat
                      ? 'bg-accent text-white font-semibold'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {cat} ({categoryCounts()[cat] || 0})
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Item List */}
        <div class="flex-1 overflow-y-auto divide-y divide-border/30">
          <For each={filteredItems()}>
            {(item) => (
              <button
                type="button"
                onClick={() => {
                  setSelectedItemId(item.id)
                  setSearchParams({ cat: selectedCategory(), item: item.id })
                }}
                class={`w-full p-2.5 text-left transition-colors flex items-center justify-between ${
                  selectedItem()?.id === item.id
                    ? 'bg-accent/15 border-l-2 border-accent text-foreground'
                    : 'hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div class="min-w-0 pr-2">
                  <div class="font-medium text-xs text-foreground truncate">{item.name}</div>
                  <div class="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1.5">
                    <span>{item.category}</span>
                    <Show when={item.subcategory}>
                      <span>• {item.subcategory}</span>
                    </Show>
                  </div>
                </div>

                <span
                  class={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${
                    item.status === 'core-product'
                      ? 'bg-green-500/15 text-green-400 font-semibold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.status === 'core-product' ? 'Product' : 'Lab'}
                </span>
              </button>
            )}
          </For>

          <Show when={filteredItems().length === 0}>
            <div class="p-8 text-center text-xs text-muted-foreground font-mono">
              No catalogue items match your search.
            </div>
          </Show>
        </div>
      </aside>

      {/* 2. Main Live Interactive Preview Stage */}
      <section class="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top bar of selected item */}
        <div class="p-4 border-b border-border bg-card/40 flex items-center justify-between gap-4">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-foreground">{selectedItem()?.name}</h2>
              <span class="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                /docs/{selectedItem()?.id}
              </span>
            </div>
            <p class="text-xs text-muted-foreground font-mono">
              Category: {selectedItem()?.category} {selectedItem()?.subcategory ? `• ${selectedItem()?.subcategory}` : ''}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <DitherButton variant="dotted" onClick={handleCopyCode} class="text-xs h-7">
              {copiedCode() ? 'Copied ✓' : 'Copy Import'}
            </DitherButton>
            <a
              href={selectedItem()?.docsUrl}
              target="_blank"
              rel="noreferrer"
              class="px-2.5 py-1 text-xs font-mono bg-card hover:bg-muted border border-border rounded text-foreground transition-colors"
            >
              Official Docs ↗
            </a>
          </div>
        </div>

        {/* Center Live Interactive Canvas */}
        <div class="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center relative">
          <div class="w-full max-w-3xl min-h-[380px] border border-border rounded-xl bg-card p-8 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
            {/* Dynamic Interactive Component Switcher based on Item ID & Category */}
            <Switch>
              {/* Specific component matching */}
              <Match when={selectedItem()?.id === 'button'}>
                <div class="space-y-6 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Button Component</div>
                  <div class="flex justify-center gap-4 flex-wrap">
                    <DitherButton variant="gradient">Gradient Button</DitherButton>
                    <DitherButton variant="dotted">Dotted Button</DitherButton>
                    <DitherButton variant="solid">Solid Button</DitherButton>
                    <DitherButton variant="hatched">Hatched Button</DitherButton>
                  </div>
                  <p class="text-xs text-muted-foreground max-w-sm mx-auto">
                    Visibly transforms pixel density and matrix fill on hover and press.
                  </p>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'avatar'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Generative Dither Avatar</div>
                  <div class="flex justify-center gap-6">
                    <DitherAvatar name="Alice" seed={42} class="size-14" />
                    <DitherAvatar name="Bob" seed={108} class="size-14" />
                    <DitherAvatar name="Markly" seed={interactiveSeed()} class="size-14" />
                  </div>
                  <div class="text-xs text-muted-foreground font-mono">
                    Deterministic seed: #{interactiveSeed()}
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'badge'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Badges</div>
                  <div class="flex justify-center gap-3">
                    <DitherBadge variant="solid">Active</DitherBadge>
                    <DitherBadge variant="dotted">Archived</DitherBadge>
                    <DitherBadge variant="hatched">Tag</DitherBadge>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'switch'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Switch</div>
                  <div class="flex justify-center items-center gap-3">
                    <DitherSwitch modelValue={switchChecked()} onUpdateModelValue={setSwitchChecked} label="Demo Switch" />
                    <span class="text-xs font-mono">{switchChecked() ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'rating'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Star Rating</div>
                  <DitherRating modelValue={ratingVal()} onUpdateModelValue={setRatingVal} max={5} />
                  <div class="text-xs text-muted-foreground font-mono">Value: {ratingVal()} / 5</div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'slider'}>
                <div class="space-y-4 text-center w-64">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Slider</div>
                  <DitherSlider
                    modelValue={sliderVal()}
                    onUpdateModelValue={(v) => setSliderVal(typeof v === 'number' ? v : v[0])}
                    min={0}
                    max={100}
                    label="Demo Slider"
                  />
                  <div class="text-xs text-muted-foreground font-mono">{sliderVal()}%</div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'sparkline'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Sparkline</div>
                  <div class="flex justify-center gap-6">
                    <Sparkline data={[10, 25, 18, 42, 35, 60]} color="blue" class="w-32 h-10" />
                    <Sparkline data={[60, 45, 52, 30, 25, 12]} color="purple" class="w-32 h-10" />
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'area' || selectedItem()?.id === 'chart'}>
                <div class="w-full space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Area Chart</div>
                  <div class="h-48 w-full">
                    <AreaChart data={sampleChartData} config={sampleConfig} class="h-48 w-full">
                      <Grid />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Area dataKey="y" />
                    </AreaChart>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'bar'}>
                <div class="w-full space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Dither Bar Chart</div>
                  <div class="h-48 w-full">
                    <BarChart data={sampleChartData} config={sampleConfig} class="h-48 w-full">
                      <Grid />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Bar dataKey="y" />
                    </BarChart>
                  </div>
                </div>
              </Match>

              {/* Specific Background Matchers */}
              <Match when={selectedItem()?.id === 'aurora'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherAurora />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Aurora Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Continuous generative shader</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'poster'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherPoster />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Poster Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Dithered block pattern layout</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'dither'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherDither />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Ordered Dither Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Bayer 4x4 matrix material layer</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'galaxy'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherGalaxy />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Galaxy Shader Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Rotating galactic dust particle field</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'grainient'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherGrainient />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Grainient Shader Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Dynamic noise gradient texture</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'dot-grid'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-60">
                    <DitherDotGrid />
                  </div>
                  <div class="relative z-10 p-4 bg-card/80 backdrop-blur rounded border border-border text-center">
                    <div class="text-sm font-bold text-foreground">Dot Grid Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Perceptual halftone dot matrix</div>
                  </div>
                </div>
              </Match>

              {/* Specific Text Matchers */}
              <Match when={selectedItem()?.id === 'gradient-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Gradient Text</div>
                  <DitherGradientText class="text-3xl font-extrabold">
                    A quieter place for everything worth keeping
                  </DitherGradientText>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'ascii-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">ASCII Text</div>
                  <DitherAsciiText text="DITHER UI" class="text-2xl font-mono text-accent" />
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'decrypted-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Decrypted Text</div>
                  <DitherDecryptedText text="KNOWLEDGE ARCHIVE ENGINE" class="text-lg font-mono text-foreground" />
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'shiny-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Shiny Text Effect</div>
                  <DitherShinyText class="text-2xl font-bold">
                    Radiant Dither Illumination
                  </DitherShinyText>
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'glitch-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Glitch Text</div>
                  <DitherGlitchText text="SIGNAL GLITCH" class="text-2xl font-mono font-bold text-accent" />
                </div>
              </Match>

              <Match when={selectedItem()?.id === 'fuzzy-text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Fuzzy Text</div>
                  <DitherFuzzyText text="FUZZY RASTER" class="text-2xl font-bold" />
                </div>
              </Match>

              {/* Fallback per Category */}
              <Match when={selectedItem()?.category === 'Backgrounds'}>
                <div class="relative w-full h-72 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  <div class="absolute inset-0 pointer-events-none opacity-50">
                    <DitherAurora />
                  </div>
                  <div class="relative z-10 p-5 bg-card/85 backdrop-blur-md rounded-lg border border-border text-center space-y-1">
                    <div class="text-sm font-bold text-foreground">{selectedItem()?.name} Background</div>
                    <div class="text-[11px] text-muted-foreground font-mono">Dither canvas shader layer preview</div>
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.category === 'Text'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Text Effect Demonstration</div>
                  <DitherGradientText class="text-3xl font-extrabold">
                    {selectedItem()?.name}
                  </DitherGradientText>
                  <DitherDecryptedText text="Deterministic Typography Engine" class="text-sm font-mono text-muted-foreground" />
                </div>
              </Match>

              <Match when={selectedItem()?.category === 'Animations'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Motion & Animation</div>
                  <DitherReveal>
                    <div class="p-6 border border-accent/40 bg-accent/10 rounded-lg text-foreground font-medium text-sm">
                      {selectedItem()?.name} Motion Sequence
                    </div>
                  </DitherReveal>
                  <div class="text-[11px] font-mono text-muted-foreground">
                    Engine transitions respecting prefers-reduced-motion
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.category === 'Examples'}>
                <div class="space-y-4 text-center max-w-md">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Pattern Example</div>
                  <div class="text-base font-semibold text-foreground">{selectedItem()?.name} Pattern</div>
                  <div class="p-4 bg-muted/40 border border-border rounded text-xs text-muted-foreground leading-relaxed">
                    Isolated demonstration pattern from Dither UI documentation. Cleanly sequestered in Dither Lab so Markly's core archive workflows stay uncluttered.
                  </div>
                  <Sparkline data={[10, 25, 15, 30, 45, 60]} color="purple" class="w-32 h-8 mx-auto" />
                </div>
              </Match>

              <Match when={selectedItem()?.category === 'Typography'}>
                <div class="space-y-4 text-center max-w-md">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Typography Element</div>
                  <h3 class="text-2xl font-bold text-foreground">
                    {selectedItem()?.name}
                  </h3>
                  <p class="text-xs text-muted-foreground font-mono">
                    "A quieter place for everything worth keeping."
                  </p>
                  <div class="p-3 bg-muted/30 border border-border rounded font-mono text-xs">
                    <span class="text-accent">DitherText</span> — Tone, matrix and weight control
                  </div>
                </div>
              </Match>

              <Match when={selectedItem()?.category === 'Primitives'}>
                <div class="space-y-4 text-center">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Primitive: {selectedItem()?.name}</div>
                  <div class="p-4 border border-dashed border-border rounded font-mono text-xs text-muted-foreground">
                    Semantic primitive styled through the Dither material token layer.
                  </div>
                  <DitherButton variant="dotted">Test Press Target</DitherButton>
                </div>
              </Match>

              <Match when={true}>
                <div class="space-y-3 text-center max-w-md">
                  <div class="text-xs font-mono uppercase text-accent font-semibold">Catalogue Specification</div>
                  <div class="text-lg font-bold text-foreground">{selectedItem()?.name}</div>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    Official guideline specifying the material system, ordered dithering raster algorithms, color tone mirror, and accessibility standards for Markly.
                  </p>
                  <div class="flex justify-center gap-2 pt-2">
                    <div class="w-6 h-6 rounded bg-[rgb(14,122,60)]" title="Swatch Green" />
                    <div class="w-6 h-6 rounded bg-[rgb(24,104,204)]" title="Swatch Blue" />
                    <div class="w-6 h-6 rounded bg-[rgb(112,72,220)]" title="Swatch Purple" />
                    <div class="w-6 h-6 rounded bg-[rgb(190,42,142)]" title="Swatch Pink" />
                    <div class="w-6 h-6 rounded bg-[rgb(160,82,6)]" title="Swatch Orange" />
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        </div>

        {/* 3. Bottom Inspector Panel */}
        <div class="p-4 border-t border-border bg-card/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div class="flex items-center gap-4 flex-wrap">
            <span>Status: <strong class="text-foreground">{selectedItem()?.status}</strong></span>
            <span>Location: <strong class="text-foreground">{selectedItem()?.marklyLocation}</strong></span>
            <span>Variant: <strong class="text-foreground">{selectedItem()?.frameworkVariant}</strong></span>
          </div>

          <div class="flex items-center gap-2">
            <span>Seed:</span>
            <input
              type="number"
              value={interactiveSeed()}
              onInput={(e) => setInteractiveSeed(Number(e.currentTarget.value) || 42)}
              class="w-16 h-7 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
