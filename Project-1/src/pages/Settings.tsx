import { createSignal } from 'solid-js'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherDialog from '../dither-kit/solid/DitherDialog'
import { db } from '../data/db'

export default function Settings() {
  const [importStatus, setImportStatus] = createSignal('')
  const [clearDialogOpen, setClearDialogOpen] = createSignal(false)
  const [importJsonText, setImportJsonText] = createSignal('')

  const handleExport = async () => {
    const jsonString = await db.exportFullArchive()
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `markly-archive-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!importJsonText().trim()) return
    const res = await db.importArchive(importJsonText())
    if (res.success) {
      setImportStatus(`Success! Imported ${res.importedBookmarks} bookmarks and ${res.importedFolders} folders.`)
      setImportJsonText('')
      window.dispatchEvent(new CustomEvent('markly:data-changed'))
    } else {
      setImportStatus(`Import failed: ${res.error}`)
    }
    setTimeout(() => setImportStatus(''), 5000)
  }

  const handleClearData = async () => {
    await db.clearDatabase()
    setClearDialogOpen(false)
    window.dispatchEvent(new CustomEvent('markly:data-changed'))
    alert('Archive cleared!')
  }

  return (
    <div class="p-6 max-w-4xl mx-auto space-y-8">
      <div class="pb-4 border-b border-border">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Data Portability & Settings</h1>
        <p class="text-xs text-muted-foreground font-mono">
          Export full JSON archives, restore backups, and manage local storage
        </p>
      </div>

      {/* Export Section */}
      <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Backup Archive (Export JSON)</h2>
          <p class="text-xs text-muted-foreground">
            Download your entire personal archive including all bookmarks, folders, stash sessions, and analytics boards as an open JSON file.
          </p>
        </div>
        <DitherButton variant="gradient" onClick={handleExport}>
          ↓ Export Full JSON Backup
        </DitherButton>
      </div>

      {/* Import Section */}
      <div class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Restore from Backup (Import JSON)</h2>
          <p class="text-xs text-muted-foreground">
            Paste the contents of a Markly backup JSON file to merge or restore your bookmarks and folders.
          </p>
        </div>

        <textarea
          rows="5"
          placeholder="Paste JSON archive data here..."
          value={importJsonText()}
          onInput={(e) => setImportJsonText(e.currentTarget.value)}
          class="w-full p-3 bg-background border border-border rounded text-xs font-mono text-foreground focus:outline-none focus:border-accent"
        />

        <div class="flex items-center justify-between">
          <span class="text-xs text-accent font-mono">{importStatus()}</span>
          <DitherButton variant="solid" onClick={handleImport}>
            ↑ Import & Merge Records
          </DitherButton>
        </div>
      </div>

      {/* Danger Zone: Clear Data */}
      <div class="p-6 rounded-xl border border-red-500/30 bg-red-950/10 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-red-400">Danger Zone: Clear Archive</h2>
          <p class="text-xs text-muted-foreground">
            Permanently delete all bookmarks, folders, stash sessions, and analytics data from this browser.
          </p>
        </div>
        <DitherButton variant="solid" onClick={() => setClearDialogOpen(true)} class="bg-red-600/80 hover:bg-red-600 text-white">
          Clear All Local Data
        </DitherButton>
      </div>

      {/* Clear Confirmation Dialog */}
      <DitherDialog
        open={clearDialogOpen()}
        onClose={() => setClearDialogOpen(false)}
        title="Clear Entire Archive?"
        description="This will permanently delete all records stored in IndexedDB. Make sure you have exported a backup if needed."
        footer={
          <div class="flex justify-end gap-2 pt-2">
            <DitherButton variant="dotted" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </DitherButton>
            <DitherButton variant="gradient" onClick={handleClearData} class="bg-red-600">
              Permanently Clear
            </DitherButton>
          </div>
        }
      >
        <div class="py-2 text-xs text-muted-foreground">
          Are you sure you want to erase all data?
        </div>
      </DitherDialog>
    </div>
  )
}
