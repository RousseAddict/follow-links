import { useState, useEffect } from 'react'
import type { MediaKind } from '../lib/downloader'
import { useDownloader } from '../hooks/useDownloader'
import { findMovieTorrents, findSeasonTorrents, type TorrentResult } from '../lib/torrent'
import { useSettings } from '../contexts/settings'
import { Sheet, SheetHeader } from './Sheet'
import { Icon, Spinner } from './Icon'
import { Button } from './ui'

interface Props {
  title: string
  searchQuery: string
  kind: MediaKind
  imdbId?: string
  season?: number
  onSuccess: (jobId: string) => void
  onClose: () => void
}

const PAGE_SIZE = 10

const RESOLUTION = /\b(2160p|1440p|1080p|720p|576p|480p|4k|uhd)\b/i

/** Some sources report their own name as the quality; read the resolution from the release name instead. */
function qualityLabel(r: TorrentResult): string {
  const looksLikeSource = !r.quality || r.quality.toLowerCase() === r.source || /torrentio|jackett/i.test(r.quality)
  if (!looksLikeSource) return r.quality
  const match = RESOLUTION.exec(r.title) ?? RESOLUTION.exec(r.quality)
  return match ? match[1].replace(/^(4k|uhd)$/i, '2160p') : 'Unknown quality'
}

const fieldClass =
  'w-full rounded-btn border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-line-strong focus:shadow-[0_0_0_3px_rgb(255_69_58/0.25)]'

