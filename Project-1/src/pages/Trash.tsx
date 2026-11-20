import { createSignal, onMount, onCleanup, For, Show } from 'solid-js'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherDialog from '../dither-kit/solid/DitherDialog'
import { bookmarkService } from '../services/bookmarkService'
import { folderService } from '../services/folderService'
import type { Bookmark, Folder } from '../domain/types'

export default function Trash() {
  const [deletedBookmarks, setDeletedBookmarks] = createSignal<Bookmark[]>([])
  const [deletedFolders, setDeletedFolders] = createSignal<Folder[]>([])
  const [confirmEmptyOpen, setConfirmEmptyOpen] = createSignal(false)

  const loadTrash = async () => {
    const [bms, flds] = await Promise.all([
      bookmarkService.getTrashBookmarks(),
      folderService.getTrashFolders(),
    ])
    setDeletedBookmarks(bms)
    setDeletedFolders(flds)
  }

  onMount(() => {
    loadTrash()
    const handleDataChanged = () => loadTrash()
    window.addEventListener('markly:data-changed', handleDataChanged)
    onCleanup(() => window.removeEventListener('markly:data-changed', handleDataChanged))
  })

  const handleRestoreBookmark = async (id: string) => {
    await bookmarkService.restoreBookmark(id)
    loadTrash()
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
  }

  const handlePermanentDeleteBookmark = async (id: string) => {
    await bookmarkService.deleteBookmark(id, true)
    loadTrash()
  }

  const handleRestoreFolder = async (id: string) => {
    await folderService.restoreFolder(id)
    loadTrash()
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
  }

  const handlePermanentDeleteFolder = async (id: string) => {
    await folderService.deleteFolder(id, true)
    loadTrash()
  }

  const handleEmptyAllTrash = async () => {
    await bookmarkService.emptyTrash()
    for (const f of deletedFolders()) {
      await folderService.deleteFolder(f.id, true)
    }
    setConfirmEmptyOpen(false)
    loadTrash()
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Recycle Bin</h1>
          <p class="text-xs text-muted-foreground font-mono">
            {deletedBookmarks().length} links and {deletedFolders().length} folders in trash
          </p>
        </div>

        <Show when={deletedBookmarks().length > 0 || deletedFolders().length > 0}>
          <DitherButton variant="solid" onClick={() => setConfirmEmptyOpen(true)} class="text-xs text-red-400">
            Empty Bin
          </DitherButton>
        </Show>
      </div>

      {/* Deleted Folders */}
      <Show when={deletedFolders().length > 0}>
        <div class="space-y-2">
          <div class="text-xs uppercase font-mono tracking-wider text-muted-foreground font-semibold">
            Deleted Folders
          </div>
          <div class="border border-border rounded-lg bg-card divide-y divide-border/60">
            <For each={deletedFolders()}>
              {(folder) => (
                <div class="p-3.5 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span>📁</span>
                    <span class="font-medium text-sm text-foreground">{folder.name}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <DitherButton variant="dotted" onClick={() => handleRestoreFolder(folder.id)} class="text-xs h-7">
                      Restore
                    </DitherButton>
                    <DitherButton variant="solid" onClick={() => handlePermanentDeleteFolder(folder.id)} class="text-xs h-7 text-red-400">
                      Delete Forever
                    </DitherButton>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Deleted Bookmarks */}
      <div class="space-y-2">
        <div class="text-xs uppercase font-mono tracking-wider text-muted-foreground font-semibold">
          Deleted Links
        </div>
        <div class="border border-border rounded-lg bg-card divide-y divide-border/60">
          <For each={deletedBookmarks()}>
            {(bookmark) => (
              <div class="p-3.5 flex items-center justify-between gap-4">
                <div class="space-y-0.5 truncate">
                  <div class="font-medium text-sm text-foreground truncate">{bookmark.title}</div>
                  <div class="text-xs font-mono text-muted-foreground truncate">{bookmark.url}</div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <DitherButton variant="dotted" onClick={() => handleRestoreBookmark(bookmark.id)} class="text-xs h-7">
                    Restore
                  </DitherButton>
                  <DitherButton variant="solid" onClick={() => handlePermanentDeleteBookmark(bookmark.id)} class="text-xs h-7 text-red-400">
                    Delete Forever
                  </DitherButton>
                </div>
              </div>
            )}
          </For>

          <Show when={deletedBookmarks().length === 0 && deletedFolders().length === 0}>
            <div class="p-12 text-center space-y-2">
              <div class="text-2xl text-muted-foreground">🗑</div>
              <div class="text-sm font-medium text-foreground">Recycle Bin is empty</div>
              <p class="text-xs text-muted-foreground">
                Deleted items will wait here until you restore them or empty the bin.
              </p>
            </div>
          </Show>
        </div>
      </div>

      {/* Confirm Empty Dialog */}
      <DitherDialog
        open={confirmEmptyOpen()}
        onClose={() => setConfirmEmptyOpen(false)}
        title="Empty Recycle Bin?"
        description="This action cannot be undone. All deleted links and folders will be permanently purged from your browser storage."
        footer={
          <div class="flex justify-end gap-2 pt-2">
            <DitherButton variant="dotted" onClick={() => setConfirmEmptyOpen(false)}>
              Cancel
            </DitherButton>
            <DitherButton variant="gradient" onClick={handleEmptyAllTrash} class="bg-red-600">
              Yes, Purge Everything
            </DitherButton>
          </div>
        }
      >
        <div class="py-2 text-xs text-muted-foreground">
          Are you sure you want to permanently delete all {deletedBookmarks().length} items in the bin?
        </div>
      </DitherDialog>
    </div>
  )
}
