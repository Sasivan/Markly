export interface Bookmark {
  id: string
  url: string
  normalizedUrl: string
  title: string
  description: string
  domain: string
  faviconUrl?: string
  thumbnailUrl?: string
  notes?: string
  tags: string[]
  folderId: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  lastVisitedAt: string | null
  visitCount: number
  deletedAt: string | null
  status: 'active' | 'archived' | 'reading-queue'
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  iconKey: string
  colorKey: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StashItem {
  id: string
  sessionId: string
  bookmarkId?: string | null
  url: string
  title: string
  order: number
}

export interface StashSession {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  items: StashItem[]
  notes?: string
  deletedAt?: string | null
}

export interface Tag {
  id: string
  name: string
  colorKey?: string
  createdAt: string
}

export interface VisualBox {
  id: string
  boardId: string
  type: 'area' | 'line' | 'bar' | 'pie' | 'radar' | 'sparkline'
  title: string
  dimension: 'domain' | 'folder' | 'tag' | 'date' | 'status'
  measure: 'count' | 'visits'
  width: '1' | '2' | '3' // col span
  order: number
}

export interface VisualBoard {
  id: string
  name: string
  scope: 'entire-archive' | 'folder' | 'tag' | 'domain'
  scopeId?: string
  createdAt: string
  updatedAt: string
  boxes: VisualBox[]
}

export interface FeedbackItem {
  id: string
  category: 'bug' | 'feature' | 'praise' | 'other'
  message: string
  createdAt: string
  deliveryState: 'local-draft' | 'outbox' | 'sent'
}

export interface ProfilePreferences {
  displayName: string
  theme: 'dark' | 'light'
  motionPreference: 'standard' | 'reduced'
  densityPreference: 'comfortable' | 'compact'
  avatarSeed: number
  updatedAt: string
}
