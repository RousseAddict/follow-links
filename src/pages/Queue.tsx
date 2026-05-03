import { useState, useEffect, useCallback } from 'react'
import { fetchJobs } from '../lib/downloader'
import { useSettings } from '../contexts/settings'
import { useLibrary } from '../contexts/library'
import type { DownloaderJob } from '../types'

const STATUS_CLASSES: Record<DownloaderJob['status'], string> = {
  queued: 'text-gray-400',
  downloading: 'text-blue-400',
  done: 'text-green-400',
  error: 'text-red-400',
  cancelled: 'text-gray-500',
}

export function Queue() {
  const { settings } = useSettings()
  const { movies, shows, saveMovies, saveShows } = useLibrary()
  const [jobs, setJobs] = useState<DownloaderJob[]>([])
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const syncCompletedJobs = useCallback((jobs: DownloaderJob[]) => {
    const doneIds = new Set(jobs.filter(j => j.status === 'done').map(j => j.id))
    if (doneIds.size === 0) return

    const nextMovies = movies.map(m =>
      m.downloadJobId && doneIds.has(m.downloadJobId) ? { ...m, status: 'downloaded' as const } : m,
    )
    if (nextMovies.some((m, i) => m !== movies[i])) saveMovies(nextMovies)

    const nextShows = shows.map(s => ({
      ...s,
      seasons: (s.seasons ?? []).map(season =>
        season.downloadJobId && doneIds.has(season.downloadJobId)
          ? { ...season, status: 'downloaded' as const }
          : season,
      ),
    }))
    if (nextShows.some((s, i) => s !== shows[i])) saveShows(nextShows)
  }, [movies, shows, saveMovies, saveShows])

  const load = useCallback(async () => {
    if (!settings.downloaderUrl) { setError('Downloader URL not configured — check Settings'); return }
    try {
      const data = await fetchJobs(settings.downloaderUrl, settings.downloaderToken)
      setJobs(data)
      setLastUpdated(new Date())
      setError('')
      syncCompletedJobs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach downloader')
    }
  }, [settings.downloaderUrl, settings.downloaderToken, syncCompletedJobs])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const active = jobs.filter(j => j.status === 'queued' || j.status === 'downloading')
  const recent = jobs.filter(j => j.status !== 'queued' && j.status !== 'downloading')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-300 font-medium">Download queue</h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-gray-600 text-xs">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={load}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg px-3 py-1.5"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!error && jobs.length === 0 && (
        <p className="text-gray-600 text-sm">No jobs found.</p>
      )}

      {active.length > 0 && (
        <section>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Active</p>
          <div className="flex flex-col gap-2">
            {active.map(job => <JobRow key={job.id} job={job} />)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Recent</p>
          <div className="flex flex-col gap-2">
            {recent.slice(0, 20).map(job => <JobRow key={job.id} job={job} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 text-xs w-8 text-right">{pct}%</span>
    </div>
  )
}

function JobRow({ job }: { job: DownloaderJob }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3 flex items-center gap-3">
      <span className={`text-xs font-semibold w-20 shrink-0 ${STATUS_CLASSES[job.status] ?? 'text-gray-400'}`}>
        {job.status}
      </span>
      <span className="text-gray-300 text-sm truncate flex-1">
        {job.filename ?? job.id}
      </span>
      {job.status === 'downloading' && job.progress !== undefined && (
        <ProgressBar pct={Math.min(100, Math.max(0, Math.round(job.progress)))} />
      )}
    </div>
  )
}
