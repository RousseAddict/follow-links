import { useState, useCallback } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MediaCard } from '../components/MediaCard'
import { SeasonPanel } from '../components/SeasonPanel'
import { DownloadModal } from '../components/DownloadModal'
import { searchShows, getSeasons, getShowImdbId, posterUrl } from '../lib/tmdb'
import { useSettings } from '../contexts/settings'
import { useLibrary } from '../contexts/library'
import { patchImdbId } from '../hooks'
import { getStore, setStore, KEYS } from '../lib/store'
import type { ShowItem, SeasonItem, TmdbShow } from '../types'

type Sort = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'

function updateSeason(
  library: ShowItem[],
  showId: number,
  seasonNumber: number,
  patch: Partial<SeasonItem>,
): ShowItem[] {
  return library.map(show => show.id !== showId ? show : {
    ...show,
    seasons: (show.seasons ?? []).map(s => s.seasonNumber === seasonNumber ? { ...s, ...patch } : s),
  })
}

export function Shows() {
  const { settings } = useSettings()
  const { shows: library, saveShows: save } = useLibrary()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbShow[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [downloadTarget, setDownloadTarget] = useState<{ show: ShowItem; season: SeasonItem } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [addingId, setAddingId] = useState<number | null>(null)
  const [searchResetKey, setSearchResetKey] = useState(0)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>(() => getStore<Sort>(KEYS.showsSort, 'date-desc'))

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) { setResults([]); return }
    if (!settings.tmdbApiKey) { setSearchError('Set your TMDB API key in Settings'); return }
    setSearching(true)
    setSearchError('')
    try {
      setResults(await searchShows(q, settings.tmdbApiKey, settings.language))
    } catch {
      setSearchError('Search failed — check your TMDB API key')
    } finally {
      setSearching(false)
    }
  }, [settings.tmdbApiKey, settings.language])

  const addToLibrary = async (show: TmdbShow) => {
    if (library.some(s => s.id === show.id)) return
    setAddingId(show.id)
    if (!settings.tmdbApiKey) { setAddingId(null); return }
    const base: Omit<ShowItem, 'seasons'> = {
      id: show.id,
      title: show.name,
      overview: show.overview,
      posterPath: show.poster_path ?? '',
      monitored: true,
      addedAt: new Date().toISOString(),
    }
    let seasons: SeasonItem[] = []
    try {
      seasons = (await getSeasons(show.id, settings.tmdbApiKey, settings.language)).map(s => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        status: 'wanted' as const,
        monitored: true,
      }))
    } catch { /* add with empty seasons rather than failing */ }
    try {
      save([{ ...base, seasons }, ...library])
      patchImdbId(show.id, getShowImdbId(show.id, settings.tmdbApiKey), [{ ...base, seasons }, ...library], save)
      setSearchResetKey(k => k + 1)
      setQuery('')
      setResults([])
      setRecentlyAddedId(show.id)
      setTimeout(() => setRecentlyAddedId(null), 2000)
    } finally {
      setAddingId(null)
    }
  }

  const removeFromLibrary = (id: number) =>
    save(library.filter(s => s.id !== id))

  const handleStatusChange = (showId: number, seasonNumber: number, status: SeasonItem['status']) =>
    save(updateSeason(library, showId, seasonNumber, { status }))

  const handleDownloadSuccess = (showId: number, seasonNumber: number, jobId: string) => {
    save(updateSeason(library, showId, seasonNumber, { status: 'downloading', downloadJobId: jobId }))
    setDownloadTarget(null)
  }

  const libraryIds = new Set(library.map(s => s.id))
  const sortedLibrary = library.slice().sort((a, b) => {
    if (sort === 'date-desc') return a.addedAt < b.addedAt ? 1 : -1
    if (sort === 'date-asc') return a.addedAt > b.addedAt ? 1 : -1
    if (sort === 'title-asc') return a.title.localeCompare(b.title)
    return b.title.localeCompare(a.title)
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SearchBar placeholder="Search TV shows…" onSearch={handleSearch} resetKey={searchResetKey} />
        {/* Desktop: pill buttons */}
        <div className="hidden md:flex justify-end gap-1">
          {([['date-desc', 'Date ↓'], ['date-asc', 'Date ↑'], ['title-asc', 'A→Z'], ['title-desc', 'Z→A']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setSort(value); setStore(KEYS.showsSort, value) }}
              className={`text-xs px-3 py-1.5 rounded-lg ${sort === value ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Mobile: dropdown */}
        <div className="flex md:hidden">
          <select
            value={sort}
            onChange={e => { const v = e.target.value as Sort; setSort(v); setStore(KEYS.showsSort, v) }}
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
            {results.map(show => (
              <MediaCard
                key={show.id}
                title={show.name}
                year={show.first_air_date?.slice(0, 4) ?? ''}
                posterPath={show.poster_path ?? ''}
                isInLibrary={libraryIds.has(show.id)}
                onAdd={() => addToLibrary(show)}
              />
            ))}
            {addingId !== null && (
              <div className="text-gray-500 text-xs flex items-center">Adding…</div>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
          My shows {library.length > 0 && `— ${library.length}`}
        </h2>
        {library.length === 0 ? (
          <p className="text-gray-600 text-sm">No shows yet. Search and add some above.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedLibrary.map(show => {
              const allDownloaded = show.seasons.length > 0 && show.seasons.every(s => s.status === 'downloaded')
              return (
                <div key={show.id} className={`bg-gray-900 rounded-xl overflow-hidden transition-shadow ${show.id === recentlyAddedId ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-950' : ''}`}>
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => setExpandedId(expandedId === show.id ? null : show.id)}
                  >
                    {show.posterPath && (
                      <img
                        src={posterUrl(show.posterPath, 'w92')}
                        alt={show.title}
                        className="w-10 h-14 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-100 text-sm font-medium truncate">{show.title}</p>
                      <p className="text-gray-500 text-xs">{show.seasons.length} seasons</p>
                    </div>
                    <span className="text-gray-500 text-xs">{expandedId === show.id ? '▲' : '▼'}</span>
                    <button
                      onClick={e => { e.stopPropagation(); if (!allDownloaded) removeFromLibrary(show.id) }}
                      disabled={allDownloaded}
                      className={`text-xs px-1 ${allDownloaded ? 'text-gray-700 cursor-not-allowed' : 'text-gray-600 hover:text-red-400'}`}
                      title={allDownloaded ? 'Cannot remove downloaded media' : 'Remove from library'}
                    >
                      ✕
                    </button>
                  </div>
                  {expandedId === show.id && (
                    <SeasonPanel
                      seasons={show.seasons ?? []}
                      onStatusChange={(n, status) => handleStatusChange(show.id, n, status)}
                      onDownload={season => setDownloadTarget({ show, season })}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {downloadTarget && (
        <DownloadModal
          title={`${downloadTarget.show.title} — Season ${downloadTarget.season.seasonNumber}`}
          searchQuery={`${downloadTarget.show.title} S${String(downloadTarget.season.seasonNumber).padStart(2, '0')}`}
          folderKey={settings.tvFolderKey}
          imdbId={downloadTarget.show.imdbId}
          season={downloadTarget.season.seasonNumber}
          onSuccess={jobId => handleDownloadSuccess(downloadTarget.show.id, downloadTarget.season.seasonNumber, jobId)}
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </div>
  )
}
