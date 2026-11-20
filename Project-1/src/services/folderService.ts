import { db } from '../data/db'
import type { Folder } from '../domain/types'

export interface FolderNode extends Folder {
  children: FolderNode[]
  linkCount: number
}

export const folderService = {
  async getFolders(includeDeleted = false): Promise<Folder[]> {
    const all = await db.getAllFolders(includeDeleted)
    return all.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  },

  async getFolderById(id: string): Promise<Folder | undefined> {
    return db.getFolderById(id)
  },

  async getFolderTree(): Promise<FolderNode[]> {
    const [folders, bookmarks] = await Promise.all([
      db.getAllFolders(false),
      db.getAllBookmarks(false),
    ])

    const countMap: Record<string, number> = {}
    for (const b of bookmarks) {
      if (b.folderId) {
        countMap[b.folderId] = (countMap[b.folderId] || 0) + 1
      }
    }

    const nodeMap = new Map<string, FolderNode>()
    for (const f of folders) {
      nodeMap.set(f.id, {
        ...f,
        children: [],
        linkCount: countMap[f.id] || 0,
      })
    }

    const roots: FolderNode[] = []
    for (const f of folders) {
      const node = nodeMap.get(f.id)!
      if (f.parentId && nodeMap.has(f.parentId)) {
        nodeMap.get(f.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  },

  async createFolder(name: string, parentId: string | null = null, colorKey = 'blue'): Promise<Folder> {
    const now = new Date().toISOString()
    const folder: Folder = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      parentId,
      iconKey: 'folder',
      colorKey,
      sortOrder: Date.now(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.saveFolder(folder)
    return folder
  },

  async renameFolder(id: string, newName: string): Promise<Folder | undefined> {
    const folder = await db.getFolderById(id)
    if (!folder) return undefined

    folder.name = newName.trim()
    folder.updatedAt = new Date().toISOString()
    await db.saveFolder(folder)
    return folder
  },

  async moveFolder(id: string, newParentId: string | null): Promise<Folder | undefined> {
    const folder = await db.getFolderById(id)
    if (!folder) return undefined

    // Prevent cycle
    if (newParentId === id) return folder

    folder.parentId = newParentId
    folder.updatedAt = new Date().toISOString()
    await db.saveFolder(folder)
    return folder
  },

  async deleteFolder(id: string, permanent = false): Promise<void> {
    await db.deleteFolder(id, permanent)
  },

  async restoreFolder(id: string): Promise<void> {
    await db.restoreFolder(id)
  },

  async getTrashFolders(): Promise<Folder[]> {
    const all = await db.getAllFolders(true)
    return all.filter(f => f.deletedAt !== null)
  },
}
