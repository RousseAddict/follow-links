import { useCallback, useMemo, useState } from 'react'
import { DownloadModal } from '../components/DownloadModal'
import { Hero } from '../components/Hero'
import { Icon } from '../components/Icon'
import { LibraryToolbar, PosterGrid, RailItem, SearchResults } from '../components/LibraryParts'
import { PosterCard } from '../components/PosterCard'
import { PageHeader } from '../components/Shell'
import { TitleSheet } from '../components/TitleSheet'
import { Button, EmptyState, IconButton, ProgressBar } from '../components/ui'
import { STATUS_PILL } from '../constants'
import { useJobs } from '../contexts/jobs'
import { useLibrary } from '../contexts/library'
import { useSearch } from '../contexts/search'
import { useSettings } from '../contexts/settings'
import { useToast } from '../contexts/toast'
import { useTmdbSearch } from '../hooks/useTmdbSearch'
import {
  STATUS_LABEL, firstWantedSeason, isShowFullyDownloaded, jobProgress, patchImdbId, pickFeaturedShow,
  relativeDay, showMatches, showStatus, sortItems, type Filter, type Sort,
} from '../lib/library'
import { getStore, setStore, KEYS } from '../lib/store'
import { getSeasons, getShowImdbId, searchShows } from '../lib/tmdb'
import type { DownloaderJob, MediaStatus, SeasonItem, ShowItem, TmdbShow } from '../types'

function updateSeason(library: ShowItem[], showId: number, seasonNumber: number, patch: Partial<SeasonItem>): ShowItem[] {
  return library.map(show => show.id !== showId ? show : {
    ...show,
    seasons: (show.seasons ?? []).map(s => s.seasonNumber === seasonNumber ? { ...s, ...patch } : s),
  })
}

/** The open title sheet. `result` is kept for shows opened from search that are not in the library yet. */
type Open = { id: number; autoPlay?: boolean; result?: TmdbShow }

