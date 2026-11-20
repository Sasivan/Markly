import { createSignal, onMount, onCleanup, For, Show } from 'solid-js'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherInput from '../dither-kit/solid/DitherInput'
import DitherDialog from '../dither-kit/solid/DitherDialog'
import { stashService } from '../services/stashService'
import type { StashSession } from '../domain/types'

export default function Stash() {
  const [sessions, setSessions] = createSignal<StashSession[]>([])
  const [createDialogOpen, setCreateDialogOpen] = createSignal(false)
  const [sessionName, setSessionName] = createSignal('')
  const [urlsInput, setUrlsInput] = createSignal('')
  const [notes, setNotes] = createSignal('')
  const [copiedId, setCopiedId] = createSignal<string | null>(null)

  const loadSessions = async () => {
    const list = await stashService.getSessions()
    setSessions(list)
  }

  onMount(() => {
    loadSessions()
    const handleDataChanged = () => loadSessions()
    window.addEventListener('markly:data-changed', handleDataChanged)
    onCleanup(() => window.removeEventListener('markly:data-changed', handleDataChanged))
  })

  const handleCreate = async () => {
    const urls = urlsInput()
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)

    if (urls.length === 0) return

    const items = urls.map(url => ({
      url: url.startsWith('http') ? url : `https://${url}`,
      title: url,
    }))

    await stashService.createSession(sessionName(), items, notes())
    setSessionName('')
    setUrlsInput('')
    setNotes('')
    setCreateDialogOpen(false)
    loadSessions()
  }

  const handleDelete = async (id: string) => {
    await stashService.deleteSession(id)
    loadSessions()
  }

  const handleCopyUrls = async (session: StashSession) => {
    await stashService.copySessionUrls(session)
    setCopiedId(session.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenAll = (session: StashSession) => {
    for (const item of session.items) {
      window.open(item.url, '_blank')
    }
  }

  return (
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Stash Sessions</h1>
          <p class="text-xs text-muted-foreground font-mono">
            Save browsing batches and research link sets to revisit later
          </p>
        </div>

        <DitherButton variant="gradient" onClick={() => setCreateDialogOpen(true)}>
          + New Stash
        </DitherButton>
      </div>

      <div class="space-y-4">
        <For each={sessions()}>
          {(session) => (
            <div class="p-5 border border-border rounded-lg bg-card space-y-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div class="space-y-1">
                  <h3 class="text-base font-semibold text-foreground">{session.name}</h3>
                  <div class="text-xs text-muted-foreground font-mono">
                    {session.items.length} links • Created {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                  <Show when={session.notes}>
                    <p class="text-xs text-muted-foreground pt-1">{session.notes}</p>
                  </Show>
                </div>

                <div class="flex items-center gap-2">
                  <DitherButton variant="solid" onClick={() => handleOpenAll(session)} class="text-xs h-8">
                    Open All ↗
                  </DitherButton>
                  <DitherButton variant="dotted" onClick={() => handleCopyUrls(session)} class="text-xs h-8">
                    {copiedId() === session.id ? 'Copied ✓' : 'Copy URLs'}
                  </DitherButton>
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    class="p-2 text-xs text-muted-foreground hover:text-red-400 rounded hover:bg-muted"
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div class="divide-y divide-border/40 border-t border-border/40 pt-2 space-y-1">
                <For each={session.items}>
                  {(item) => (
                    <div class="py-1.5 flex items-center justify-between text-xs">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        class="text-foreground hover:text-accent truncate flex-1 pr-4"
                      >
                        {item.title}
                      </a>
                      <span class="text-[10px] font-mono text-muted-foreground">
                        {item.url}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>

        <Show when={sessions().length === 0}>
          <div class="p-12 border border-border rounded-lg bg-card text-center space-y-3">
            <div class="text-2xl text-muted-foreground">📦</div>
            <div class="text-sm font-medium text-foreground">No saved stash sessions</div>
            <p class="text-xs text-muted-foreground max-w-sm mx-auto">
              Save batches of URLs as a reading session or research topic to open together later.
            </p>
            <div class="pt-2">
              <DitherButton variant="gradient" onClick={() => setCreateDialogOpen(true)}>
                Create First Stash
              </DitherButton>
            </div>
          </div>
        </Show>
      </div>

      {/* Create Stash Modal */}
      <DitherDialog
        open={createDialogOpen()}
        onClose={() => setCreateDialogOpen(false)}
        title="Create New Stash Session"
        description="Paste multiple URLs (one per line) to save as a distinct browsing session."
        footer={
          <div class="flex justify-end gap-2 pt-2">
            <DitherButton variant="dotted" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </DitherButton>
            <DitherButton variant="gradient" onClick={handleCreate}>
              Save Session
            </DitherButton>
          </div>
        }
      >
        <div class="space-y-4 py-2">
          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Session Name *</label>
            <DitherInput
              placeholder="e.g. Morning Reads, Shader Inspiration..."
              value={sessionName()}
              onInput={(e) => setSessionName(e.currentTarget.value)}
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">URLs (one per line) *</label>
            <textarea
              rows="5"
              placeholder="https://example.com/one&#10;https://example.com/two"
              value={urlsInput()}
              onInput={(e) => setUrlsInput(e.currentTarget.value)}
              class="w-full p-2.5 bg-background border border-border rounded text-xs font-mono text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Notes (optional)</label>
            <DitherInput
              placeholder="Brief context about this batch..."
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
            />
          </div>
        </div>
      </DitherDialog>
    </div>
  )
}
