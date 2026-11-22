import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { getStore, setStore, KEYS } from '../lib/store'
import { createLibraryStore } from '../lib/backends'
import { createPushQueue, type SyncStatus } from '../lib/library-store'
import { fetchJellyfinMovies, fetchJellyfinShows, fetchJellyfinSeasons, jellyfinPosterUrl, parseTmdbId } from '../lib/jellyfin'
import { useSettings } from './settings'
import type { MovieItem, ShowItem, SeasonItem, Settings } from '../types'

interface LibraryContextValue {
  movies: MovieItem[]
  shows: ShowItem[]
  saveMovies: (next: MovieItem[]) => void
  saveShows: (next: ShowItem[]) => void
  syncStatus: SyncStatus
  /** True when a shared store is set up. */
  remoteEnabled: boolean
  /** Replaces this device's library with the shared one. False when it can't be reached. */
  reloadFromRemote: () => Promise<boolean>
  syncFromJellyfin: (s: Settings) => Promise<string>
}

const Ctx = createContext<LibraryContextValue | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { downloaderUrl, downloaderToken, movieFolderKey } = useSettings().settings
  const [movies, setMovies] = useState<MovieItem[]>(() => getStore(KEYS.movies, []))
  const [shows, setShows] = useState<ShowItem[]>(() => getStore(KEYS.shows, []))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Every write moves the refs right away (not after render), so saving movies then shows
  // in the same tick builds on both changes and the push carries the latest of each.
  const moviesRef = useRef(movies)
  const showsRef = useRef(shows)

  const store = useMemo(
    () => createLibraryStore({ downloaderUrl, downloaderToken, movieFolderKey }),
    [downloaderUrl, downloaderToken, movieFolderKey],
  )
  const queue = useMemo(() => store && createPushQueue(store, setSyncStatus), [store])

  /** Updates state, the local copy and the refs together. */
  const write = useCallback((next: { movies?: MovieItem[]; shows?: ShowItem[] }) => {
    if (next.movies) {
      moviesRef.current = next.movies
      setMovies(next.movies)
      setStore(KEYS.movies, next.movies)
    }
    if (next.shows) {
      showsRef.current = next.shows
      setShows(next.shows)
      setStore(KEYS.shows, next.shows)
    }
  }, [])

  const push = useCallback(() => {
    queue?.push({ movies: moviesRef.current, shows: showsRef.current, updatedAt: new Date().toISOString() })
  }, [queue])

  // On start, and whenever the store settings change, the shared library wins over this device's copy.
  useEffect(() => {
    if (!store) return
    let cancelled = false
    setSyncStatus('syncing') // eslint-disable-line react-hooks/set-state-in-effect
    store.load().then(remote => {
      if (cancelled) return
      if (!remote) {
        console.log('[follow-links] Shared library not available, using this device\'s copy')
        setSyncStatus('idle')
        return
      }
      // A file the app never wrote (the empty template) gets this device's library instead of wiping it.
      if (!remote.updatedAt && (moviesRef.current.length > 0 || showsRef.current.length > 0)) {
        push()
        return
      }
      write(remote)
      setSyncStatus('ok')
    })
    return () => { cancelled = true }
  }, [store, push, write])

  const saveMovies = useCallback((next: MovieItem[]) => {
    write({ movies: next })
    push()
  }, [write, push])

  const saveShows = useCallback((next: ShowItem[]) => {
    write({ shows: next })
    push()
  }, [write, push])

  const reloadFromRemote = useCallback(async (): Promise<boolean> => {
    if (!store) return false
    setSyncStatus('syncing')
    const remote = await store.load()
    if (!remote) {
      setSyncStatus('idle')
      return false
    }
    write(remote)
    setSyncStatus('ok')
    return true
  }, [store, write])

  const syncFromJellyfin = useCallback(async (s: Settings): Promise<string> => {
    // ── Movies ────────────────────────────────────────────────────────────
    const jellyfinMovies = await fetchJellyfinMovies(s.jellyfinUrl, s.jellyfinApiKey, s.language)
    const movieMap = new Map(moviesRef.current.map(m => [m.id, m]))
    let moviesAdded = 0, moviesUpdated = 0
    for (const jm of jellyfinMovies) {
      const tmdbId = parseTmdbId(jm)
      if (!tmdbId) continue
      const poster = jm.ImageTags?.Primary ? jellyfinPosterUrl(s.jellyfinUrl, jm.Id, s.jellyfinApiKey) : ''
      if (movieMap.has(tmdbId)) {
        movieMap.set(tmdbId, { ...movieMap.get(tmdbId)!, ...(poster ? { posterPath: poster } : {}) })
        moviesUpdated++
      } else {
        movieMap.set(tmdbId, {
          id: tmdbId, title: jm.Name, year: jm.ProductionYear?.toString() ?? '',
          overview: jm.Overview ?? '', posterPath: poster,
          status: 'downloaded', monitored: true, addedAt: new Date().toISOString(),
        })
        moviesAdded++
      }
    }
    write({ movies: Array.from(movieMap.values()) })

    // ── Shows ─────────────────────────────────────────────────────────────
    const jellyfinShows = await fetchJellyfinShows(s.jellyfinUrl, s.jellyfinApiKey, s.language)
    const showMap = new Map(showsRef.current.map(sh => [sh.id, sh]))
    let showsAdded = 0, showsUpdated = 0
    for (const js of jellyfinShows) {
      const tmdbId = parseTmdbId(js)
      if (!tmdbId) continue
      let downloadedNums = new Set<number>()
      try {
        const seasons = await fetchJellyfinSeasons(js.Id, s.jellyfinUrl, s.jellyfinApiKey)
        downloadedNums = new Set(seasons.map(season => season.IndexNumber))
      } catch { /* skip season detail, still import the show */ }
      const poster = js.ImageTags?.Primary ? jellyfinPosterUrl(s.jellyfinUrl, js.Id, s.jellyfinApiKey) : ''
      if (showMap.has(tmdbId)) {
        const existing = showMap.get(tmdbId)!
        const existingNums = new Set(existing.seasons.map(se => se.seasonNumber))
        const newSeasons: SeasonItem[] = [...downloadedNums]
          .filter(n => !existingNums.has(n))
          .map(n => ({ seasonNumber: n, episodeCount: 0, status: 'downloaded', monitored: true }))
        showMap.set(tmdbId, {
          ...existing,
          ...(poster ? { posterPath: poster } : {}),
          seasons: [
            ...existing.seasons.map(se =>
              downloadedNums.has(se.seasonNumber) ? { ...se, status: 'downloaded' as const } : se,
            ),
            ...newSeasons,
          ],
        })
        showsUpdated++
      } else {
        showMap.set(tmdbId, {
          id: tmdbId, title: js.Name, overview: js.Overview ?? '',
          posterPath: poster, monitored: true, addedAt: new Date().toISOString(),
          seasons: [...downloadedNums].map(n => ({
            seasonNumber: n, episodeCount: 0, status: 'downloaded', monitored: true,
          })),
        })
        showsAdded++
      }
    }
    write({ shows: Array.from(showMap.values()) })
    push()

    return `Movies: +${moviesAdded} new, ${moviesUpdated} updated · Shows: +${showsAdded} new, ${showsUpdated} updated`
  }, [write, push])

  return (
    <Ctx.Provider value={{
      movies, shows, saveMovies, saveShows,
      syncStatus: store ? syncStatus : 'idle',
      remoteEnabled: !!store,
      reloadFromRemote, syncFromJellyfin,
    }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLibrary(): LibraryContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
