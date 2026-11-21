import { useCallback, useMemo, useState } from 'react'
import { DownloadModal } from '../components/DownloadModal'
import { Hero } from '../components/Hero'
import { LibraryToolbar, PosterGrid, RailItem, SearchResults } from '../components/LibraryParts'
import { PosterCard } from '../components/PosterCard'
import { PageHeader } from '../components/Shell'
import { TitleSheet } from '../components/TitleSheet'
import { Button, EmptyState, ProgressBar } from '../components/ui'
import { useJobs } from '../contexts/jobs'
import { useLibrary } from '../contexts/library'
import { useSearch } from '../contexts/search'
import { useSettings } from '../contexts/settings'
import { useToast } from '../contexts/toast'
import { useTmdbSearch } from '../hooks/useTmdbSearch'
import { STATUS_LABEL, formatBytes, jobProgress, patchImdbId, pickFeaturedMovie, relativeDay, sortItems, type Filter, type Sort } from '../lib/library'
import { getStore, setStore, KEYS } from '../lib/store'
import { getMovieImdbId, searchMovies } from '../lib/tmdb'
import type { MediaStatus, MovieItem, TmdbMovie } from '../types'

/** The open title sheet. `result` is kept for titles opened from search that are not in the library yet. */
type Open = { id: number; autoPlay?: boolean; result?: TmdbMovie }

export function Movies() {
  const { settings } = useSettings()
  const { movies: library, saveMovies: save } = useLibrary()
  const { byId } = useJobs()
  const { query, clear } = useSearch()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>(() => getStore<Sort>(KEYS.moviesSort, 'date-desc'))
  const [open, setOpen] = useState<Open | null>(null)
  const [downloading, setDownloading] = useState<MovieItem | null>(null)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const [now] = useState(() => Date.now())

  const search = useCallback((q: string) => searchMovies(q, settings.tmdbApiKey, settings.language), [settings.tmdbApiKey, settings.language])
  const { results, searching, error: searchError } = useTmdbSearch(query, search, !!settings.tmdbApiKey)

  const addToLibrary = (movie: TmdbMovie) => {
    if (library.some(m => m.id === movie.id)) return
    const item: MovieItem = {
      id: movie.id,
      title: movie.title,
      year: movie.release_date?.slice(0, 4) ?? '',
      overview: movie.overview,
      posterPath: movie.poster_path ?? '',
      status: 'wanted',
      monitored: true,
      addedAt: new Date().toISOString(),
    }
    const next = [item, ...library]
    save(next)
    clear()
    setRecentlyAddedId(movie.id)
    setTimeout(() => setRecentlyAddedId(null), 2400)
    toast(`Added ${movie.title} to Movies`, 'ok')
    if (settings.tmdbApiKey) {
      patchImdbId(movie.id, getMovieImdbId(movie.id, settings.tmdbApiKey), next, save)
    }
  }

  const updateStatus = (id: number, status: MediaStatus) =>
    save(library.map(m => m.id === id ? { ...m, status } : m))

  const removeFromLibrary = (movie: MovieItem) => {
    save(library.filter(m => m.id !== movie.id))
    setOpen(null)
    toast(`Removed ${movie.title}`)
  }

  const handleDownloadSuccess = (movie: MovieItem, jobId: string) => {
    save(library.map(m => m.id === movie.id ? { ...m, status: 'downloading' as const, downloadJobId: jobId } : m))
    setDownloading(null)
    toast(`Sent ${movie.title} to the downloader`, 'ok')
  }

  const libraryIds = useMemo(() => new Set(library.map(m => m.id)), [library])
  const counts = useMemo(() => ({
    all: library.length,
    wanted: library.filter(m => m.status === 'wanted').length,
    downloading: library.filter(m => m.status === 'downloading').length,
    downloaded: library.filter(m => m.status === 'downloaded').length,
  }), [library])
  const visible = useMemo(
    () => sortItems(filter === 'all' ? library : library.filter(m => m.status === filter), sort),
    [library, filter, sort],
  )
  const featured = useMemo(() => pickFeaturedMovie(library), [library])

  const progressOf = (m: MovieItem) => (m.status === 'downloading' && m.downloadJobId ? jobProgress(byId.get(m.downloadJobId)) : undefined)
  const subtitleOf = (m: MovieItem) => {
    const pct = progressOf(m)
    if (pct !== undefined) return `${m.year ? `${m.year} · ` : ''}${pct}%`
    return [m.year, m.status === 'downloaded' ? 'In library' : STATUS_LABEL[m.status]].filter(Boolean).join(' · ')
  }

  const openMovie = open ? library.find(m => m.id === open.id) ?? null : null
  const openInfo = openMovie
    ? { title: openMovie.title, year: openMovie.year, overview: openMovie.overview, posterPath: openMovie.posterPath }
    : open?.result
      ? { title: open.result.title, year: open.result.release_date?.slice(0, 4), overview: open.result.overview, posterPath: open.result.poster_path ?? '' }
      : null

  return (
    <div className="flex flex-col gap-7 md:gap-9">
      <PageHeader title="Movies" search />

      {query ? (
        <SearchResults query={query} searching={searching} error={searchError} count={results.length}>
          {results.map(movie => {
            const inLibrary = libraryIds.has(movie.id)
            return (
              <RailItem key={movie.id}>
                <PosterCard
                  compact
                  title={movie.title}
                  subtitle={movie.release_date?.slice(0, 4) || undefined}
                  posterPath={movie.poster_path ?? ''}
                  status={inLibrary ? library.find(m => m.id === movie.id)?.status : null}
                  onOpen={() => setOpen({ id: movie.id, result: movie })}
                  action={inLibrary
                    ? { icon: 'check', label: 'Already in your movies', disabled: true }
                    : { icon: 'plus', label: `Add ${movie.title} to Movies`, primary: true, onClick: () => addToLibrary(movie) }}
                />
              </RailItem>
            )
          })}
        </SearchResults>
      ) : featured && (
        <Hero
          key={`hero-${featured.id}`}
          kind="movie"
          id={featured.id}
          title={featured.title}
          year={featured.year}
          overview={featured.overview}
          posterPath={featured.posterPath}
          status={featured.status}
          badge={`${STATUS_LABEL[featured.status]} · added ${relativeDay(featured.addedAt, now)}`}
          primary={featured.status !== 'downloaded' ? { label: 'Find a release', icon: 'download', onClick: () => setDownloading(featured) } : undefined}
          onTrailer={() => setOpen({ id: featured.id, autoPlay: true })}
          onDetails={() => setOpen({ id: featured.id })}
          paused={!!open || !!downloading}
        />
      )}

      <section className="flex flex-col gap-4 md:gap-5">
        <LibraryToolbar
          title="My movies"
          total={library.length}
          noun={['title', 'titles']}
          filter={filter}
          onFilter={setFilter}
          counts={counts}
          sort={sort}
          onSort={s => { setSort(s); setStore(KEYS.moviesSort, s) }}
        />
        {library.length === 0 ? (
          <EmptyState icon="film" title="No movies yet">
            Search above to find a movie, then add it to start tracking it.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon="film" title={`Nothing ${STATUS_LABEL[filter as MediaStatus].toLowerCase()}`}>
            <button type="button" className="font-semibold text-ink hover:text-accent" onClick={() => setFilter('all')}>Show all movies</button>
          </EmptyState>
        ) : (
          <PosterGrid>
            {visible.map(movie => (
              <PosterCard
                key={movie.id}
                title={movie.title}
                subtitle={subtitleOf(movie)}
                posterPath={movie.posterPath}
                status={movie.status}
                progress={progressOf(movie)}
                highlighted={movie.id === recentlyAddedId}
                onOpen={() => setOpen({ id: movie.id })}
                action={movie.status !== 'downloaded'
                  ? { icon: 'download', label: `Find a release for ${movie.title}`, hoverOnly: true, onClick: () => setDownloading(movie) }
                  : undefined}
              />
            ))}
          </PosterGrid>
        )}
      </section>

      {open && openInfo && (
        <TitleSheet
          key={`sheet-${open.id}`}
          kind="movie"
          id={open.id}
          {...openInfo}
          autoPlay={open.autoPlay}
          onClose={() => setOpen(null)}
        >
          {openMovie ? (
            <MovieControls
              movie={openMovie}
              progress={progressOf(openMovie)}
              jobBytes={openMovie.downloadJobId ? byId.get(openMovie.downloadJobId) : undefined}
              onStatus={status => updateStatus(openMovie.id, status)}
              onDownload={() => setDownloading(openMovie)}
              onRemove={() => removeFromLibrary(openMovie)}
            />
          ) : open.result && (
            <Button variant="primary" icon="plus" onClick={() => addToLibrary(open.result!)} className="w-full sm:w-auto sm:self-start">
              Add to Movies
            </Button>
          )}
        </TitleSheet>
      )}

      {downloading && (
        <DownloadModal
          title={`${downloading.title}${downloading.year ? ` (${downloading.year})` : ''}`}
          searchQuery={`${downloading.title} ${downloading.year}`}
          folderKey={settings.movieFolderKey}
          imdbId={downloading.imdbId}
          onSuccess={jobId => handleDownloadSuccess(downloading, jobId)}
          onClose={() => setDownloading(null)}
        />
      )}
    </div>
  )
}

