import { useState, useCallback } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MediaCard } from '../components/MediaCard'
import { DownloadModal } from '../components/DownloadModal'
import { searchMovies } from '../lib/tmdb'
import { fetchJellyfinMovies, jellyfinPosterUrl, parseTmdbId } from '../lib/jellyfin'
import { getStore, setStore, KEYS, SETTING_DEFAULTS } from '../lib/store'
import type { MovieItem, TmdbMovie, MediaStatus, SyncResult } from '../types'

type Filter = 'all' | MediaStatus

export function Movies() {
  const [settings] = useState(() => getStore(KEYS.settings, SETTING_DEFAULTS))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [library, setLibrary] = useState<MovieItem[]>(() => getStore(KEYS.movies, []))
  const [filter, setFilter] = useState<Filter>('all')
  const [downloading, setDownloading] = useState<MovieItem | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult>(null)

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
  }, [settings.tmdbApiKey])

  const addToLibrary = (movie: TmdbMovie) => {
    if (library.some(m => m.id === movie.id)) return
    save([{
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.slice(0, 4) ?? '',
      overview: movie.overview,
      posterPath: movie.poster_path ?? '',
      status: 'wanted',
      monitored: true,
      addedAt: new Date().toISOString(),
    }, ...library])
  }

  const updateStatus = (id: number, status: MediaStatus) =>
    save(library.map(m => m.id === id ? { ...m, status } : m))

  const handleDownloadSuccess = (movieId: number, jobId: string) => {
    save(library.map(m => m.id === movieId ? { ...m, status: 'downloading' as const, downloadJobId: jobId } : m))
    setDownloading(null)
  }

  const syncFromJellyfin = async () => {
    if (!settings.jellyfinUrl || !settings.jellyfinApiKey) {
      setSyncResult({ ok: false, message: 'Set Jellyfin URL and API key in Settings first' })
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
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
          byId.set(tmdbId, { ...existing, status: 'downloaded', posterPath: poster || existing.posterPath })
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
      setSyncResult({ ok: true, message: `Synced ${added + updated} movies — ${added} new, ${updated} updated` })
    } catch (e) {
      setSyncResult({ ok: false, message: e instanceof Error ? `Sync failed: ${e.message}` : 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  const libraryIds = new Set(library.map(m => m.id))
  const filteredLibrary = filter === 'all' ? library : library.filter(m => m.status === filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchBar placeholder="Search movies…" onSearch={handleSearch} />
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
              {syncing ? 'Syncing…' : '⟳ Jellyfin'}
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
                onStatusChange={status => updateStatus(movie.id, status)}
                onDownload={() => setDownloading(movie)}
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
          onSuccess={jobId => handleDownloadSuccess(downloading.id, jobId)}
          onClose={() => setDownloading(null)}
        />
      )}
    </div>
  )
}
