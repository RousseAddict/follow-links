import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { getStore, setStore, KEYS } from '../lib/store'
import { fetchRemoteLibrary, pushRemoteLibrary, isRemoteConfigured } from '../lib/remote-store'
import { fetchJellyfinMovies, fetchJellyfinShows, fetchJellyfinSeasons, jellyfinPosterUrl, parseTmdbId } from '../lib/jellyfin'
import { useSettings } from './settings'
import type { MovieItem, ShowItem, SeasonItem, Settings } from '../types'

export type SyncStatus = 'idle' | 'syncing' | 'ok'

interface LibraryContextValue {
  movies: MovieItem[]
  shows: ShowItem[]
  saveMovies: (next: MovieItem[]) => void
  saveShows: (next: ShowItem[]) => void
  syncStatus: SyncStatus
  syncFromRemote: (s: Settings) => Promise<Partial<Settings> | null>
  syncFromJellyfin: (s: Settings) => Promise<string>
}

const Ctx = createContext<LibraryContextValue | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [movies, setMovies] = useState<MovieItem[]>(() => getStore(KEYS.movies, []))
  const [shows, setShows] = useState<ShowItem[]>(() => getStore(KEYS.shows, []))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Refs so push callbacks always see the latest data without re-creating them
  const moviesRef = useRef(movies)
  const showsRef = useRef(shows)
  useEffect(() => { moviesRef.current = movies }, [movies])
  useEffect(() => { showsRef.current = shows }, [shows])

  // On mount: pull remote and use as source of truth if available
  useEffect(() => {
    if (!isRemoteConfigured(settings)) return
    setSyncStatus('syncing') // eslint-disable-line react-hooks/set-state-in-effect
    fetchRemoteLibrary(settings)
      .then(remote => {
        if (!remote) {
          console.log('[follow-links] Remote library not available, using localStorage')
          setSyncStatus('idle')
          return
        }
        setMovies(remote.movies)
        setShows(remote.shows)
        setStore(KEYS.movies, remote.movies)
        setStore(KEYS.shows, remote.shows)
        moviesRef.current = remote.movies
        showsRef.current = remote.shows
        setSyncStatus('ok')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback((nextMovies: MovieItem[], nextShows: ShowItem[]) => {
    if (!isRemoteConfigured(settings)) return
    setSyncStatus('syncing')
    pushRemoteLibrary(nextMovies, nextShows, settings)
      .then(() => setSyncStatus('ok'))
      .catch(err => {
        console.warn('[follow-links] Failed to push to remote library:', err)
        setSyncStatus('idle')
      })
  }, [settings])

  const saveMovies = useCallback((next: MovieItem[]) => {
    setMovies(next)
    setStore(KEYS.movies, next)
    push(next, showsRef.current)
  }, [push])

  const saveShows = useCallback((next: ShowItem[]) => {
    setShows(next)
    setStore(KEYS.shows, next)
    push(moviesRef.current, next)
  }, [push])

  const syncFromRemote = useCallback(async (s: Settings): Promise<Partial<Settings> | null> => {
    if (!isRemoteConfigured(s)) return null
    setSyncStatus('syncing')
    try {
      const remote = await fetchRemoteLibrary(s)
      if (!remote) { setSyncStatus('idle'); return null }
      setMovies(remote.movies)
      setShows(remote.shows)
      setStore(KEYS.movies, remote.movies)
      setStore(KEYS.shows, remote.shows)
      moviesRef.current = remote.movies
      showsRef.current = remote.shows
      setSyncStatus('ok')
      return remote.settings ?? null
    } catch {
      setSyncStatus('idle')
      return null
    }
  }, [])

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
    const nextMovies = Array.from(movieMap.values())
    setMovies(nextMovies)
    setStore(KEYS.movies, nextMovies)
    moviesRef.current = nextMovies

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
    const nextShows = Array.from(showMap.values())
    setShows(nextShows)
    setStore(KEYS.shows, nextShows)
    showsRef.current = nextShows

    push(nextMovies, nextShows)

    return `Movies: +${moviesAdded} new, ${moviesUpdated} updated · Shows: +${showsAdded} new, ${showsUpdated} updated`
  }, [push])

  return (
    <Ctx.Provider value={{ movies, shows, saveMovies, saveShows, syncStatus, syncFromRemote, syncFromJellyfin }}>
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
