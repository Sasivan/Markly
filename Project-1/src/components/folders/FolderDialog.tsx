import { createSignal, createEffect, For } from 'solid-js'
import DitherDialog from '../../dither-kit/solid/DitherDialog'
import DitherButton from '../../dither-kit/solid/DitherButton'
import DitherInput from '../../dither-kit/solid/DitherInput'
import type { Folder } from '../../domain/types'

interface FolderDialogProps {
  open: boolean
  folder?: Folder | null
  existingFolders: Folder[]
  onClose: () => void
  onSave: (data: { name: string; parentId: string | null; colorKey: string }) => void
}

export default function FolderDialog(props: FolderDialogProps) {
  const [name, setName] = createSignal('')
  const [parentId, setParentId] = createSignal<string | null>(null)
  const [colorKey, setColorKey] = createSignal('blue')
  const [error, setError] = createSignal('')

  createEffect(() => {
    if (props.open) {
      if (props.folder) {
        setName(props.folder.name)
        setParentId(props.folder.parentId)
        setColorKey(props.folder.colorKey || 'blue')
      } else {
        setName('')
        setParentId(null)
        setColorKey('blue')
      }
      setError('')
    }
  })

  const handleSubmit = () => {
    const rawName = name().trim()
    if (!rawName) {
      setError('Folder name is required')
      return
    }

    props.onSave({
      name: rawName,
      parentId: parentId(),
      colorKey: colorKey(),
    })
    props.onClose()
  }

  const colors = [
    { key: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { key: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { key: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { key: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { key: 'green', label: 'Green', class: 'bg-green-500' },
  ]

  return (
    <DitherDialog
      open={props.open}
      onClose={props.onClose}
      title={props.folder ? 'Rename Folder' : 'New Folder'}
      description="Create a nested collection to organize your links."
      footer={
        <div class="flex justify-end gap-2 pt-2">
          <DitherButton variant="dotted" onClick={props.onClose}>
            Cancel
          </DitherButton>
          <DitherButton variant="gradient" onClick={handleSubmit}>
            {props.folder ? 'Save' : 'Create Folder'}
          </DitherButton>
        </div>
      }
    >
      <div class="space-y-4 py-2">
        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Folder Name *</label>
          <DitherInput
            placeholder="e.g. Design Systems, React 19..."
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
          />
          {error() && <div class="text-xs text-red-400 font-mono">{error()}</div>}
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Parent Folder</label>
          <select
            value={parentId() || ''}
            onChange={(e) => setParentId(e.currentTarget.value || null)}
            class="w-full h-10 px-3 bg-card border border-border rounded text-sm text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">(Root level — no parent)</option>
            <For each={props.existingFolders.filter(f => f.id !== props.folder?.id)}>
              {(f) => <option value={f.id}>{f.name}</option>}
            </For>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-foreground">Color Identity</label>
          <div class="flex items-center gap-3">
            <For each={colors}>
              {(c) => (
                <button
                  type="button"
                  onClick={() => setColorKey(c.key)}
                  class={`size-6 rounded-full ${c.class} transition-transform ${
                    colorKey() === c.key ? 'ring-2 ring-foreground scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </DitherDialog>
  )
}