export function DownloadModal({ title, searchQuery, kind, imdbId, season, onSuccess, onClose }: Props) {
  const { settings } = useSettings()
  const downloader = useDownloader()
  const [folder, setFolder] = useState(() => downloader?.defaultFolder(kind) ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [autoResults, setAutoResults] = useState<TorrentResult[] | null>(null)
  const [autoSearching, setAutoSearching] = useState(false)
  const [showManual, setShowManual] = useState(!imdbId)
  const [magnet, setMagnet] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [pendingIdx, setPendingIdx] = useState<number | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!imdbId) return
    setAutoSearching(true) // eslint-disable-line react-hooks/set-state-in-effect
    const { jackettUrl, jackettApiKey } = settings
    ;(season !== undefined
      ? findSeasonTorrents(imdbId, season, jackettUrl, jackettApiKey, searchQuery)
      : findMovieTorrents(imdbId, jackettUrl, jackettApiKey, searchQuery)
    )
      .then(results => {
        if (!cancelled) {
          const lang = settings.language?.toUpperCase()
          const sorted = lang
            ? [...results].sort((a, b) => {
                const aMatch = a.language?.toUpperCase() === lang ? 1 : 0
                const bMatch = b.language?.toUpperCase() === lang ? 1 : 0
                return bMatch - aMatch || b.seeds - a.seeds
              })
            : results
          setAutoResults(sorted)
          setPage(0)
          if (results.length === 0) setShowManual(true)
        }
      })
      .catch(() => { if (!cancelled) setShowManual(true) })
      .finally(() => { if (!cancelled) setAutoSearching(false) })
    return () => { cancelled = true }
  }, [imdbId, season]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasResults = (autoResults?.length ?? 0) > 0

  const sendMagnetLink = async (magnetLink: string) => {
    if (!downloader) {
      setError('No downloader is set up. Add its URL in Settings.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await downloader.addMagnet(magnetLink, folder)
      onSuccess(result.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSend = async () => {
    const trimmed = magnet.trim()
    if (!trimmed.startsWith('magnet:') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('Paste a magnet link or a URL to a .torrent file')
      return
    }
    await sendMagnetLink(trimmed)
  }

  const sources = settings.jackettUrl && settings.jackettApiKey ? 'YTS, Torrentio and Jackett' : 'YTS and Torrentio'
  const breakdown = autoResults
    ? Object.entries(autoResults.reduce<Record<string, number>>((acc, r) => {
        acc[r.source] = (acc[r.source] ?? 0) + 1
        return acc
      }, {})).map(([src, n]) => `${src} ${n}`).join(' · ')
    : ''
  const totalPages = autoResults ? Math.ceil(autoResults.length / PAGE_SIZE) : 0
  const pageResults = autoResults?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? []

  const goToPage = (p: number) => {
    setPage(p)
    setExpandedIdx(null)
    setPendingIdx(null)
  }

  return (
    <Sheet label={`Find a release for ${title}`} onClose={onClose} header={<SheetHeader title={title} subtitle="Pick a release to send to local-link-downloader" />}>
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dl-folder" className="text-xs font-semibold text-muted">Destination folder key</label>
          <input id="dl-folder" value={folder} onChange={e => setFolder(e.target.value)} className={fieldClass} autoComplete="off" spellCheck={false} />
        </div>

        {autoSearching && (
          <div className="flex flex-col gap-2" aria-busy="true">
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner size={15} /> Searching {sources}…
            </p>
            {Array.from({ length: 4 }, (_, i) => <span key={i} className="skeleton block h-[60px] rounded-card" />)}
          </div>
        )}

        {hasResults && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold">{autoResults!.length} releases</h3>
              <span className="truncate text-xs text-faint">{breakdown}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {pageResults.map((r, i) => {
                const globalIdx = page * PAGE_SIZE + i
                const isExpanded = expandedIdx === globalIdx
                const isPending = pendingIdx === globalIdx
                const hasLongTitle = r.title !== r.quality && r.title.length > 0
                const sourceLabel = r.source === 'jackett' ? (r.tracker ?? 'jackett') : r.source
                return (
                  <li key={globalIdx} className={`overflow-hidden rounded-card border transition-colors ${isPending ? 'border-accent/60 bg-surface-2' : 'border-line bg-surface-2/60'}`}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setPendingIdx(isPending ? null : globalIdx)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-50"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{qualityLabel(r)}</span>
                            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">{sourceLabel}</span>
                          </span>
                          {hasLongTitle && <span className="truncate text-xs text-faint">{r.title}</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5 text-xs">
                          {r.size && <span className="text-muted">{r.size}</span>}
                          {r.seeds > 0 && (
                            <span className="flex items-center gap-0.5 font-semibold text-ok">
                              <Icon name="arrowUp" size={12} strokeWidth={2.6} />{r.seeds}
                            </span>
                          )}
                          {r.language && (
                            <span className="rounded-full bg-info/15 px-2 py-0.5 font-semibold text-info">{r.language}</span>
                          )}
                        </div>
                      </button>
                      {hasLongTitle && (
                        <button
                          type="button"
                          onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                          className="grid w-10 shrink-0 place-items-center border-l border-line text-faint transition-colors hover:text-ink"
                          aria-label={isExpanded ? 'Hide full name' : 'Show full name'}
                          aria-expanded={isExpanded}
                        >
                          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <p className="border-t border-line px-3.5 py-2.5 text-xs leading-relaxed break-words text-muted">{r.title}</p>
                    )}
                    {isPending && (
                      <div className="flex items-center justify-between gap-3 border-t border-accent/30 bg-accent/10 px-3.5 py-2.5">
                        <span className="truncate text-[13px] font-medium text-ink">Send this release?</span>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setPendingIdx(null)}>Cancel</Button>
                          <Button size="sm" variant="primary" loading={loading} onClick={() => sendMagnetLink(r.magnet)}>
                            {loading ? 'Sending…' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <Button size="sm" variant="secondary" icon="chevron-left" disabled={page === 0} onClick={() => goToPage(page - 1)}>Previous</Button>
                <span className="text-xs text-faint">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="secondary" disabled={page >= totalPages - 1} onClick={() => goToPage(page + 1)}>
                  Next <Icon name="chevron-right" size={15} />
                </Button>
              </div>
            )}
          </div>
        )}

        {!autoSearching && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowManual(v => !v)}
              aria-expanded={showManual}
              className="flex items-center justify-between rounded-btn py-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <Icon name="magnet" size={15} />
                {showManual ? 'Hide manual input' : hasResults ? 'Paste a magnet link instead' : 'Paste a magnet link'}
              </span>
              <Icon name={showManual ? 'chevron-up' : 'chevron-down'} size={14} />
            </button>

            {showManual && (
              <div className="flex flex-col gap-3">
                {!hasResults && imdbId && <p className="text-[13px] text-muted">No releases found automatically.</p>}
                {!imdbId && <p className="text-[13px] text-muted">Automatic search needs the IMDb ID, which isn’t known for this title yet.</p>}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dl-magnet" className="text-xs font-semibold text-muted">Magnet link or .torrent URL</label>
                  <textarea
                    id="dl-magnet"
                    value={magnet}
                    onChange={e => setMagnet(e.target.value)}
                    placeholder="magnet:?xt=urn:btih:… or https://…/file.torrent"
                    rows={3}
                    spellCheck={false}
                    className={`${fieldClass} resize-none font-mono text-xs`}
                  />
                </div>
                <Button variant="primary" loading={loading} disabled={!magnet} onClick={handleManualSend} className="w-full">
                  {loading ? 'Sending…' : 'Send to downloader'}
                </Button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-btn bg-fail/10 px-3 py-2.5 text-[13px] text-fail">
            <Icon name="alert" size={15} className="mt-px" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        )}
      </div>
    </Sheet>
  )
}
