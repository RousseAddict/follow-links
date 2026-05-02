import { useState, useCallback } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MediaCard } from '../components/MediaCard'
import { DownloadModal } from '../components/DownloadModal'
import { searchMovies, getMovieImdbId } from '../lib/tmdb'
import { fetchJellyfinMovies, jellyfinPosterUrl, parseTmdbId } from '../lib/jellyfin'
import { getStore, setStore, KEYS } from '../lib/store'
import { useSettings } from '../contexts/settings'
import { useSyncFromJellyfin, patchImdbId } from '../hooks'
import type { MovieItem, TmdbMovie, MediaStatus } from '../types'

type Filter = 'all' | MediaStatus

const STATUS_ORDER: Record<MediaStatus, number> = { wanted: 0, downloading: 1, downloaded: 2 }

function upgradeStatus(current: MediaStatus, next: MediaStatus): MediaStatus {
  return STATUS_ORDER[next] > STATUS_ORDER[current] ? next : current
}

export function Movies() {
  const { settings } = useSettings()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [library, setLibrary] = useState<MovieItem[]>(() => getStore(KEYS.movies, []))
  const [filter, setFilter] = useState<Filter>('all')
  const [downloading, setDownloading] = useState<MovieItem | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchResetKey, setSearchResetKey] = useState(0)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const [searchError, setSearchError] = useState('')
  const { syncing, syncResult, sync } = useSyncFromJellyfin()

  const save = (next: MovieItem[]) => { setLibrary(next); setStore(KEYS.movies, next) }

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) { setResults([]); return }
    if (!settings.tmdbApiKey) { setSearchError('Set your TMDB API key in Settings'); return }
    setSearching(true)
    setSearchError('')
    try {
      setResults(await searchMovies(q, settings.tmdbApiKey, settings.language))
    } catch {
      setSearchError('Search failed — check your TMDB API key')
    } finally {
      setSearching(false)
    }
  }, [settings.tmdbApiKey, settings.language])

  const addToLibrary = (movie: TmdbMovie) => {
    if (library.some(m => m.id === movie.id)) return
    const item = {
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.slice(0, 4) ?? '',
      overview: movie.overview,
      posterPath: movie.poster_path ?? '',
      status: 'wanted' as const,
      monitored: true,
      addedAt: new Date().toISOString(),
    }
    save([item, ...library])
    setSearchResetKey(k => k + 1)
    setQuery('')
    setResults([])
    setRecentlyAddedId(movie.id)
    setTimeout(() => setRecentlyAddedId(null), 2000)
    if (settings.tmdbApiKey) {
      patchImdbId(movie.id, getMovieImdbId(movie.id, settings.tmdbApiKey), setLibrary, KEYS.movies)
    }
  }

  const updateStatus = (id: number, status: MediaStatus) =>
    save(library.map(m => m.id === id ? { ...m, status } : m))

  const removeFromLibrary = (id: number) =>
    save(library.filter(m => m.id !== id))

  const handleDownloadSuccess = (movieId: number, jobId: string) => {
    save(library.map(m => m.id === movieId ? { ...m, status: 'downloading' as const, downloadJobId: jobId } : m))
    setDownloading(null)
  }

  const syncFromJellyfin = () => sync(async () => {
    const jellyfinMovies = await fetchJellyfinMovies(settings.jellyfinUrl, settings.jellyfinApiKey, settings.language)
    const byId = new Map(library.map(m => [m.id, m]))
    let added = 0, updated = 0

    for (const jm of jellyfinMovies) {
      const tmdbId = parseTmdbId(jm)
      if (tmdbId === null) continue

      const poster = jm.ImageTags?.Primary
        ? jellyfinPosterUrl(settings.jellyfinUrl, jm.Id, settings.jellyfinApiKey)
        : ''

      if (byId.has(tmdbId)) {
        const existing = byId.get(tmdbId)!
        byId.set(tmdbId, {
          ...existing,
          status: upgradeStatus(existing.status, 'downloaded'),
          posterPath: poster || existing.posterPath,
        })
        updated++
      } else {
        byId.set(tmdbId, {
          id: tmdbId,
          title: jm.Name,
          year: jm.ProductionYear ? String(jm.ProductionYear) : '',
          overview: jm.Overview ?? '',
          posterPath: poster,
          status: 'downloaded',
          monitored: true,
          addedAt: new Date().toISOString(),
        })
        added++
      }
    }

    save(Array.from(byId.values()))
    return `Synced ${added + updated} movies — ${added} new, ${updated} updated`
  })

  const libraryIds = new Set(library.map(m => m.id))
  const filteredLibrary = filter === 'all' ? library : library.filter(m => m.status === filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchBar placeholder="Search movies…" onSearch={handleSearch} resetKey={searchResetKey} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'wanted', 'downloading', 'downloaded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              {f}
            </button>
          ))}
          {settings.jellyfinUrl && (
            <button
              onClick={syncFromJellyfin}
              disabled={syncing}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 disabled:bg-gray-800 text-purple-200 disabled:text-gray-500"
            >
              {syncing
              ? <><svg className="animate-spin inline-block mr-1" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Syncing…</>
              : <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>Jellyfin</>
            }
            </button>
          )}
        </div>
      </div>

      {syncResult && (
        <p className={`text-sm ${syncResult.ok ? 'text-green-400' : 'text-red-400'}`}>
          {syncResult.message}
        </p>
      )}

      {query && (
        <section>
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Search results {searching && '— searching…'}
          </h2>
          {searchError && <p className="text-red-400 text-sm mb-3">{searchError}</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {results.map(movie => (
              <MediaCard
                key={movie.id}
                title={movie.title}
                year={movie.release_date?.slice(0, 4) ?? ''}
                posterPath={movie.poster_path ?? ''}
                isInLibrary={libraryIds.has(movie.id)}
                onAdd={() => addToLibrary(movie)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
          My movies {filteredLibrary.length > 0 && `— ${filteredLibrary.length}`}
        </h2>
        {filteredLibrary.length === 0 ? (
          <p className="text-gray-600 text-sm">No movies yet. Search and add some above.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {filteredLibrary.map(movie => (
              <MediaCard
                key={movie.id}
                title={movie.title}
                year={movie.year}
                posterPath={movie.posterPath}
                status={movie.status}
                isInLibrary
                highlighted={movie.id === recentlyAddedId}
                onStatusChange={status => updateStatus(movie.id, status)}
                onDownload={() => setDownloading(movie)}
                onRemove={() => removeFromLibrary(movie.id)}
              />
            ))}
          </div>
        )}
      </section>

      {downloading && (
        <DownloadModal
          title={`${downloading.title} (${downloading.year})`}
          searchQuery={`${downloading.title} ${downloading.year}`}
          folderKey={settings.movieFolderKey}
          imdbId={downloading.imdbId}
          onSuccess={jobId => handleDownloadSuccess(downloading.id, jobId)}
          onClose={() => setDownloading(null)}
        />
      )}
    </div>
  )
}
