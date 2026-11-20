import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js'
import BookmarkRow from '../components/bookmarks/BookmarkRow'
import DitherInput from '../dither-kit/solid/DitherInput'
import DitherButton from '../dither-kit/solid/DitherButton'
import { bookmarkService } from '../services/bookmarkService'
import { folderService } from '../services/folderService'
import type { Bookmark, Folder } from '../domain/types'
import { SAMPLE_BOOKMARKS, SAMPLE_FOLDERS, SAMPLE_STASH } from '../data/sample-data'
import { db } from '../data/db'

export default function Library() {
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([])
  const [folders, setFolders] = createSignal<Folder[]>([])
  const [searchQuery, setSearchQuery] = createSignal('')
  const [selectedFolder, setSelectedFolder] = createSignal<string>('all')
  const [selectedTag, setSelectedTag] = createSignal<string>('all')
  const [sortBy, setSortBy] = createSignal<'newest' | 'visits' | 'title'>('newest')
  const [loading, setLoading] = createSignal(true)

  const loadData = async () => {
    setLoading(true)
    const [bList, fList] = await Promise.all([
      bookmarkService.getBookmarks({
        folderId: selectedFolder() === 'all' ? undefined : (selectedFolder() === 'none' ? null : selectedFolder()),
        tag: selectedTag() === 'all' ? undefined : selectedTag(),
        query: searchQuery(),
      }),
      folderService.getFolders(),
    ])

    // Client-side sort
    const sorted = [...bList].sort((a, b) => {
      if (sortBy() === 'visits') return b.visitCount - a.visitCount
      if (sortBy() === 'title') return a.title.localeCompare(b.title)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    setBookmarks(sorted)
    setFolders(fList)
    setLoading(false)
  }

  onMount(() => {
    loadData()
    const handleDataChanged = () => loadData()
    window.addEventListener('markly:data-changed', handleDataChanged)
    onCleanup(() => window.removeEventListener('markly:data-changed', handleDataChanged))
  })

  createEffect(() => {
    // re-filter when dependencies change
    searchQuery()
    selectedFolder()
    selectedTag()
    sortBy()
    loadData()
  })

  // Distinct tags across all bookmarks
  const allTags = () => {
    const set = new Set<string>()
    for (const b of bookmarks()) {
      for (const t of b.tags) set.add(t)
    }
    return Array.from(set)
  }

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

  const loadSampleData = async () => {
    for (const f of SAMPLE_FOLDERS) await db.saveFolder(f)
    for (const b of SAMPLE_BOOKMARKS) await db.saveBookmark(b)
    await db.saveStashSession(SAMPLE_STASH)
    loadData()
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title & Stats */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Archive Library</h1>
          <p class="text-xs text-muted-foreground font-mono">
            {bookmarks().length} saved links in archive
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Show when={bookmarks().length === 0 && !loading()}>
            <DitherButton variant="solid" onClick={loadSampleData} class="text-xs">
              ⚡ Load Sample Archive
            </DitherButton>
          </Show>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div class="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border">
        {/* Search */}
        <div class="flex-1 min-w-[200px]">
          <DitherInput
            placeholder="Filter links by title, url, tags..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>

        {/* Folder filter */}
        <div class="w-40">
          <select
            value={selectedFolder()}
            onChange={(e) => setSelectedFolder(e.currentTarget.value)}
            class="w-full h-10 px-2.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">All Folders</option>
            <option value="none">Uncategorized</option>
            <For each={folders()}>
              {(f) => <option value={f.id}>{f.name}</option>}
            </For>
          </select>
        </div>

        {/* Tag filter */}
        <Show when={allTags().length > 0}>
          <div class="w-32">
            <select
              value={selectedTag()}
              onChange={(e) => setSelectedTag(e.currentTarget.value)}
              class="w-full h-10 px-2.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="all">All Tags</option>
              <For each={allTags()}>
                {(t) => <option value={t}>#{t}</option>}
              </For>
            </select>
          </div>
        </Show>

        {/* Sort */}
        <div class="w-32">
          <select
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value as any)}
            class="w-full h-10 px-2.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="newest">Newest First</option>
            <option value="visits">Most Visited</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Bookmarks List */}
      <div class="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border/60">
        <For each={bookmarks()}>
          {(bookmark) => (
            <BookmarkRow
              bookmark={bookmark}
              folderName={bookmark.folderId ? folderMap().get(bookmark.folderId) : undefined}
              onToggleFavorite={handleToggleFavorite}
              onEdit={(bm) => window.dispatchEvent(new CustomEvent('markly:open-edit-bookmark', { detail: bm }))}
              onDelete={handleDelete}
              onOpen={handleOpen}
            />
          )}
        </For>

        <Show when={bookmarks().length === 0 && !loading()}>
          <div class="p-12 text-center space-y-4">
            <div class="text-3xl font-mono text-muted-foreground">∅</div>
            <div class="text-sm font-medium text-foreground">No links found</div>
            <p class="text-xs text-muted-foreground max-w-sm mx-auto">
              Your archive is clean. Add your first bookmark or import a collection to get started.
            </p>
            <div class="pt-2 flex justify-center gap-3">
              <DitherButton variant="solid" onClick={loadSampleData}>
                Load Sample Archive
              </DitherButton>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
