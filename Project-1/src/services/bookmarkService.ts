import { db } from '../data/db'
import type { Bookmark } from '../domain/types'

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.split('/')[0] || url
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`
  } catch {
    return url.trim().toLowerCase()
  }
}

export const bookmarkService = {
  async getBookmarks(filter?: {
    folderId?: string | null
    isFavorite?: boolean
    query?: string
    tag?: string
    status?: string
    includeDeleted?: boolean
  }): Promise<Bookmark[]> {
    let all = await db.getAllBookmarks(filter?.includeDeleted ?? false)

    if (filter?.folderId !== undefined) {
      all = all.filter(b => b.folderId === filter.folderId)
    }

    if (filter?.isFavorite !== undefined) {
      all = all.filter(b => b.isFavorite === filter.isFavorite)
    }

    if (filter?.tag) {
      all = all.filter(b => b.tags.includes(filter.tag!))
    }

    if (filter?.status) {
      all = all.filter(b => b.status === filter.status)
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim()
      all = all.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.domain.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        b.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort by createdAt descending
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async getRecentBookmarks(limit = 20): Promise<Bookmark[]> {
    const all = await db.getAllBookmarks(false)
    return all
      .filter(b => b.lastVisitedAt || b.visitCount > 0)
      .sort((a, b) => {
        const timeA = a.lastVisitedAt ? new Date(a.lastVisitedAt).getTime() : 0
        const timeB = b.lastVisitedAt ? new Date(b.lastVisitedAt).getTime() : 0
        return timeB - timeA
      })
      .slice(0, limit)
  },

  async getTrashBookmarks(): Promise<Bookmark[]> {
    const all = await db.getAllBookmarks(true)
    return all
      .filter(b => b.deletedAt !== null)
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
  },

  async addBookmark(input: {
    url: string
    title?: string
    description?: string
    notes?: string
    tags?: string[]
    folderId?: string | null
    isFavorite?: boolean
    status?: 'active' | 'archived' | 'reading-queue'
  }): Promise<Bookmark> {
    const now = new Date().toISOString()
    const domain = extractDomain(input.url)
    const normalizedUrl = normalizeUrl(input.url)
    const title = input.title?.trim() || domain

    const bookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: input.url.trim(),
      normalizedUrl,
      title,
      description: input.description?.trim() || '',
      domain,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      notes: input.notes?.trim() || '',
      tags: input.tags || [],
      folderId: input.folderId ?? null,
      isFavorite: input.isFavorite ?? false,
      createdAt: now,
      updatedAt: now,
      lastVisitedAt: null,
      visitCount: 0,
      deletedAt: null,
      status: input.status || 'active',
    }

    await db.saveBookmark(bookmark)
    return bookmark
  },

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark | undefined> {
    const existing = await db.getBookmarkById(id)
    if (!existing) return undefined

    const updated: Bookmark = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    if (updates.url && updates.url !== existing.url) {
      updated.domain = extractDomain(updates.url)
      updated.normalizedUrl = normalizeUrl(updates.url)
      updated.faviconUrl = `https://www.google.com/s2/favicons?domain=${updated.domain}&sz=64`
    }

    await db.saveBookmark(updated)
    return updated
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const existing = await db.getBookmarkById(id)
    if (!existing) return false

    existing.isFavorite = !existing.isFavorite
    existing.updatedAt = new Date().toISOString()
    await db.saveBookmark(existing)
    return existing.isFavorite
  },

  async recordVisit(id: string): Promise<void> {
    const existing = await db.getBookmarkById(id)
    if (!existing) return

    existing.visitCount += 1
    existing.lastVisitedAt = new Date().toISOString()
    await db.saveBookmark(existing)
  },

  async deleteBookmark(id: string, permanent = false): Promise<void> {
    await db.deleteBookmark(id, permanent)
  },

  async restoreBookmark(id: string): Promise<void> {
    await db.restoreBookmark(id)
  },

  async emptyTrash(): Promise<void> {
    const trash = await this.getTrashBookmarks()
    for (const b of trash) {
      await db.deleteBookmark(b.id, true)
    }
  },
}
