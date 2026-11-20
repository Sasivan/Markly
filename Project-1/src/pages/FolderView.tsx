import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js'
import { useParams, useNavigate, A } from '@solidjs/router'
import BookmarkRow from '../components/bookmarks/BookmarkRow'
import DitherButton from '../dither-kit/solid/DitherButton'
import { bookmarkService } from '../services/bookmarkService'
import { folderService } from '../services/folderService'
import type { Bookmark, Folder } from '../domain/types'

export default function FolderView() {
  const params = useParams()
  const navigate = useNavigate()
  const [folder, setFolder] = createSignal<Folder | undefined>()
  const [subfolders, setSubfolders] = createSignal<Folder[]>([])
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([])
  const [allFolders, setAllFolders] = createSignal<Folder[]>([])
  const [loading, setLoading] = createSignal(true)

  const loadData = async () => {
    setLoading(true)
    const folderId = params.folderId || ''
    const [current, allF, bms] = await Promise.all([
      folderService.getFolderById(folderId),
      folderService.getFolders(),
      bookmarkService.getBookmarks({ folderId }),
    ])

    setFolder(current)
    setAllFolders(allF)
    setSubfolders(allF.filter(f => f.parentId === folderId))
    setBookmarks(bms)
    setLoading(false)
  }

  onMount(() => {
    loadData()
    const handleDataChanged = () => loadData()
    window.addEventListener('markly:data-changed', handleDataChanged)
    onCleanup(() => window.removeEventListener('markly:data-changed', handleDataChanged))
  })

  createEffect(() => {
    params.folderId
    loadData()
  })

  const folderMap = () => new Map(allFolders().map(f => [f.id, f.name]))

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

  // Breadcrumbs path
  const breadcrumbs = () => {
    const list: Folder[] = []
    let curr = folder()
    while (curr) {
      list.unshift(curr)
      curr = curr.parentId ? allFolders().find(f => f.id === curr!.parentId) : undefined
    }
    return list
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Breadcrumbs & Actions */}
      <div class="pb-4 border-b border-border space-y-3">
        <div class="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <A href="/library" class="hover:text-foreground">Library</A>
          <For each={breadcrumbs()}>
            {(crumb, idx) => (
              <>
                <span>/</span>
                <span class={idx() === breadcrumbs().length - 1 ? 'text-foreground font-semibold' : 'hover:text-foreground'}>
                  {crumb.name}
                </span>
              </>
            )}
          </For>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-base font-mono">
              📁
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-foreground">
                {folder() ? folder()!.name : 'Folder'}
              </h1>
              <p class="text-xs text-muted-foreground font-mono">
                {bookmarks().length} links • {subfolders().length} subfolders
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <DitherButton
              variant="dotted"
              onClick={() => navigate(`/analytics?scope=folder&scopeId=${params.folderId}`)}
              class="text-xs"
            >
              📊 Analyze This Folder
            </DitherButton>
          </div>
        </div>
      </div>

      {/* Subfolders Grid if any */}
      <Show when={subfolders().length > 0}>
        <div class="space-y-2">
          <div class="text-xs uppercase font-mono tracking-wider text-muted-foreground font-semibold">
            Subfolders
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <For each={subfolders()}>
              {(sub) => (
                <A
                  href={`/folders/${sub.id}`}
                  class="p-3 rounded-lg border border-border bg-card hover:border-accent transition-colors flex items-center gap-2.5 group"
                >
                  <span class="text-sm">📁</span>
                  <span class="text-xs font-medium text-foreground group-hover:text-accent truncate">
                    {sub.name}
                  </span>
                </A>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Bookmarks in Folder */}
      <div class="space-y-2">
        <div class="text-xs uppercase font-mono tracking-wider text-muted-foreground font-semibold">
          Saved Links
        </div>
        <div class="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border/60">
          <For each={bookmarks()}>
            {(bookmark) => (
              <BookmarkRow
                bookmark={bookmark}
                folderName={folder()?.name}
                onToggleFavorite={handleToggleFavorite}
                onEdit={(bm) => window.dispatchEvent(new CustomEvent('markly:open-edit-bookmark', { detail: bm }))}
                onDelete={handleDelete}
                onOpen={handleOpen}
              />
            )}
          </For>

          <Show when={bookmarks().length === 0 && !loading()}>
            <div class="p-12 text-center space-y-2">
              <div class="text-xs text-muted-foreground">This folder is empty.</div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
