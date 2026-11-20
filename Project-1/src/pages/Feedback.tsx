import { createSignal, onMount, For, Show } from 'solid-js'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherInput from '../dither-kit/solid/DitherInput'
import { db } from '../data/db'
import type { FeedbackItem } from '../domain/types'

export default function Feedback() {
  const [category, setCategory] = createSignal<'feature' | 'bug' | 'praise' | 'other'>('feature')
  const [message, setMessage] = createSignal('')
  const [feedbackList, setFeedbackList] = createSignal<FeedbackItem[]>([])
  const [statusMessage, setStatusMessage] = createSignal('')

  const loadFeedback = async () => {
    const list = await db.getAllFeedback()
    setFeedbackList(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }

  onMount(() => {
    loadFeedback()
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!message().trim()) return

    const item: FeedbackItem = {
      id: `fb-${Date.now()}`,
      category: category(),
      message: message().trim(),
      createdAt: new Date().toISOString(),
      deliveryState: 'local-draft',
    }

    await db.saveFeedback(item)
    setMessage('')
    setStatusMessage('Feedback recorded in your local outbox!')
    setTimeout(() => setStatusMessage(''), 4000)
    loadFeedback()
  }

  return (
    <div class="p-6 max-w-4xl mx-auto space-y-8">
      <div class="pb-4 border-b border-border">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Feedback & Notes</h1>
        <p class="text-xs text-muted-foreground font-mono">
          Local Outbox • Feedback records are stored safely in local storage until an external endpoint is configured
        </p>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} class="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Category</label>
          <div class="flex gap-2">
            {(['feature', 'bug', 'praise', 'other'] as const).map((cat) => (
              <button
                type="button"
                onClick={() => setCategory(cat)}
                class={`px-3 py-1.5 rounded text-xs font-mono capitalize transition-colors ${
                  category() === cat ? 'bg-accent text-white font-semibold' : 'bg-background border border-border text-muted-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-foreground">Your Thoughts / Suggestions *</label>
          <textarea
            rows="4"
            placeholder="Share feedback on Markly's design, Dither UI integration, or feature requests..."
            value={message()}
            onInput={(e) => setMessage(e.currentTarget.value)}
            class="w-full p-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
          />
        </div>

        <div class="flex items-center justify-between pt-2">
          <div class="text-xs text-accent font-mono">{statusMessage()}</div>
          <DitherButton variant="gradient" onClick={handleSubmit}>
            Record to Outbox
          </DitherButton>
        </div>
      </form>

      {/* Outbox List */}
      <div class="space-y-3">
        <div class="text-xs uppercase font-mono tracking-wider text-muted-foreground font-semibold">
          Local Outbox History ({feedbackList().length})
        </div>

        <div class="border border-border rounded-lg bg-card divide-y divide-border/60">
          <For each={feedbackList()}>
            {(item) => (
              <div class="p-4 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono uppercase text-accent font-semibold">{item.category}</span>
                  <span class="text-[10px] font-mono text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()} • {item.deliveryState}
                  </span>
                </div>
                <p class="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{item.message}</p>
              </div>
            )}
          </For>

          <Show when={feedbackList().length === 0}>
            <div class="p-8 text-center text-xs text-muted-foreground font-mono">
              Outbox is empty.
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
