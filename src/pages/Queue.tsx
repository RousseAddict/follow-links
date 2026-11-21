import { useEffect, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { PosterImage } from '../components/PosterCard'
import { Button, EmptyState, IconButton, ProgressBar, StatusPill } from '../components/ui'
import { useJobs } from '../contexts/jobs'
import { useLibrary } from '../contexts/library'
import { formatBytes, jobProgress } from '../lib/library'
import type { DownloaderJob } from '../types'

interface JobTitle {
  title: string
  posterPath: string
}

export function Queue() {
  const { jobs, loaded, error, lastUpdated, refresh, watch } = useJobs()
  const { movies, shows } = useLibrary()

  // Keep polling while this page is open.
  useEffect(() => watch(), [watch])

  // Match jobs back to library titles so each row gets a name and a poster.
  const titles = useMemo(() => {
    const map = new Map<string, JobTitle>()
    for (const m of movies) {
      if (m.downloadJobId) map.set(m.downloadJobId, { title: m.year ? `${m.title} (${m.year})` : m.title, posterPath: m.posterPath })
    }
    for (const s of shows) {
      for (const season of s.seasons ?? []) {
        if (season.downloadJobId) map.set(season.downloadJobId, { title: `${s.title} · Season ${season.seasonNumber}`, posterPath: s.posterPath })
      }
    }
    return map
  }, [movies, shows])

  const active = jobs.filter(j => j.status === 'queued' || j.status === 'downloading')
  const recent = jobs.filter(j => j.status !== 'queued' && j.status !== 'downloading')

  return (
    <div className="flex max-w-4xl flex-col gap-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.025em] md:text-[26px]">Queue</h1>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-faint">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <IconButton icon="refresh" label="Refresh" size="sm" variant="secondary" onClick={() => refresh()} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-panel border border-fail/30 bg-fail/10 p-4">
          <Icon name="alert" size={18} className="mt-0.5 text-fail" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Couldn’t reach the downloader</p>
            <p className="break-words text-[13px] text-muted">{error.replace(/\.$/, '')}. Check the downloader URL and token in Settings.</p>
            <Button size="sm" variant="secondary" icon="refresh" onClick={() => refresh()} className="self-start">Try again</Button>
          </div>
        </div>
      )}

      {!loaded && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => <span key={i} className="skeleton block h-[76px] rounded-card" />)}
        </div>
      )}

      {loaded && !error && jobs.length === 0 && (
        <EmptyState icon="queue" title="Nothing in the queue">
          Pick a release from a movie or a season and it shows up here while it downloads.
        </EmptyState>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-faint">Active · {active.length}</h2>
          <ul className="flex flex-col gap-2">
            {active.map(job => <JobRow key={job.id} job={job} match={titles.get(job.id)} />)}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-faint">Recent</h2>
          <ul className="flex flex-col gap-2">
            {recent.slice(0, 20).map(job => <JobRow key={job.id} job={job} match={titles.get(job.id)} />)}
          </ul>
        </section>
      )}
    </div>
  )
}

function StatusBadge({ job, pct }: { job: DownloaderJob; pct?: number }) {
  switch (job.status) {
    case 'downloading':
      return <StatusPill status="downloading">{pct !== undefined ? `${pct}%` : 'Downloading'}</StatusPill>
    case 'queued':
      return <StatusPill status="unmonitored">Queued</StatusPill>
    case 'done':
      return <StatusPill status="downloaded"><Icon name="check" size={11} strokeWidth={3} />Done</StatusPill>
    case 'error':
      return <span className="inline-flex items-center rounded-full bg-fail/15 px-2.5 py-1 text-[11.5px] font-semibold leading-none text-fail">Failed</span>
    default:
      return <StatusPill status="unmonitored">Cancelled</StatusPill>
  }
}

function JobRow({ job, match }: { job: DownloaderJob; match?: JobTitle }) {
  const pct = jobProgress(job)
  const isActive = job.status === 'downloading'
  const name = match?.title ?? job.filename ?? job.id
  const stats = [
    job.downloadedBytes !== undefined ? `${formatBytes(job.downloadedBytes)}${job.totalBytes ? ` of ${formatBytes(job.totalBytes)}` : ''}` : '',
    job.peers ? `${job.peers} peers` : '',
  ].filter(Boolean)

  return (
    <li className={`flex items-center gap-3 rounded-card border border-line bg-surface-1 p-2.5 pr-3.5 ${job.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <span className="relative block aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-surface-2 md:w-11">
        {match?.posterPath
          ? <PosterImage path={match.posterPath} title={name} size="w92" thumb />
          : <span className="absolute inset-0 grid place-items-center text-faint"><Icon name="download" size={16} /></span>}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold">{name}</span>
        {match && job.filename && <span className="truncate text-xs text-faint">{job.filename}</span>}
        {isActive && pct !== undefined && <ProgressBar pct={pct} className="my-0.5" />}
        {isActive && (stats.length > 0 || !!job.downloadSpeed) && (
          <span className="flex flex-wrap gap-x-2.5 text-xs text-muted">
            {stats.map(s => <span key={s}>{s}</span>)}
            {!!job.downloadSpeed && <span className="text-downloading-text">{formatBytes(job.downloadSpeed)}/s</span>}
          </span>
        )}
        {isActive && stats.length === 0 && !job.downloadSpeed && <span className="text-xs text-faint">Waiting for peers…</span>}
        {job.status === 'queued' && <span className="text-xs text-faint">Waiting to start…</span>}
        {job.status === 'error' && <span className="text-xs text-fail">The download stopped with an error. Try another release.</span>}
      </div>
      <StatusBadge job={job} pct={pct} />
    </li>
  )
}
