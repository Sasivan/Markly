import { createSignal, Show, For } from 'solid-js'
import DitherButton from '../../dither-kit/solid/DitherButton'
import type { Bookmark } from '../../domain/types'

interface BookmarkRowProps {
  bookmark: Bookmark
  folderName?: string
  onToggleFavorite: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
  onDelete: (id: string) => void
  onOpen: (bookmark: Bookmark) => void
}

export default function BookmarkRow(props: BookmarkRowProps) {
  const [copied, setCopied] = createSignal(false)

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation()
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(props.bookmark.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      onClick={() => props.onOpen(props.bookmark)}
      class="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-b border-border/60 hover:bg-card/80 transition-colors cursor-pointer"
    >
      {/* Left: Favicon, Title, Domain, Description, Tags */}
      <div class="flex items-start gap-3 min-w-0 flex-1">
        <div class="mt-0.5 size-7 rounded bg-muted/60 border border-border/80 flex items-center justify-center shrink-0 overflow-hidden text-xs font-mono font-medium text-foreground">
          <Show
            when={props.bookmark.faviconUrl}
            fallback={<span>{props.bookmark.domain.slice(0, 1).toUpperCase()}</span>}
          >
            <img
              src={props.bookmark.faviconUrl}
              alt=""
              class="size-4 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </Show>
        </div>

        <div class="space-y-1 min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm text-foreground group-hover:text-accent transition-colors truncate">
              {props.bookmark.title}
            </span>
            <span class="text-[11px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">
              {props.bookmark.domain}
            </span>
            <Show when={props.folderName}>
              <span class="text-[10px] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded">
                📁 {props.folderName}
              </span>
            </Show>
          </div>

          <Show when={props.bookmark.description}>
            <p class="text-xs text-muted-foreground line-clamp-1">
              {props.bookmark.description}
            </p>
          </Show>

          <Show when={props.bookmark.tags && props.bookmark.tags.length > 0}>
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
              <For each={props.bookmark.tags}>
                {(tag) => (
                  <span class="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.2 rounded">
                    #{tag}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Right: Visits, Date, Action buttons */}
      <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <div class="text-right hidden md:block text-[11px] font-mono text-muted-foreground">
          <div>{props.bookmark.visitCount} visits</div>
          <div class="text-[10px]">
            {new Date(props.bookmark.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div class="flex items-center gap-1">
          {/* Favorite button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onToggleFavorite(props.bookmark.id)
            }}
            class={`p-1.5 rounded hover:bg-muted transition-colors ${
              props.bookmark.isFavorite ? 'text-yellow-400' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={props.bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            ★
          </button>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            class="p-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            title="Copy URL"
          >
            {copied() ? '✓' : '⧉'}
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onEdit(props.bookmark)
            }}
            class="p-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            title="Edit bookmark"
          >
            ✎
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onDelete(props.bookmark.id)
            }}
            class="p-1.5 text-xs text-muted-foreground hover:text-red-400 rounded hover:bg-muted transition-colors"
            title="Move to trash"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
