import { db } from '../data/db'
import type { Bookmark, VisualBoard } from '../domain/types'
import { SAMPLE_BOARD } from '../data/sample-data'

export const analyticsService = {
  async getBoards(): Promise<VisualBoard[]> {
    const boards = await db.getAllVisualBoards()
    if (boards.length === 0) {
      await db.saveVisualBoard(SAMPLE_BOARD)
      return [SAMPLE_BOARD]
    }
    return boards
  },

  async saveBoard(board: VisualBoard): Promise<void> {
    await db.saveVisualBoard(board)
  },

  async getScopeBookmarks(scope: 'entire-archive' | 'folder' | 'tag' | 'domain', scopeId?: string): Promise<Bookmark[]> {
    const all = await db.getAllBookmarks(false)
    if (scope === 'folder' && scopeId) {
      return all.filter(b => b.folderId === scopeId)
    }
    if (scope === 'tag' && scopeId) {
      return all.filter(b => b.tags.includes(scopeId))
    }
    if (scope === 'domain' && scopeId) {
      return all.filter(b => b.domain === scopeId)
    }
    return all
  },

  async getDomainDistribution(bookmarks: Bookmark[], limit = 8): Promise<Array<{ x: string; y: number }>> {
    const map: Record<string, number> = {}
    for (const b of bookmarks) {
      map[b.domain] = (map[b.domain] || 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([domain, count]) => ({ x: domain, y: count }))
  },

  async getFolderDistribution(bookmarks: Bookmark[]): Promise<Array<{ x: string; y: number }>> {
    const folders = await db.getAllFolders(false)
    const folderMap = new Map(folders.map(f => [f.id, f.name]))

    const countMap: Record<string, number> = {}
    let unassigned = 0

    for (const b of bookmarks) {
      if (b.folderId && folderMap.has(b.folderId)) {
        const name = folderMap.get(b.folderId)!
        countMap[name] = (countMap[name] || 0) + 1
      } else {
        unassigned++
      }
    }

    const result: Array<{ x: string; y: number }> = Object.entries(countMap).map(([x, y]) => ({ x, y }))
    if (unassigned > 0) {
      result.push({ x: 'Uncategorized', y: unassigned })
    }
    return result
  },

  async getActivityByWeekday(bookmarks: Bookmark[]): Promise<Array<{ x: string; y: number }>> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const counts = [0, 0, 0, 0, 0, 0, 0]

    for (const b of bookmarks) {
      const day = new Date(b.createdAt).getDay()
      counts[day] += 1
    }

    // Reorder from Mon to Sun
    return [
      { x: 'Mon', y: counts[1] },
      { x: 'Tue', y: counts[2] },
      { x: 'Wed', y: counts[3] },
      { x: 'Thu', y: counts[4] },
      { x: 'Fri', y: counts[5] },
      { x: 'Sat', y: counts[6] },
      { x: 'Sun', y: counts[0] },
    ]
  },

  async getTagDistribution(bookmarks: Bookmark[], limit = 6): Promise<Array<{ x: string; y: number }>> {
    const map: Record<string, number> = {}
    for (const b of bookmarks) {
      for (const t of b.tags) {
        map[t] = (map[t] || 0) + 1
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([x, y]) => ({ x, y }))
  },
}
