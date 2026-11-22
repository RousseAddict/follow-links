import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDownloader } from '../hooks/useDownloader'
import { useLibrary } from './library'
import type { DownloaderJob, MovieItem, ShowItem } from '../types'

const POLL_MS = 30_000

interface JobsContextValue {
  jobs: DownloaderJob[]
  byId: Map<string, DownloaderJob>
  loaded: boolean
  error: string
  lastUpdated: Date | null
  refresh: () => Promise<void>
  /** Keeps polling on while the caller is mounted (the Queue page). */
  watch: () => () => void
}

const Ctx = createContext<JobsContextValue | null>(null)

interface LibrarySnapshot {
  movies: MovieItem[]
  shows: ShowItem[]
  saveMovies: (next: MovieItem[]) => void
  saveShows: (next: ShowItem[]) => void
}

/** Marks titles whose job finished as downloaded. Only saves (and pushes to remote) when something changed. */
function syncCompletedJobs(jobs: DownloaderJob[], lib: LibrarySnapshot) {
  const doneIds = new Set(jobs.filter(j => j.status === 'done').map(j => j.id))
  if (doneIds.size === 0) return

  let moviesChanged = false
  const nextMovies = lib.movies.map(m => {
    if (!m.downloadJobId || !doneIds.has(m.downloadJobId) || m.status === 'downloaded') return m
    moviesChanged = true
    return { ...m, status: 'downloaded' as const }
  })
  if (moviesChanged) lib.saveMovies(nextMovies)

  let showsChanged = false
  const nextShows = lib.shows.map(show => {
    let changed = false
    const seasons = (show.seasons ?? []).map(season => {
      if (!season.downloadJobId || !doneIds.has(season.downloadJobId) || season.status === 'downloaded') return season
      changed = true
      return { ...season, status: 'downloaded' as const }
    })
    if (!changed) return show
    showsChanged = true
    return { ...show, seasons }
  })
  if (showsChanged) lib.saveShows(nextShows)
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const downloader = useDownloader()
  const { movies, shows, saveMovies, saveShows } = useLibrary()
  const [jobs, setJobs] = useState<DownloaderJob[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [watchers, setWatchers] = useState(0)

  const libRef = useRef<LibrarySnapshot>({ movies, shows, saveMovies, saveShows })
  useEffect(() => { libRef.current = { movies, shows, saveMovies, saveShows } }, [movies, shows, saveMovies, saveShows])

  const refresh = useCallback(async () => {
    if (!downloader) {
      setError('No downloader URL is set')
      setLoaded(true)
      return
    }
    try {
      const data = await downloader.listJobs()
      setJobs(data)
      setLastUpdated(new Date())
      setError('')
      syncCompletedJobs(data, libRef.current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the downloader')
    } finally {
      setLoaded(true)
    }
  }, [downloader])

  // Poll while the Queue page is open, or while something in the library is downloading
  // (so posters show live progress and finished downloads flip to "downloaded").
  const hasActive = useMemo(
    () => movies.some(m => m.status === 'downloading' && m.downloadJobId) ||
      shows.some(s => (s.seasons ?? []).some(se => se.status === 'downloading' && se.downloadJobId)),
    [movies, shows],
  )
  const shouldPoll = watchers > 0 || hasActive

  useEffect(() => {
    if (!shouldPoll) return
    refresh() // eslint-disable-line react-hooks/set-state-in-effect
    const id = setInterval(() => { if (!document.hidden) refresh() }, POLL_MS)
    const onVisible = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [shouldPoll, refresh])

  const watch = useCallback(() => {
    setWatchers(n => n + 1)
    return () => setWatchers(n => n - 1)
  }, [])

  const byId = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs])

  const value = useMemo<JobsContextValue>(
    () => ({ jobs, byId, loaded, error, lastUpdated, refresh, watch }),
    [jobs, byId, loaded, error, lastUpdated, refresh, watch],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJobs(): JobsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useJobs must be used within JobsProvider')
  return ctx
}
