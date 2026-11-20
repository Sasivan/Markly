import { createSignal, createEffect, onMount, onCleanup, type JSX, Show } from 'solid-js'
import { useLocation } from '@solidjs/router'
import Header from './Header'
import Sidebar from './Sidebar'
import GlobalSearch from '../search/GlobalSearch'
import BookmarkDialog from '../bookmarks/BookmarkDialog'
import FolderDialog from '../folders/FolderDialog'
import { bookmarkService } from '../../services/bookmarkService'
import { folderService } from '../../services/folderService'
import type { Bookmark, Folder } from '../../domain/types'

interface AppShellProps {
  children?: JSX.Element
}

export default function AppShell(props: AppShellProps) {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = createSignal(false)
  const [editingBookmark, setEditingBookmark] = createSignal<Bookmark | null>(null)
  const [folderDialogOpen, setFolderDialogOpen] = createSignal(false)
  const [editingFolder, setEditingFolder] = createSignal<Folder | null>(null)
  const [folders, setFolders] = createSignal<Folder[]>([])

  const loadFolders = async () => {
    const fList = await folderService.getFolders()
    setFolders(fList)
  }

  onMount(() => {
    loadFolders()

    // Global keyboard shortcut: Ctrl+K / Cmd+K for search
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeys)
    onCleanup(() => window.removeEventListener('keydown', handleGlobalKeys))
  })

  // Re-load folders on route change
  createEffect(() => {
    location.pathname
    loadFolders()
  })

  const handleSaveBookmark = async (data: {
    url: string
    title: string
    description: string
    notes: string
    folderId: string | null
    tags: string[]
    isFavorite: boolean
  }) => {
    if (editingBookmark()) {
      await bookmarkService.updateBookmark(editingBookmark()!.id, data)
    } else {
      await bookmarkService.addBookmark(data)
    }
    setEditingBookmark(null)
    setBookmarkDialogOpen(false)
    // Dispatch custom event so pages can re-render
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
  }

  const handleSaveFolder = async (data: { name: string; parentId: string | null; colorKey: string }) => {
    if (editingFolder()) {
      await folderService.renameFolder(editingFolder()!.id, data.name)
      if (data.parentId !== undefined) {
        await folderService.moveFolder(editingFolder()!.id, data.parentId)
      }
    } else {
      await folderService.createFolder(data.name, data.parentId, data.colorKey)
    }
    setEditingFolder(null)
    setFolderDialogOpen(false)
    await loadFolders()
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
  }

  // Is this the public immersive homepage?
  const isHomePage = () => location.pathname === '/'

  return (
    <div class="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-white">
      {/* Global Header */}
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAddBookmark={() => {
          setEditingBookmark(null)
          setBookmarkDialogOpen(true)
        }}
      />

      <div class="flex-1 flex overflow-hidden">
        {/* Sidebar visible on all archive app routes; on "/" Home page we don't display sidebar per 02-INFORMATION-ARCHITECTURE */}
        <Show when={!isHomePage()}>
          <Sidebar
            onNewFolder={() => {
              setEditingFolder(null)
              setFolderDialogOpen(true)
            }}
          />
        </Show>

        {/* Main page content area */}
        <main class="flex-1 overflow-y-auto min-w-0">
          {props.children}
        </main>
      </div>

      {/* Global Command Search Overlay */}
      <GlobalSearch open={searchOpen()} onClose={() => setSearchOpen(false)} />

      {/* Add / Edit Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen()}
        bookmark={editingBookmark()}
        folders={folders()}
        onClose={() => {
          setBookmarkDialogOpen(false)
          setEditingBookmark(null)
        }}
        onSave={handleSaveBookmark}
      />

      {/* New / Edit Folder Dialog */}
      <FolderDialog
        open={folderDialogOpen()}
        folder={editingFolder()}
        existingFolders={folders()}
        onClose={() => {
          setFolderDialogOpen(false)
          setEditingFolder(null)
        }}
        onSave={handleSaveFolder}
      />
    </div>
  )
}
