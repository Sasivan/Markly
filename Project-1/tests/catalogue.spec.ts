import { describe, it, expect } from 'vitest'
import manifest from '../markly-dither-fresh-start/catalogue-manifest.json'

describe('Dither UI Catalogue Manifest Verification', () => {
  it('contains exactly 312 target items matching live crawl', () => {
    expect(manifest.items.length).toBe(312)
    expect(manifest.coverage.catalogueItems).toBe(312)
  })

  it('matches all category count requirements', () => {
    const expectedCounts: Record<string, number> = {
      Overview: 1,
      Primitives: 19,
      Typography: 25,
      Handbook: 7,
      Examples: 32,
      Components: 103,
      Backgrounds: 49,
      Text: 24,
      Animations: 50,
      Utils: 2,
    }

    const actualCounts: Record<string, number> = {}
    for (const item of manifest.items) {
      actualCounts[item.category] = (actualCounts[item.category] || 0) + 1
    }

    for (const [cat, target] of Object.entries(expectedCounts)) {
      expect(actualCounts[cat], `Category ${cat} count mismatch`).toBe(target)
    }
  })

  it('has valid docs URL and category for every item', () => {
    for (const item of manifest.items) {
      expect(item.id).toBeTruthy()
      expect(item.name).toBeTruthy()
      expect(item.docsUrl).toMatch(/^https:\/\/dither-ui\.com\/docs\//)
      expect(item.status).toBeTruthy()
      expect(item.previewRoute).toBeTruthy()
    }
  })
})
