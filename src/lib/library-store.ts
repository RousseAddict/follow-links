import type { MovieItem, ShowItem } from '../types'

export type SyncStatus = 'idle' | 'syncing' | 'ok'

/** The synced library. Settings are not part of it: they come from config.js/env or each device. */
export interface LibraryDoc {
  movies: MovieItem[]
  shows: ShowItem[]
  /** Empty until the app writes the file for the first time. */
  updatedAt: string
}

/** Where the library is shared between devices. */
export interface LibraryStore {
  /** null when the store can't be reached or has no file. */
  load(): Promise<LibraryDoc | null>
  save(doc: LibraryDoc): Promise<void>
}

/** Tolerates hand-made or older files: missing lists become empty, shows always get a seasons array. */
export function parseLibraryDoc(raw: unknown): LibraryDoc {
  const r = (raw ?? {}) as Partial<LibraryDoc>
  const shows = Array.isArray(r.shows) ? r.shows : []
  return {
    movies: Array.isArray(r.movies) ? r.movies : [],
    shows: shows.map(s => (Array.isArray(s.seasons) ? s : { ...s, seasons: [] })),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '',
  }
}

/**
 * Sends library snapshots to a store one write at a time. Saves made while a write is in
 * flight (or in the same tick) collapse into a single follow-up write of the newest snapshot,
 * so a burst of saves can't land out of order.
 */
export function createPushQueue(store: LibraryStore, onStatus: (s: SyncStatus) => void) {
  let next: LibraryDoc | null = null
  let running = false

  async function drain() {
    let ok = true
    while (next) {
      const doc = next
      next = null
      try {
        await store.save(doc)
        ok = true
      } catch (err) {
        ok = false
        console.warn('[follow-links] Failed to push the library:', err)
      }
    }
    running = false
    onStatus(ok ? 'ok' : 'idle')
  }

  return {
    push(doc: LibraryDoc) {
      next = doc
      if (running) return
      running = true
      onStatus('syncing')
      queueMicrotask(() => void drain())
    },
  }
}
