import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import DitherDialog from '../../dither-kit/solid/DitherDialog'
import DitherInput from '../../dither-kit/solid/DitherInput'
import { bookmarkService } from '../../services/bookmarkService'
import type { Bookmark } from '../../domain/types'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export default function GlobalSearch(props: GlobalSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = createSignal('')
  const [results, setResults] = createSignal<Bookmark[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  createEffect(async () => {
    if (props.open) {
      const q = query()
      const bms = await bookmarkService.getBookmarks({ query: q })
      setResults(bms.slice(0, 10))
      setSelectedIndex(0)
    }
  })

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(results().length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results()[selectedIndex()]
      if (item) {
        props.onClose()
        window.open(item.url, '_blank')
      }
    } else if (e.key === 'Escape') {
      props.onClose()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <DitherDialog
      open={props.open}
      onClose={props.onClose}
      title="Search Archive"
      description="Instant search across title, URL, domain, description, notes, and tags."
    >
      <div class="space-y-4 pt-2">
        <DitherInput
          placeholder="Type to search... (arrows to navigate, Enter to open)"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          autofocus
        />

        <div class="max-h-80 overflow-y-auto divide-y divide-border/40">
          <For each={results()}>
            {(bookmark, index) => (
              <div
                class={`p-3 cursor-pointer rounded transition-colors flex items-center justify-between ${
                  index() === selectedIndex() ? 'bg-accent/15 border-l-2 border-accent' : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  props.onClose()
                  window.open(bookmark.url, '_blank')
                }}
              >
                <div class="space-y-1 min-w-0 pr-4">
                  <div class="font-medium text-sm text-foreground truncate">
                    {bookmark.title}
                  </div>
                  <div class="text-xs text-muted-foreground flex items-center gap-2">
                    <span class="font-mono text-accent">{bookmark.domain}</span>
                    <Show when={bookmark.description}>
                      <span class="truncate max-w-xs">{bookmark.description}</span>
                    </Show>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <Show when={bookmark.isFavorite}>
                    <span class="text-xs text-yellow-500">★</span>
                  </Show>
                  <span class="text-[10px] text-muted-foreground font-mono">
                    {bookmark.visitCount} visits
                  </span>
                </div>
              </div>
            )}
          </For>

          <Show when={results().length === 0}>
            <div class="py-8 text-center text-sm text-muted-foreground">
              No bookmarks found matching "{query()}".
            </div>
          </Show>
        </div>
      </div>
    </DitherDialog>
  )
}
