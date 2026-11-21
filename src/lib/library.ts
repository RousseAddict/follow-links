import type { DownloaderJob, MediaStatus, MovieItem, SeasonItem, ShowItem } from '../types'

export type Filter = 'all' | MediaStatus
export type Sort = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'

export const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'date-desc', label: 'Recently added' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
]

export const STATUS_LABEL: Record<MediaStatus, string> = {
  wanted: 'Wanted',
  downloading: 'Downloading',
  downloaded: 'Downloaded',
}

export function patchImdbId<T extends { id: number; imdbId?: string }>(
  itemId: number,
  fetch: Promise<string | null>,
  current: T[],
  save: (next: T[]) => void,
): void {
  fetch
    .then(imdbId => {
      if (!imdbId) return
      save(current.map(item => item.id === itemId ? { ...item, imdbId } : item))
    })
    .catch(e => console.warn(`[follow-links] Failed to fetch IMDB ID for item ${itemId}:`, e))
}

export function sortItems<T extends { addedAt: string; title: string }>(items: T[], sort: Sort): T[] {
  return items.slice().sort((a, b) => {
    if (sort === 'date-desc') return a.addedAt < b.addedAt ? 1 : -1
    if (sort === 'date-asc') return a.addedAt > b.addedAt ? 1 : -1
    if (sort === 'title-asc') return a.title.localeCompare(b.title)
    return b.title.localeCompare(a.title)
  })
}

/** One status for a whole show: downloading wins, then wanted, then downloaded. */
export function showStatus(show: ShowItem): MediaStatus | null {
  const tracked = (show.seasons ?? []).filter(s => s.status !== 'unmonitored')
  if (tracked.length === 0) return null
  if (tracked.some(s => s.status === 'downloading')) return 'downloading'
  if (tracked.some(s => s.status === 'wanted')) return 'wanted'
  return 'downloaded'
}

export function showMatches(show: ShowItem, filter: Filter): boolean {
  if (filter === 'all') return true
  return (show.seasons ?? []).some(s => s.status === filter) &&
    (filter !== 'downloaded' || showStatus(show) === 'downloaded')
}

export function isShowFullyDownloaded(show: ShowItem): boolean {
  return show.seasons.length > 0 && show.seasons.every(s => s.status === 'downloaded')
}

export function firstWantedSeason(show: ShowItem): SeasonItem | undefined {
  return (show.seasons ?? []).find(s => s.status === 'wanted')
}

/** The hero features the newest title still waiting on you, or the newest title at all. */
export function pickFeaturedMovie(movies: MovieItem[]): MovieItem | null {
  const newest = sortItems(movies, 'date-desc')
  return newest.find(m => m.status === 'wanted') ?? newest[0] ?? null
}

export function pickFeaturedShow(shows: ShowItem[]): ShowItem | null {
  const newest = sortItems(shows, 'date-desc')
  return newest.find(s => firstWantedSeason(s)) ?? newest[0] ?? null
}

/** Percent done for a job, if the downloader reports one. */
export function jobProgress(job: DownloaderJob | undefined): number | undefined {
  if (!job) return undefined
  if (job.ytdlpPercent !== undefined) return clampPct(job.ytdlpPercent)
  if (job.progress !== undefined) return clampPct(job.progress)
  if (job.totalBytes && job.downloadedBytes !== undefined) return clampPct((job.downloadedBytes / job.totalBytes) * 100)
  return undefined
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`
  return `${bytes} B`
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function relativeDay(iso: string, now: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.round((then - now) / 86_400_000)
  if (days > -1) return 'today'
  if (days > -30) return rtf.format(days, 'day')
  if (days > -365) return rtf.format(Math.round(days / 30), 'month')
  return rtf.format(Math.round(days / 365), 'year')
}
