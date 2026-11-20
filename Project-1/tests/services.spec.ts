import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/data/db'
import { bookmarkService } from '../src/services/bookmarkService'
import { folderService } from '../src/services/folderService'
import { stashService } from '../src/services/stashService'
import { analyticsService } from '../src/services/analyticsService'
import { SAMPLE_BOOKMARKS, SAMPLE_FOLDERS, SAMPLE_BOARD } from '../src/data/sample-data'

describe('Markly Data Layer & Service Integration Tests', () => {
  beforeEach(async () => {
    await db.clearDatabase()
  })

  describe('Sample Data Integrity', () => {
    it('has valid folder hierarchy without cyclic references', () => {
      const folderIds = new Set(SAMPLE_FOLDERS.map(f => f.id))
      for (const f of SAMPLE_FOLDERS) {
        if (f.parentId) {
          expect(folderIds.has(f.parentId)).toBe(true)
          expect(f.parentId).not.toBe(f.id)
        }
      }
    })

    it('has properly formatted URLs and non-empty domains in sample bookmarks', () => {
      for (const b of SAMPLE_BOOKMARKS) {
        expect(b.domain).toBeTruthy()
        expect(b.url.startsWith('http')).toBe(true)
        expect(b.normalizedUrl).toBeTruthy()
        expect(Array.isArray(b.tags)).toBe(true)
      }
    })

    it('extracts clean domain without www prefix', () => {
      const url = 'https://www.sub.example.com/path?arg=1'
      const parsed = new URL(url)
      const domain = parsed.hostname.replace(/^www\./, '')
      expect(domain).toBe('sub.example.com')
    })
  })

  describe('Bookmark Service CRUD & Search', () => {
    it('adds and retrieves a bookmark with normalized domain', async () => {
      const created = await bookmarkService.addBookmark({
        title: 'Dither UI Documentation',
        url: 'https://www.dither-ui.com/docs/components',
        description: 'Complete component gallery for Dither UI',
        tags: ['dither', 'design', 'ui'],
      })

      expect(created.id).toBeTruthy()
      expect(created.domain).toBe('dither-ui.com')
      expect(created.isFavorite).toBe(false)
      expect(created.tags).toContain('dither')

      const all = await bookmarkService.getBookmarks()
      expect(all.length).toBe(1)
      expect(all[0].title).toBe('Dither UI Documentation')
    })

    it('filters bookmarks across title, domain, description, and tags', async () => {
      await bookmarkService.addBookmark({
        title: 'SolidJS Reactive Primitives',
        url: 'https://solidjs.com',
        description: 'Fine-grained reactivity',
        tags: ['solid', 'reactive'],
      })

      await bookmarkService.addBookmark({
        title: 'Bayer Dither Matrices',
        url: 'https://en.wikipedia.org/wiki/Ordered_dithering',
        description: 'Ordered dithering algorithm explanation',
        tags: ['math', 'graphics'],
      })

      // Search by title
      const searchTitle = await bookmarkService.getBookmarks({ query: 'SolidJS' })
      expect(searchTitle.length).toBe(1)
      expect(searchTitle[0].title).toContain('SolidJS')

      // Search by tag
      const searchTag = await bookmarkService.getBookmarks({ query: 'graphics' })
      expect(searchTag.length).toBe(1)
      expect(searchTag[0].title).toContain('Bayer')

      // Search by domain
      const searchDomain = await bookmarkService.getBookmarks({ query: 'wikipedia' })
      expect(searchDomain.length).toBe(1)

      // Search by description
      const searchDesc = await bookmarkService.getBookmarks({ query: 'fine-grained' })
      expect(searchDesc.length).toBe(1)
    })

    it('handles favorite toggles, visit increments, soft delete and restore', async () => {
      const b = await bookmarkService.addBookmark({
        title: 'Test Favorite',
        url: 'https://example.com/test',
      })

      // Toggle favorite
      await bookmarkService.toggleFavorite(b.id, true)
      let retrieved = await db.getBookmarkById(b.id)
      expect(retrieved?.isFavorite).toBe(true)

      // Record visit
      await bookmarkService.recordVisit(b.id)
      retrieved = await db.getBookmarkById(b.id)
      expect(retrieved?.visitCount).toBe(1)
      expect(retrieved?.lastVisitedAt).toBeTruthy()

      // Soft delete
      await bookmarkService.deleteBookmark(b.id, false)
      const activeBookmarks = await bookmarkService.getBookmarks({ includeDeleted: false })
      expect(activeBookmarks.some(x => x.id === b.id)).toBe(false)

      const trashBookmarks = await bookmarkService.getBookmarks({ includeDeleted: true })
      const inTrash = trashBookmarks.find(x => x.id === b.id)
      expect(inTrash?.deletedAt).not.toBeNull()

      // Restore from trash
      await bookmarkService.restoreBookmark(b.id)
      const restored = await bookmarkService.getBookmarks({ includeDeleted: false })
      expect(restored.some(x => x.id === b.id)).toBe(true)

      // Permanent delete
      await bookmarkService.deleteBookmark(b.id, true)
      const permanentlyDeleted = await db.getBookmarkById(b.id)
      expect(permanentlyDeleted).toBeUndefined()
    })
  })

  describe('Folder Service Hierarchy', () => {
    it('creates nested folders and builds recursive tree with link counts', async () => {
      const parent = await folderService.createFolder('Design Systems', null, 'blue')
      const child = await folderService.createFolder('Dither UI', parent.id, 'purple')

      await bookmarkService.addBookmark({
        title: 'Component Kit',
        url: 'https://dither-ui.com',
        folderId: child.id,
      })

      const tree = await folderService.getFolderTree()
      expect(tree.length).toBe(1)
      expect(tree[0].id).toBe(parent.id)
      expect(tree[0].children.length).toBe(1)
      expect(tree[0].children[0].id).toBe(child.id)
      expect(tree[0].children[0].linkCount).toBe(1)
    })

    it('renames and moves folders', async () => {
      const f1 = await folderService.createFolder('Initial Name')
      await folderService.renameFolder(f1.id, 'Updated Name')
      let updated = await folderService.getFolderById(f1.id)
      expect(updated?.name).toBe('Updated Name')

      const parent = await folderService.createFolder('Root')
      await folderService.moveFolder(f1.id, parent.id)
      updated = await folderService.getFolderById(f1.id)
      expect(updated?.parentId).toBe(parent.id)
    })
  })

  describe('Stash Service & Sessions', () => {
    it('creates a stash session, copies URLs, and lists sessions', async () => {
      const session = await stashService.createSession(
        'Research Batch',
        [
          { url: 'https://dither-ui.com/docs', title: 'Docs' },
          { url: 'https://github.com/drvova/dither-ui', title: 'GitHub' },
        ],
        'Session notes for research',
      )

      expect(session.items.length).toBe(2)
      expect(session.name).toBe('Research Batch')

      const urls = await stashService.copySessionUrls(session)
      expect(urls).toContain('https://dither-ui.com/docs')
      expect(urls).toContain('https://github.com/drvova/dither-ui')

      const all = await stashService.getSessions()
      expect(all.length).toBe(1)
      expect(all[0].id).toBe(session.id)
    })
  })

  describe('Analytics Service Computations', () => {
    it('computes domain distribution correctly', async () => {
      const bookmarks = [
        { domain: 'google.com' },
        { domain: 'google.com' },
        { domain: 'github.com' },
        { domain: 'dither-ui.com' },
      ] as any

      const dist = await analyticsService.getDomainDistribution(bookmarks)
      expect(dist[0].x).toBe('google.com')
      expect(dist[0].y).toBe(2)
      expect(dist.some(d => d.x === 'github.com')).toBe(true)
    })

    it('loads default sample visual board if none exist', async () => {
      const boards = await analyticsService.getBoards()
      expect(boards.length).toBeGreaterThan(0)
      expect(boards[0].id).toBe(SAMPLE_BOARD.id)
    })
  })

  describe('Data Portability & Import/Export Validation', () => {
    it('exports and restores full archive seamlessly', async () => {
      const folder = await folderService.createFolder('Export Test Folder')
      await bookmarkService.addBookmark({
        title: 'Export Test Bookmark',
        url: 'https://archive.org',
        folderId: folder.id,
      })

      const exportedJson = await db.exportFullArchive()
      expect(typeof exportedJson).toBe('string')
      const parsed = JSON.parse(exportedJson)
      expect(parsed.version).toBe(1)
      expect(parsed.bookmarks.length).toBe(1)
      expect(parsed.folders.length).toBe(1)

      // Clear and re-import
      await db.clearDatabase()
      const clearedBookmarks = await bookmarkService.getBookmarks()
      expect(clearedBookmarks.length).toBe(0)

      const result = await db.importArchive(exportedJson)
      expect(result.success).toBe(true)
      expect(result.importedBookmarks).toBe(1)
      expect(result.importedFolders).toBe(1)

      const restored = await bookmarkService.getBookmarks()
      expect(restored.length).toBe(1)
      expect(restored[0].title).toBe('Export Test Bookmark')
    })

    it('rejects malformed or invalid JSON gracefully during import', async () => {
      const invalidJsonResult = await db.importArchive('{ invalid json string ...')
      expect(invalidJsonResult.success).toBe(false)
      expect(invalidJsonResult.error).toBeTruthy()

      const nonObjectResult = await db.importArchive('null')
      expect(nonObjectResult.success).toBe(false)

      const emptyObjResult = await db.importArchive('{}')
      expect(emptyObjResult.success).toBe(true)
      expect(emptyObjResult.importedBookmarks).toBe(0)
      expect(emptyObjResult.importedFolders).toBe(0)
    })
  })
})
