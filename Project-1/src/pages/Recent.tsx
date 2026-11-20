import { createSignal, onMount, onCleanup, For, Show } from 'solid-js'
import BookmarkRow from '../components/bookmarks/BookmarkRow'
import { bookmarkService } from '../services/bookmarkService'
import { folderService } from '../services/folderService'
import type { Bookmark, Folder } from '../domain/types'

export default function Recent() {
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([])
  const [folders, setFolders] = createSignal<Folder[]>([])
  const [loading, setLoading] = createSignal(true)

  const loadData = async () => {
    setLoading(true)
    const [bList, fList] = await Promise.all([
      bookmarkService.getRecentBookmarks(30),
      folderService.getFolders(),
    ])
    setBookmarks(bList)
    setFolders(fList)
    setLoading(false)
  }

  onMount(() => {
    loadData()
    const handleDataChanged = () => loadData()
    window.addEventListener('markly:data-changed', handleDataChanged)
    onCleanup(() => window.removeEventListener('markly:data-changed', handleDataChanged))
  })

  const folderMap = () => new Map(folders().map(f => [f.id, f.name]))

  const handleToggleFavorite = async (id: string) => {
    await bookmarkService.toggleFavorite(id)
    loadData()
  }

  const handleDelete = async (id: string) => {
    await bookmarkService.deleteBookmark(id)
    loadData()
  }

  const handleOpen = async (bookmark: Bookmark) => {
    await bookmarkService.recordVisit(bookmark.id)
    window.open(bookmark.url, '_blank')
    loadData()
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Recently Visited</h1>
          <p class="text-xs text-muted-foreground font-mono">
            Links you have opened or revisited recently
          </p>
        </div>
      </div>

      <div class="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border/60">
        <For each={bookmarks()}>
          {(bookmark) => (
            <BookmarkRow
              bookmark={bookmark}
              folderName={bookmark.folderId ? folderMap().get(bookmark.folderId) : undefined}
              onToggleFavorite={handleToggleFavorite}
              onEdit={() => {}}
              onDelete={handleDelete}
              onOpen={handleOpen}
            />
          )}
        </For>

        <Show when={bookmarks().length === 0 && !loading()}>
          <div class="p-12 text-center space-y-3">
            <div class="text-2xl text-muted-foreground font-mono">⏱</div>
            <div class="text-sm font-medium text-foreground">No recently visited links</div>
            <p class="text-xs text-muted-foreground max-w-xs mx-auto">
              Links you open from Markly will appear here ordered by last visited time.
            </p>
          </div>
        </Show>
      </div>
    </div>
  )
}
