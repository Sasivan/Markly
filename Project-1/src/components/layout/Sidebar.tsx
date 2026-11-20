import { createSignal, createEffect, For, Show } from 'solid-js'
import { A, useLocation, useNavigate } from '@solidjs/router'
import DitherSidebar from '../../dither-kit/solid/DitherSidebar'
import DitherSidebarGroup from '../../dither-kit/solid/DitherSidebarGroup'
import DitherSidebarItem from '../../dither-kit/solid/DitherSidebarItem'
import DitherSidebarSub from '../../dither-kit/solid/DitherSidebarSub'
import { folderService, type FolderNode } from '../../services/folderService'

interface SidebarProps {
  onNewFolder: () => void
}

export default function Sidebar(props: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [folderTree, setFolderTree] = createSignal<FolderNode[]>([])
  const [openSubfolders, setOpenSubfolders] = createSignal<Record<string, boolean>>({})

  const loadTree = async () => {
    const tree = await folderService.getFolderTree()
    setFolderTree(tree)
  }

  createEffect(() => {
    // re-fetch when location changes
    location.pathname
    loadTree()
  })

  const toggleSubfolder = (id: string, isOpen: boolean) => {
    setOpenSubfolders(prev => ({ ...prev, [id]: isOpen }))
  }

  return (
    <aside class="w-64 border-r border-border bg-card/60 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div class="p-3 space-y-6">
        <DitherSidebar>
          {/* Main Workspace Navigation */}
          <DitherSidebarGroup label="CORE ARCHIVE">
            <DitherSidebarItem
              label="Library"
              active={location.pathname === '/library'}
              onClick={() => navigate('/library')}
            />
            <DitherSidebarItem
              label="Favorites"
              active={location.pathname === '/favorites'}
              onClick={() => navigate('/favorites')}
            />
            <DitherSidebarItem
              label="Recently Visited"
              active={location.pathname === '/recent'}
              onClick={() => navigate('/recent')}
            />
            <DitherSidebarItem
              label="Stash Sessions"
              active={location.pathname === '/stash'}
              onClick={() => navigate('/stash')}
            />
          </DitherSidebarGroup>

          {/* Recursive Folders with nested rails */}
          <div class="pt-4">
            <div class="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Folders</span>
              <button
                type="button"
                onClick={props.onNewFolder}
                class="hover:text-foreground text-xs p-1 focus:outline-none"
                title="New Folder"
              >
                +
              </button>
            </div>

            <For each={folderTree()}>
              {(folder) => (
                <Show
                  when={folder.children && folder.children.length > 0}
                  fallback={
                    <DitherSidebarItem
                      label={`${folder.name} (${folder.linkCount})`}
                      active={location.pathname === `/folders/${folder.id}`}
                      onClick={() => navigate(`/folders/${folder.id}`)}
                    />
                  }
                >
                  <DitherSidebarSub
                    label={`${folder.name} (${folder.linkCount})`}
                    modelValue={openSubfolders()[folder.id] ?? true}
                    onUpdateModelValue={(v) => toggleSubfolder(folder.id, v)}
                  >
                    <For each={folder.children}>
                      {(child) => (
                        <DitherSidebarItem
                          label={`${child.name} (${child.linkCount})`}
                          active={location.pathname === `/folders/${child.id}`}
                          onClick={() => navigate(`/folders/${child.id}`)}
                        />
                      )}
                    </For>
                  </DitherSidebarSub>
                </Show>
              )}
            </For>
          </div>

          {/* Visual Analytics */}
          <div class="pt-4">
            <DitherSidebarGroup label="INTELLIGENCE">
              <DitherSidebarItem
                label="Visual Analytics"
                active={location.pathname === '/analytics'}
                onClick={() => navigate('/analytics')}
              />
            </DitherSidebarGroup>
          </div>
        </DitherSidebar>
      </div>

      {/* Footer System Nav */}
      <div class="p-3 border-t border-border space-y-1">
        <DitherSidebar>
          <DitherSidebarItem
            label="Recycle Bin"
            active={location.pathname === '/trash'}
            onClick={() => navigate('/trash')}
          />
          <DitherSidebarItem
            label="Feedback"
            active={location.pathname === '/feedback'}
            onClick={() => navigate('/feedback')}
          />
          <DitherSidebarItem
            label="Dither Lab"
            active={location.pathname === '/lab'}
            onClick={() => navigate('/lab')}
          />
          <DitherSidebarItem
            label="Settings"
            active={location.pathname === '/settings'}
            onClick={() => navigate('/settings')}
          />
        </DitherSidebar>
      </div>
    </aside>
  )
}