const STATUSES: MediaStatus[] = ['wanted', 'downloading', 'downloaded']

interface ControlsProps {
  movie: MovieItem
  progress?: number
  jobBytes?: { downloadedBytes?: number; totalBytes?: number; downloadSpeed?: number }
  onStatus: (s: MediaStatus) => void
  onDownload: () => void
  onRemove: () => void
}

function MovieControls({ movie, progress, jobBytes, onStatus, onDownload, onRemove }: ControlsProps) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const locked = movie.status === 'downloaded'

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface-2/60 p-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-faint">Status</span>
        <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface-1 p-1">
          {STATUSES.map(s => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={movie.status === s}
              onClick={() => onStatus(s)}
              className={`h-9 rounded-full text-[13px] font-semibold transition-colors duration-150 ${movie.status === s ? 'bg-surface-3 text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {movie.status === 'downloading' && progress !== undefined && (
        <div className="flex flex-col gap-1.5">
          <ProgressBar pct={progress} className="h-1.5" />
          <p className="flex justify-between text-xs text-muted">
            <span>{progress}%{jobBytes?.totalBytes ? ` · ${formatBytes(jobBytes.downloadedBytes ?? 0)} of ${formatBytes(jobBytes.totalBytes)}` : ''}</span>
            {!!jobBytes?.downloadSpeed && <span className="text-downloading-text">{formatBytes(jobBytes.downloadSpeed)}/s</span>}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!locked && (
          <Button variant="primary" icon="download" onClick={onDownload} className="max-sm:flex-1">
            Find a release
          </Button>
        )}
        <Button
          variant={confirmRemove ? 'danger' : 'ghost'}
          icon="trash"
          disabled={locked}
          title={locked ? 'Downloaded media can’t be removed' : undefined}
          onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
          onBlur={() => setConfirmRemove(false)}
          className="max-sm:flex-1"
        >
          {confirmRemove ? 'Tap again to remove' : 'Remove'}
        </Button>
      </div>
      {locked && <p className="-mt-1 text-xs text-faint">Downloaded titles stay in your library.</p>}
    </div>
  )
}
