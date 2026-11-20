import { createSignal, createEffect, For } from 'solid-js'
import DitherDialog from '../../dither-kit/solid/DitherDialog'
import DitherButton from '../../dither-kit/solid/DitherButton'
import DitherInput from '../../dither-kit/solid/DitherInput'
import type { Bookmark, Folder } from '../../domain/types'

interface BookmarkDialogProps {
  open: boolean
  bookmark?: Bookmark | null
  folders: Folder[]
  onClose: () => void
  onSave: (data: {
    url: string
    title: string
    description: string
    notes: string
    folderId: string | null
    tags: string[]
    isFavorite: boolean
    status?: 'active' | 'archived' | 'reading-queue'
  }) => void
}

export default function BookmarkDialog(props: BookmarkDialogProps) {
  const [url, setUrl] = createSignal('')
  const [title, setTitle] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [notes, setNotes] = createSignal('')
  const [folderId, setFolderId] = createSignal<string | null>(null)
  const [tagsInput, setTagsInput] = createSignal('')
  const [isFavorite, setIsFavorite] = createSignal(false)
  const [status, setStatus] = createSignal<'active' | 'reading-queue' | 'archived'>('active')
  const [error, setError] = createSignal('')

  createEffect(() => {
    if (props.open) {
      if (props.bookmark) {
        setUrl(props.bookmark.url)
        setTitle(props.bookmark.title)
        setDescription(props.bookmark.description || '')
        setNotes(props.bookmark.notes || '')
        setFolderId(props.bookmark.folderId || null)
        setTagsInput(props.bookmark.tags.join(', '))
        setIsFavorite(props.bookmark.isFavorite)
        setStatus(props.bookmark.status || 'active')
      } else {
        setUrl('')
        setTitle('')
        setDescription('')
        setNotes('')
        setFolderId(null)
        setTagsInput('')
        setIsFavorite(false)
        setStatus('active')
      }
      setError('')
    }
  })

  const handleSubmit = () => {
    const rawUrl = url().trim()
    if (!rawUrl) {
      setError('Please provide a valid URL')
      return
    }

    // Basic URL validation
    let validUrl = rawUrl
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    const tags = tagsInput()
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    props.onSave({
      url: validUrl,
      title: title().trim() || validUrl,
      description: description().trim(),
      notes: notes().trim(),
      folderId: folderId(),
      tags,
      isFavorite: isFavorite(),
      status: status(),
    })
    props.onClose()
  }

  return (
    <DitherDialog
      open={props.open}
      onClose={props.onClose}
      title={props.bookmark ? 'Edit Bookmark' : 'Add New Link'}
      description="Capture any article, document, repository, or tool into your Markly archive."
      footer={
        <div class="flex justify-end gap-2 pt-2">
          <DitherButton variant="dotted" onClick={props.onClose}>
            Cancel
          </DitherButton>
          <DitherButton variant="gradient" onClick={handleSubmit}>
            {props.bookmark ? 'Save Changes' : 'Add Bookmark'}
          </DitherButton>
        </div>
      }
    >
      <div class="space-y-4 py-2">
        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">URL *</label>
          <DitherInput
            placeholder="https://example.com/useful-article"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
          {error() && <div class="text-xs text-red-400 font-mono">{error()}</div>}
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Title</label>
          <DitherInput
            placeholder="Custom title (optional)"
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Description</label>
          <DitherInput
            placeholder="Short summary of this link..."
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Folder</label>
            <select
              value={folderId() || ''}
              onChange={(e) => setFolderId(e.currentTarget.value || null)}
              class="w-full h-10 px-3 bg-card border border-border rounded text-sm text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">(No folder — root archive)</option>
              <For each={props.folders}>
                {(f) => <option value={f.id}>{f.name}</option>}
              </For>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Tags (comma-separated)</label>
            <DitherInput
              placeholder="frontend, design, tools"
              value={tagsInput()}
              onInput={(e) => setTagsInput(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="fav-check"
            checked={isFavorite()}
            onChange={(e) => setIsFavorite(e.currentTarget.checked)}
            class="rounded border-border bg-card text-accent focus:ring-accent"
          />
          <label for="fav-check" class="text-xs text-foreground cursor-pointer">
            Mark as Favorite
          </label>
        </div>
      </div>
    </DitherDialog>
  )
}
