import { useState, useCallback } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MediaCard } from '../components/MediaCard'
import { SeasonPanel } from '../components/SeasonPanel'
import { DownloadModal } from '../components/DownloadModal'
import { searchShows, getSeasons, posterUrl } from '../lib/tmdb'
import { fetchJellyfinShows, fetchJellyfinSeasons, jellyfinPosterUrl, parseTmdbId } from '../lib/jellyfin'
import { getStore, setStore, KEYS, SETTING_DEFAULTS } from '../lib/store'
import type { ShowItem, SeasonItem, TmdbShow, SyncResult } from '../types'

export function Shows() {
  const [settings] = useState(() => getStore(KEYS.settings, SETTING_DEFAULTS))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbShow[]>([])
  const [library, setLibrary] = useState<ShowItem[]>(() => getStore(KEYS.shows, []))
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [downloadTarget, setDownloadTarget] = useState<{ show: ShowItem; season: SeasonItem } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [addingId, setAddingId] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult>(null)

  const save = (next: ShowItem[]) => { setLibrary(next); setStore(KEYS.shows, next) }

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q) { setResults([]); return }
    if (!settings.tmdbApiKey) { setSearchError('Set your TMDB API key in Settings'); return }
    setSearching(true)
    setSearchError('')
    try {
      setResults(await searchShows(q, settings.tmdbApiKey))
    } catch {
      setSearchError('Search failed — check your TMDB API key')
    } finally {
      setSearching(false)
    }
  }, [settings.tmdbApiKey])

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
      seasons = (await getSeasons(show.id, settings.tmdbApiKey)).map(s => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        status: 'wanted' as const,
        monitored: true,
      }))
    } catch { /* add with empty seasons rather than failing */ }
    try {
      save([{ ...base, seasons }, ...library])
    } finally {
      setAddingId(null)
    }
  }

  const updateSeasonStatus = (showId: number, seasonNumber: number, status: SeasonItem['status']) =>
    save(library.map(show => show.id !== showId ? show : {
      ...show,
      seasons: (show.seasons ?? []).map(s => s.seasonNumber === seasonNumber ? { ...s, status } : s),
    }))

  const handleDownloadSuccess = (showId: number, seasonNumber: number, jobId: string) => {
    save(library.map(show => show.id !== showId ? show : {
      ...show,
      seasons: (show.seasons ?? []).map(s =>
        s.seasonNumber === seasonNumber ? { ...s, status: 'downloading' as const, downloadJobId: jobId } : s,
      ),
    }))
    setDownloadTarget(null)
  }

  const syncFromJellyfin = async () => {
    if (!settings.jellyfinUrl || !settings.jellyfinApiKey) {
      setSyncResult({ ok: false, message: 'Set Jellyfin URL and API key in Settings first' })
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      const jellyfinShows = await fetchJellyfinShows(settings.jellyfinUrl, settings.jellyfinApiKey)
      const byId = new Map(library.map(s => [s.id, s]))
      let added = 0, updated = 0

      for (const js of jellyfinShows) {
        const tmdbId = parseTmdbId(js)
        if (tmdbId === null) continue

        // Per-show try/catch so one bad season fetch doesn't abort the entire sync
        let downloadedNums = new Set<number>()
        try {
          const jellyfinSeasons = await fetchJellyfinSeasons(js.Id, settings.jellyfinUrl, settings.jellyfinApiKey)
          downloadedNums = new Set(jellyfinSeasons.map(s => s.IndexNumber))
        } catch { /* skip season status for this show, still import it */ }

        const poster = js.ImageTags?.Primary
          ? jellyfinPosterUrl(settings.jellyfinUrl, js.Id, settings.jellyfinApiKey)
          : ''

        if (byId.has(tmdbId)) {
          const existing = byId.get(tmdbId)!
          byId.set(tmdbId, {
            ...existing,
            posterPath: poster || existing.posterPath,
            seasons: (existing.seasons ?? []).map(s =>
              downloadedNums.has(s.seasonNumber) ? { ...s, status: 'downloaded' as const } : s,
            ),
          })
          updated++
        } else {
          let seasons: SeasonItem[] = []
          try {
            seasons = (await getSeasons(tmdbId, settings.tmdbApiKey)).map(s => ({
              seasonNumber: s.season_number,
              episodeCount: s.episode_count,
              status: downloadedNums.has(s.season_number) ? 'downloaded' as const : 'wanted' as const,
              monitored: true,
            }))
          } catch {
            seasons = Array.from(downloadedNums).sort((a, b) => a - b).map(n => ({
              seasonNumber: n, episodeCount: 0, status: 'downloaded' as const, monitored: true,
            }))
          }
          byId.set(tmdbId, {
            id: tmdbId,
            title: js.Name,
            overview: js.Overview ?? '',
            posterPath: poster,
            monitored: true,
            addedAt: new Date().toISOString(),
            seasons,
          })
          added++
        }
      }

      save(Array.from(byId.values()))
      setSyncResult({ ok: true, message: `Synced ${added + updated} shows — ${added} new, ${updated} updated` })
    } catch (e) {
      setSyncResult({ ok: false, message: e instanceof Error ? `Sync failed: ${e.message}` : 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  const libraryIds = new Set(library.map(s => s.id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar placeholder="Search TV shows…" onSearch={handleSearch} />
        </div>
        {settings.jellyfinUrl && (
          <button
            onClick={syncFromJellyfin}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 disabled:bg-gray-800 text-purple-200 disabled:text-gray-500 whitespace-nowrap"
          >
            {syncing ? 'Syncing…' : '⟳ Jellyfin'}
          </button>
        )}
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
            {library.map(show => (
              <div key={show.id} className="bg-gray-900 rounded-xl overflow-hidden">
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
                    <p className="text-gray-500 text-xs">{(show.seasons ?? []).length} seasons</p>
                  </div>
                  <span className="text-gray-500 text-xs">{expandedId === show.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === show.id && (
                  <SeasonPanel
                    seasons={show.seasons ?? []}
                    onStatusChange={(n, status) => updateSeasonStatus(show.id, n, status)}
                    onDownload={season => setDownloadTarget({ show, season })}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {downloadTarget && (
        <DownloadModal
          title={`${downloadTarget.show.title} — Season ${downloadTarget.season.seasonNumber}`}
          searchQuery={`${downloadTarget.show.title} S${String(downloadTarget.season.seasonNumber).padStart(2, '0')}`}
          folderKey={settings.tvFolderKey}
          onSuccess={jobId => handleDownloadSuccess(downloadTarget.show.id, downloadTarget.season.seasonNumber, jobId)}
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </div>
  )
}
