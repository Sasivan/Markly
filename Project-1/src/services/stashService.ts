import { db } from '../data/db'
import type { StashSession, StashItem } from '../domain/types'

export const stashService = {
  async getSessions(includeDeleted = false): Promise<StashSession[]> {
    const all = await db.getAllStashSessions(includeDeleted)
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async createSession(
    name: string,
    items: Array<{ url: string; title?: string; bookmarkId?: string }>,
    notes = '',
  ): Promise<StashSession> {
    const now = new Date().toISOString()
    const sessionId = `stash-${Date.now()}`

    const stashItems: StashItem[] = items.map((item, index) => ({
      id: `si-${Date.now()}-${index}`,
      sessionId,
      bookmarkId: item.bookmarkId || null,
      url: item.url,
      title: item.title || item.url,
      order: index + 1,
    }))

    const session: StashSession = {
      id: sessionId,
      name: name.trim() || `Session ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      items: stashItems,
      notes: notes.trim(),
      deletedAt: null,
    }

    await db.saveStashSession(session)
    return session
  },

  async deleteSession(id: string, permanent = false): Promise<void> {
    await db.deleteStashSession(id, permanent)
  },

  async copySessionUrls(session: StashSession): Promise<string> {
    const urls = session.items.map(i => i.url).join('\n')
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(urls)
    }
    return urls
  },
}
