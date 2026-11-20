import type { Bookmark, Folder, StashSession, Tag, VisualBoard, FeedbackItem, ProfilePreferences } from '../domain/types'
import { SAMPLE_BOOKMARKS, SAMPLE_FOLDERS, SAMPLE_STASH, SAMPLE_BOARD } from './sample-data'

const DB_NAME = 'markly_db'
const DB_VERSION = 1

export class MarklyDatabase {
  private db: IDBDatabase | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Bookmarks store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
          bookmarkStore.createIndex('folderId', 'folderId', { unique: false })
          bookmarkStore.createIndex('isFavorite', 'isFavorite', { unique: false })
          bookmarkStore.createIndex('deletedAt', 'deletedAt', { unique: false })
          bookmarkStore.createIndex('createdAt', 'createdAt', { unique: false })
          bookmarkStore.createIndex('domain', 'domain', { unique: false })
          bookmarkStore.createIndex('lastVisitedAt', 'lastVisitedAt', { unique: false })
        }

        // Folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
          folderStore.createIndex('parentId', 'parentId', { unique: false })
          folderStore.createIndex('deletedAt', 'deletedAt', { unique: false })
          folderStore.createIndex('sortOrder', 'sortOrder', { unique: false })
        }

        // Stash sessions store
        if (!db.objectStoreNames.contains('stash_sessions')) {
          const stashStore = db.createObjectStore('stash_sessions', { keyPath: 'id' })
          stashStore.createIndex('createdAt', 'createdAt', { unique: false })
          stashStore.createIndex('deletedAt', 'deletedAt', { unique: false })
        }

        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' })
          tagStore.createIndex('name', 'name', { unique: true })
        }

        // Visual boards store
        if (!db.objectStoreNames.contains('visual_boards')) {
          const boardStore = db.createObjectStore('visual_boards', { keyPath: 'id' })
          boardStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Feedback store
        if (!db.objectStoreNames.contains('feedback')) {
          const feedbackStore = db.createObjectStore('feedback', { keyPath: 'id' })
          feedbackStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init()
    const tx = db.transaction(storeName, mode)
    return tx.objectStore(storeName)
  }

  // --- Bookmarks CRUD ---
  async getAllBookmarks(includeDeleted = false): Promise<Bookmark[]> {
    const store = await this.getStore('bookmarks')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const all: Bookmark[] = request.result || []
        if (includeDeleted) resolve(all)
        else resolve(all.filter(b => !b.deletedAt))
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getBookmarkById(id: string): Promise<Bookmark | undefined> {
    const store = await this.getStore('bookmarks')
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const store = await this.getStore('bookmarks', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(bookmark)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteBookmark(id: string, permanent = false): Promise<void> {
    if (permanent) {
      const store = await this.getStore('bookmarks', 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } else {
      const bookmark = await this.getBookmarkById(id)
      if (bookmark) {
        bookmark.deletedAt = new Date().toISOString()
        await this.saveBookmark(bookmark)
      }
    }
  }

  async restoreBookmark(id: string): Promise<void> {
    const bookmark = await this.getBookmarkById(id)
    if (bookmark) {
      bookmark.deletedAt = null
      await this.saveBookmark(bookmark)
    }
  }

  // --- Folders CRUD ---
  async getAllFolders(includeDeleted = false): Promise<Folder[]> {
    const store = await this.getStore('folders')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const all: Folder[] = request.result || []
        if (includeDeleted) resolve(all)
        else resolve(all.filter(f => !f.deletedAt))
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getFolderById(id: string): Promise<Folder | undefined> {
    const store = await this.getStore('folders')
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveFolder(folder: Folder): Promise<void> {
    const store = await this.getStore('folders', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(folder)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteFolder(id: string, permanent = false): Promise<void> {
    if (permanent) {
      const store = await this.getStore('folders', 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } else {
      const folder = await this.getFolderById(id)
      if (folder) {
        folder.deletedAt = new Date().toISOString()
        await this.saveFolder(folder)
      }
    }
  }

  async restoreFolder(id: string): Promise<void> {
    const folder = await this.getFolderById(id)
    if (folder) {
      folder.deletedAt = null
      await this.saveFolder(folder)
    }
  }

  // --- Stash Sessions ---
  async getAllStashSessions(includeDeleted = false): Promise<StashSession[]> {
    const store = await this.getStore('stash_sessions')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const all: StashSession[] = request.result || []
        if (includeDeleted) resolve(all)
        else resolve(all.filter(s => !s.deletedAt))
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveStashSession(session: StashSession): Promise<void> {
    const store = await this.getStore('stash_sessions', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(session)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteStashSession(id: string, permanent = false): Promise<void> {
    if (permanent) {
      const store = await this.getStore('stash_sessions', 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } else {
      const store = await this.getStore('stash_sessions')
      const session = await new Promise<StashSession | undefined>((res, rej) => {
        const req = store.get(id)
        req.onsuccess = () => res(req.result)
        req.onerror = () => rej(req.error)
      })
      if (session) {
        session.deletedAt = new Date().toISOString()
        await this.saveStashSession(session)
      }
    }
  }

  // --- Visual Boards ---
  async getAllVisualBoards(): Promise<VisualBoard[]> {
    const store = await this.getStore('visual_boards')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async saveVisualBoard(board: VisualBoard): Promise<void> {
    const store = await this.getStore('visual_boards', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(board)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- Feedback ---
  async getAllFeedback(): Promise<FeedbackItem[]> {
    const store = await this.getStore('feedback')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async saveFeedback(item: FeedbackItem): Promise<void> {
    const store = await this.getStore('feedback', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- Preferences ---
  async getPreferences(): Promise<ProfilePreferences> {
    const store = await this.getStore('preferences')
    return new Promise((resolve) => {
      const request = store.get('current')
      request.onsuccess = () => {
        if (request.result) resolve(request.result)
        else {
          const defaults: ProfilePreferences = {
            displayName: 'Archive Explorer',
            theme: 'dark',
            motionPreference: 'standard',
            densityPreference: 'comfortable',
            avatarSeed: 42,
            updatedAt: new Date().toISOString(),
          }
          resolve(defaults)
        }
      }
      request.onerror = () => {
        resolve({
          displayName: 'Archive Explorer',
          theme: 'dark',
          motionPreference: 'standard',
          densityPreference: 'comfortable',
          avatarSeed: 42,
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }

  async savePreferences(prefs: ProfilePreferences): Promise<void> {
    const store = await this.getStore('preferences', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put({ ...prefs, id: 'current' })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- Export & Import ---
  async exportFullArchive(): Promise<string> {
    const [bookmarks, folders, stashSessions, visualBoards, preferences] = await Promise.all([
      this.getAllBookmarks(true),
      this.getAllFolders(true),
      this.getAllStashSessions(true),
      this.getAllVisualBoards(),
      this.getPreferences(),
    ])

    const archiveData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks,
      folders,
      stashSessions,
      visualBoards,
      preferences,
    }

    return JSON.stringify(archiveData, null, 2)
  }

  async importArchive(jsonString: string): Promise<{ success: boolean; importedBookmarks: number; importedFolders: number; error?: string }> {
    try {
      const data = JSON.parse(jsonString)
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON shape')

      let importedBookmarks = 0
      let importedFolders = 0

      if (Array.isArray(data.folders)) {
        for (const f of data.folders) {
          if (f.id && f.name) {
            await this.saveFolder(f)
            importedFolders++
          }
        }
      }

      if (Array.isArray(data.bookmarks)) {
        for (const b of data.bookmarks) {
          if (b.id && b.url && b.title) {
            await this.saveBookmark(b)
            importedBookmarks++
          }
        }
      }

      if (Array.isArray(data.stashSessions)) {
        for (const s of data.stashSessions) {
          if (s.id && s.name) await this.saveStashSession(s)
        }
      }

      if (Array.isArray(data.visualBoards)) {
        for (const vb of data.visualBoards) {
          if (vb.id && vb.name) await this.saveVisualBoard(vb)
        }
      }

      return { success: true, importedBookmarks, importedFolders }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, importedBookmarks: 0, importedFolders: 0, error: message }
    }
  }

  async seedIfEmpty(): Promise<boolean> {
    const existing = await this.getAllBookmarks(true)
    if (existing.length === 0) {
      for (const f of SAMPLE_FOLDERS) await this.saveFolder(f)
      for (const b of SAMPLE_BOOKMARKS) await this.saveBookmark(b)
      await this.saveStashSession(SAMPLE_STASH)
      await this.saveVisualBoard(SAMPLE_BOARD)
      return true
    }
    return false
  }

  async clearDatabase(): Promise<void> {
    const stores = ['bookmarks', 'folders', 'stash_sessions', 'tags', 'visual_boards', 'feedback']
    for (const name of stores) {
      const store = await this.getStore(name, 'readwrite')
      await new Promise<void>((resolve, reject) => {
        const req = store.clear()
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    }
  }
}

export const db = new MarklyDatabase()