export function Shows() {
  const { settings } = useSettings()
  const { shows: library, saveShows: save } = useLibrary()
  const { byId } = useJobs()
  const { query, clear } = useSearch()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>(() => getStore<Sort>(KEYS.showsSort, 'date-desc'))
  const [open, setOpen] = useState<Open | null>(null)
  const [downloadTarget, setDownloadTarget] = useState<{ show: ShowItem; season: SeasonItem } | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const [now] = useState(() => Date.now())

  const search = useCallback((q: string) => searchShows(q, settings.tmdbApiKey, settings.language), [settings.tmdbApiKey, settings.language])
  const { results, searching, error: searchError } = useTmdbSearch(query, search, !!settings.tmdbApiKey)

  const addToLibrary = async (show: TmdbShow) => {
    if (library.some(s => s.id === show.id) || addingId !== null) return
    if (!settings.tmdbApiKey) return
    setAddingId(show.id)
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
      const next = [{ ...base, seasons }, ...library]
      save(next)
      patchImdbId(show.id, getShowImdbId(show.id, settings.tmdbApiKey), next, save)
      clear()
      setRecentlyAddedId(show.id)
      setTimeout(() => setRecentlyAddedId(null), 2400)
      toast(`Added ${show.name} to TV Shows`, 'ok')
    } finally {
      setAddingId(null)
    }
  }

  const removeFromLibrary = (show: ShowItem) => {
    save(library.filter(s => s.id !== show.id))
    setOpen(null)
    toast(`Removed ${show.title}`)
  }

  const handleStatusChange = (showId: number, seasonNumber: number, status: SeasonItem['status']) =>
    save(updateSeason(library, showId, seasonNumber, { status }))

  const handleDownloadSuccess = (show: ShowItem, seasonNumber: number, jobId: string) => {
    save(updateSeason(library, show.id, seasonNumber, { status: 'downloading', downloadJobId: jobId }))
    setDownloadTarget(null)
    toast(`Sent ${show.title} season ${seasonNumber} to the downloader`, 'ok')
  }

  const libraryIds = useMemo(() => new Set(library.map(s => s.id)), [library])
  const counts = useMemo(() => ({
    all: library.length,
    wanted: library.filter(s => showMatches(s, 'wanted')).length,
    downloading: library.filter(s => showMatches(s, 'downloading')).length,
    downloaded: library.filter(s => showMatches(s, 'downloaded')).length,
  }), [library])
  const visible = useMemo(() => sortItems(library.filter(s => showMatches(s, filter)), sort), [library, filter, sort])
  const featured = useMemo(() => pickFeaturedShow(library), [library])

  const progressOf = (show: ShowItem) => {
    const active = (show.seasons ?? []).filter(s => s.status === 'downloading' && s.downloadJobId)
    const values = active.map(s => jobProgress(byId.get(s.downloadJobId!))).filter((p): p is number => p !== undefined)
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined
  }
  const subtitleOf = (show: ShowItem) => {
    const n = show.seasons.length
    const have = show.seasons.filter(s => s.status === 'downloaded').length
    const pct = progressOf(show)
    if (pct !== undefined) return `${n} season${n === 1 ? '' : 's'} · ${pct}%`
    if (!n) return 'No seasons yet'
    if (have === n) return `All ${n} season${n === 1 ? '' : 's'}`
    return have ? `${have}/${n} seasons` : `${n} season${n === 1 ? '' : 's'}`
  }

  const openShow = open ? library.find(s => s.id === open.id) ?? null : null
  const openInfo = openShow
    ? { title: openShow.title, overview: openShow.overview, posterPath: openShow.posterPath }
    : open?.result
      ? { title: open.result.name, year: open.result.first_air_date?.slice(0, 4), overview: open.result.overview, posterPath: open.result.poster_path ?? '' }
      : null

  const featuredStatus = featured ? showStatus(featured) : null
  const featuredSeason = featured ? firstWantedSeason(featured) : undefined

  return (
    <div className="flex flex-col gap-7 md:gap-9">
      <PageHeader title="TV Shows" search />

      {query ? (
        <SearchResults query={query} searching={searching} error={searchError} count={results.length}>
          {results.map(show => {
            const inLibrary = libraryIds.has(show.id)
            const owned = inLibrary ? library.find(s => s.id === show.id) : undefined
            return (
              <RailItem key={show.id}>
                <PosterCard
                  compact
                  title={show.name}
                  subtitle={show.first_air_date?.slice(0, 4) || undefined}
                  posterPath={show.poster_path ?? ''}
                  status={owned ? showStatus(owned) : null}
                  onOpen={() => setOpen({ id: show.id, result: show })}
                  action={inLibrary
                    ? { icon: 'check', label: 'Already in your shows', disabled: true }
                    : addingId === show.id
                      ? { icon: 'spinner', label: 'Adding…', primary: true, disabled: true }
                      : { icon: 'plus', label: `Add ${show.name} to TV Shows`, primary: true, disabled: addingId !== null, onClick: () => addToLibrary(show) }}
                />
              </RailItem>
            )
          })}
        </SearchResults>
      ) : featured && (
        <Hero
          key={`hero-${featured.id}`}
          kind="tv"
          id={featured.id}
          title={featured.title}
          overview={featured.overview}
          posterPath={featured.posterPath}
          status={featuredStatus}
          badge={`${featuredStatus ? STATUS_LABEL[featuredStatus] : 'In your shows'} · added ${relativeDay(featured.addedAt, now)}`}
          primary={featuredSeason ? {
            label: `Download season ${featuredSeason.seasonNumber}`,
            icon: 'download',
            onClick: () => setDownloadTarget({ show: featured, season: featuredSeason }),
          } : undefined}
          onTrailer={() => setOpen({ id: featured.id, autoPlay: true })}
          onDetails={() => setOpen({ id: featured.id })}
          paused={!!open || !!downloadTarget}
        />
      )}

      <section className="flex flex-col gap-4 md:gap-5">
        <LibraryToolbar
          title="My shows"
          total={library.length}
          noun={['show', 'shows']}
          filter={filter}
          onFilter={setFilter}
          counts={counts}
          sort={sort}
          onSort={s => { setSort(s); setStore(KEYS.showsSort, s) }}
        />
        {library.length === 0 ? (
          <EmptyState icon="tv" title="No shows yet">
            Search above to find a show, then add it to track its seasons.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon="tv" title={`Nothing ${STATUS_LABEL[filter as MediaStatus].toLowerCase()}`}>
            <button type="button" className="font-semibold text-ink hover:text-accent" onClick={() => setFilter('all')}>Show all shows</button>
          </EmptyState>
        ) : (
          <PosterGrid>
            {visible.map(show => {
              const wanted = firstWantedSeason(show)
              return (
                <PosterCard
                  key={show.id}
                  title={show.title}
                  subtitle={subtitleOf(show)}
                  posterPath={show.posterPath}
                  status={showStatus(show)}
                  progress={progressOf(show)}
                  highlighted={show.id === recentlyAddedId}
                  onOpen={() => setOpen({ id: show.id })}
                  action={wanted
                    ? { icon: 'download', label: `Download ${show.title} season ${wanted.seasonNumber}`, hoverOnly: true, onClick: () => setDownloadTarget({ show, season: wanted }) }
                    : undefined}
                />
              )
            })}
          </PosterGrid>
        )}
      </section>

      {open && openInfo && (
        <TitleSheet
          key={`sheet-${open.id}`}
          kind="tv"
          id={open.id}
          {...openInfo}
          autoPlay={open.autoPlay}
          onClose={() => setOpen(null)}
        >
          {openShow ? (
            <ShowControls
              show={openShow}
              jobs={byId}
              onStatus={(n, status) => handleStatusChange(openShow.id, n, status)}
              onDownload={season => setDownloadTarget({ show: openShow, season })}
              onRemove={() => removeFromLibrary(openShow)}
            />
          ) : open.result && (
            <Button
              variant="primary"
              icon="plus"
              loading={addingId === open.result.id}
              disabled={addingId !== null}
              onClick={() => addToLibrary(open.result!)}
              className="w-full sm:w-auto sm:self-start"
            >
              Add to TV Shows
            </Button>
          )}
        </TitleSheet>
      )}

      {downloadTarget && (
        <DownloadModal
          title={`${downloadTarget.show.title} · Season ${downloadTarget.season.seasonNumber}`}
          searchQuery={`${downloadTarget.show.title} S${String(downloadTarget.season.seasonNumber).padStart(2, '0')}`}
          kind="tv"
          imdbId={downloadTarget.show.imdbId}
          season={downloadTarget.season.seasonNumber}
          onSuccess={jobId => handleDownloadSuccess(downloadTarget.show, downloadTarget.season.seasonNumber, jobId)}
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </div>
  )
}

const SEASON_STATUSES: { value: SeasonItem['status']; label: string }[] = [
  { value: 'wanted', label: 'Wanted' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'downloaded', label: 'Downloaded' },
  { value: 'unmonitored', label: 'Not tracked' },
]

interface ShowControlsProps {
  show: ShowItem
  jobs: Map<string, DownloaderJob>
  onStatus: (seasonNumber: number, status: SeasonItem['status']) => void
  onDownload: (season: SeasonItem) => void
  onRemove: () => void
}

function ShowControls({ show, jobs, onStatus, onDownload, onRemove }: ShowControlsProps) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const locked = isShowFullyDownloaded(show)
  const seasons = show.seasons ?? []
  const have = seasons.filter(s => s.status === 'downloaded').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold">Seasons</h3>
        {seasons.length > 0 && <span className="text-xs font-medium text-faint">{have} of {seasons.length} in library</span>}
      </div>

      {seasons.length === 0 ? (
        <p className="rounded-card bg-surface-2 px-4 py-3 text-sm text-muted">TMDB didn’t list any seasons for this show yet.</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card border border-line bg-surface-2/60">
          {seasons.map(season => {
            const pct = season.status === 'downloading' && season.downloadJobId ? jobProgress(jobs.get(season.downloadJobId)) : undefined
            const canDownload = season.status !== 'unmonitored' && season.status !== 'downloaded'
            return (
              <li key={season.seasonNumber} className="flex min-h-14 items-center gap-3 border-line px-3.5 py-2.5 [&+&]:border-t">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold">Season {season.seasonNumber}</span>
                  {pct !== undefined
                    ? <span className="flex items-center gap-2"><ProgressBar pct={pct} className="w-full max-w-40" /><span className="text-xs text-downloading-text">{pct}%</span></span>
                    : <span className="text-xs text-faint">{season.episodeCount ? `${season.episodeCount} episodes` : 'Episodes unknown'}</span>}
                </div>
                <label className={`relative inline-flex h-8 shrink-0 items-center gap-1 rounded-full pl-3 pr-2 text-xs font-semibold ${STATUS_PILL[season.status] ?? STATUS_PILL.unmonitored}`}>
                  {SEASON_STATUSES.find(s => s.value === season.status)?.label ?? season.status}
                  <Icon name="chevron-down" size={12} strokeWidth={2.5} />
                  <select
                    value={season.status}
                    onChange={e => onStatus(season.seasonNumber, e.target.value as SeasonItem['status'])}
                    aria-label={`Season ${season.seasonNumber} status`}
                    className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                  >
                    {SEASON_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                {canDownload ? (
                  <IconButton icon="download" label={`Download season ${season.seasonNumber}`} variant="primary" size="sm" onClick={() => onDownload(season)} />
                ) : (
                  <span className="size-9 shrink-0" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-1">
        <Button
          variant={confirmRemove ? 'danger' : 'ghost'}
          icon="trash"
          size="sm"
          disabled={locked}
          onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
          onBlur={() => setConfirmRemove(false)}
          className="self-start"
        >
          {confirmRemove ? 'Tap again to remove this show' : 'Remove show'}
        </Button>
        {locked && <p className="text-xs text-faint">Fully downloaded shows stay in your library.</p>}
      </div>
    </div>
  )
}
