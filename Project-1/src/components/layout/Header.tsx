import { createSignal } from 'solid-js'
import { A, useNavigate } from '@solidjs/router'
import DitherButton from '../../dither-kit/solid/DitherButton'

interface HeaderProps {
  onOpenSearch: () => void
  onOpenAddBookmark: () => void
}

export default function Header(props: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header class="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md px-4 lg:px-8 h-14 flex items-center justify-between">
      {/* Brand logo & wordmark — Always links to "/" */}
      <div class="flex items-center gap-6">
        <A href="/" class="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
          <div class="w-3.5 h-3.5 rotate-45 bg-accent transition-transform group-hover:scale-110 group-hover:rotate-90 duration-300" />
          <span class="font-bold tracking-tight text-lg text-foreground">Markly</span>
        </A>

        <nav class="hidden md:flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <A href="/library" class="hover:text-foreground transition-colors" activeClass="text-foreground">
            Archive
          </A>
          <A href="/analytics" class="hover:text-foreground transition-colors" activeClass="text-foreground">
            Visual Analytics
          </A>
          <A href="/lab" class="hover:text-foreground transition-colors" activeClass="text-foreground">
            Dither Lab
          </A>
        </nav>
      </div>

      {/* Right controls: Global Search trigger, Add Link, Profile */}
      <div class="flex items-center gap-3">
        {/* Search trigger */}
        <button
          type="button"
          onClick={props.onOpenSearch}
          class="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-card hover:bg-muted border border-border rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span class="hidden sm:inline">Search archive...</span>
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-background border border-border rounded font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Add Link button */}
        <DitherButton variant="gradient" onClick={props.onOpenAddBookmark} class="h-8 text-xs px-3">
          + Add Link
        </DitherButton>

        {/* Profile access */}
        <A
          href="/profile"
          class="flex size-8 items-center justify-center rounded-full bg-card border border-border text-xs font-mono text-foreground hover:border-accent transition-colors"
          title="Profile & Settings"
        >
          M
        </A>
      </div>
    </header>
  )
}
