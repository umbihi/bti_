export type StorageArea = 'local' | 'session'

export const STORAGE_KEYS = {
  apiKey: 'sf.apiKey',
  prefs: 'sf.prefs',
  stamps: 'sf.stamps',
  achievements: 'sf.achievements',
  anonId: 'sf.anonId',
} as const

function getArea(area: StorageArea): Storage | null {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readString(key: string, area: StorageArea = 'local'): string | null {
  try {
    return getArea(area)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeString(key: string, value: string, area: StorageArea = 'local') {
  try {
    getArea(area)?.setItem(key, value)
  } catch {
    // Storage may be full or blocked; the app keeps working in memory.
  }
}

export function removeKey(key: string, area: StorageArea = 'local') {
  try {
    getArea(area)?.removeItem(key)
  } catch {
    // ignore
  }
}

export function readJSON<T>(key: string, fallback: T, area: StorageArea = 'local'): T {
  const raw = readString(key, area)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown, area: StorageArea = 'local') {
  try {
    writeString(key, JSON.stringify(value), area)
  } catch {
    // ignore
  }
}

export function ensureAnonId() {
  const existing = readString(STORAGE_KEYS.anonId)
  if (existing) return existing
  try {
    const id = crypto.randomUUID()
    writeString(STORAGE_KEYS.anonId, id)
    return id
  } catch {
    return null
  }
}
