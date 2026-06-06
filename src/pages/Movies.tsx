import { useState, useCallback } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MediaCard } from '../components/MediaCard'
import { DownloadModal } from '../components/DownloadModal'
import { searchMovies, getMovieImdbId } from '../lib/tmdb'
import { useSettings } from '../contexts/settings'
import { useLibrary } from '../contexts/library'
import { patchImdbId } from '../hooks'
import { getStore, setStore, KEYS } from '../lib/store'
import type { MovieItem, TmdbMovie, MediaStatus } from '../types'

type Filter = 'all' | MediaStatus
type Sort = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'


export function Movies() {
  const { settings } = useSettings()
  const { movies: library, saveMovies: save } = useLibrary()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>(() => getStore<Sort>(KEYS.moviesSort, 'date-desc'))
  const [downloading, setDownloading] = useState<MovieItem | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchResetKey, setSearchResetKey] = useState(0)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const [searchError, setSearchError] = useState('')

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
      patchImdbId(movie.id, getMovieImdbId(movie.id, settings.tmdbApiKey), [...library, item], save)
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

  const libraryIds = new Set(library.map(m => m.id))
  const filteredLibrary = (filter === 'all' ? library : library.filter(m => m.status === filter))
    .slice()
    .sort((a, b) => {
      if (sort === 'date-desc') return a.addedAt < b.addedAt ? 1 : -1
      if (sort === 'date-asc') return a.addedAt > b.addedAt ? 1 : -1
      if (sort === 'title-asc') return a.title.localeCompare(b.title)
      return b.title.localeCompare(a.title)
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SearchBar placeholder="Search movies…" onSearch={handleSearch} resetKey={searchResetKey} />
        {/* Desktop: pill buttons */}
        <div className="hidden md:flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(['all', 'wanted', 'downloading', 'downloaded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([['date-desc', 'Date ↓'], ['date-asc', 'Date ↑'], ['title-asc', 'A→Z'], ['title-desc', 'Z→A']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setSort(value); setStore(KEYS.moviesSort, value) }}
                className={`text-xs px-3 py-1.5 rounded-lg ${sort === value ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Mobile: dropdowns */}
        <div className="flex md:hidden gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as Filter)}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 border-none outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="wanted">Wanted</option>
            <option value="downloading">Downloading</option>
            <option value="downloaded">Downloaded</option>
          </select>
          <select
            value={sort}
            onChange={e => { const v = e.target.value as Sort; setSort(v); setStore(KEYS.moviesSort, v) }}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 border-none outline-none cursor-pointer"
          >
            <option value="date-desc">Date ↓</option>
            <option value="date-asc">Date ↑</option>
            <option value="title-asc">A→Z</option>
            <option value="title-desc">Z→A</option>
          </select>
        </div>
      </div>

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
