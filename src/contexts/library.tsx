import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { getStore, setStore, KEYS } from '../lib/store'
import { fetchRemoteLibrary, pushRemoteLibrary, isRemoteConfigured } from '../lib/remote-store'
import { useSettings } from './settings'
import type { MovieItem, ShowItem } from '../types'

export type SyncStatus = 'idle' | 'syncing' | 'ok'

interface LibraryContextValue {
  movies: MovieItem[]
  shows: ShowItem[]
  saveMovies: (next: MovieItem[]) => void
  saveShows: (next: ShowItem[]) => void
  syncStatus: SyncStatus
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
    setSyncStatus('syncing')
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

  return (
    <Ctx.Provider value={{ movies, shows, saveMovies, saveShows, syncStatus }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
