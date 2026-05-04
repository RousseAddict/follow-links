import { useState, useEffect } from 'react'
import { sendMagnet } from '../lib/downloader'
import { findMovieTorrents, findSeasonTorrents, type TorrentResult } from '../lib/torrent'
import { useSettings } from '../contexts/settings'

interface Props {
  title: string
  searchQuery: string
  folderKey: string
  imdbId?: string
  season?: number
  onSuccess: (jobId: string) => void
  onClose: () => void
}

export function DownloadModal({ title, searchQuery, folderKey: defaultFolder, imdbId, season, onSuccess, onClose }: Props) {
  const { settings } = useSettings()
  const [folder, setFolder] = useState(defaultFolder)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [autoResults, setAutoResults] = useState<TorrentResult[] | null>(null)
  const [autoSearching, setAutoSearching] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [magnet, setMagnet] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [pendingIdx, setPendingIdx] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  useEffect(() => {
    let cancelled = false
    if (!imdbId) { setShowManual(true); return }
    setAutoSearching(true)
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
  }, [imdbId, season])

  const hasResults = (autoResults?.length ?? 0) > 0

  const sendMagnetLink = async (magnetLink: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await sendMagnet(magnetLink, folder, settings.downloaderUrl, settings.downloaderToken)
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

  const search1337x = () => {
    window.open(`https://www.1337x.to/search/${encodeURIComponent(searchQuery)}/1/`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-gray-100 font-medium">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">Send torrent to local-link-downloader</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-gray-400 text-xs">Folder key</label>
          <input
            value={folder}
            onChange={e => setFolder(e.target.value)}
            className="bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Torrent list */}
        {(autoSearching || hasResults) && (
          <div className="flex flex-col gap-2">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
              {autoSearching ? 'Searching…' : (() => {
                const counts = autoResults!.reduce<Record<string, number>>((acc, r) => {
                  acc[r.source] = (acc[r.source] ?? 0) + 1
                  return acc
                }, {})
                const breakdown = Object.entries(counts).map(([src, n]) => `${src}: ${n}`).join(', ')
                return `${autoResults!.length} torrents found${breakdown ? ` (${breakdown})` : ''}`
              })()}
            </span>
            {autoSearching && (
              <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
                <svg className="animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Searching YTS & Torrentio{settings.jackettUrl && settings.jackettApiKey ? ' & Jackett' : ''}…
              </div>
            )}
            {autoResults && (() => {
              const pageResults = autoResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
              const totalPages = Math.ceil(autoResults.length / PAGE_SIZE)
              return (
                <>
                  {pageResults.map((r, i) => {
                    const globalIdx = page * PAGE_SIZE + i
                    const isExpanded = expandedIdx === globalIdx
                    const isPending = pendingIdx === globalIdx
                    const hasLongTitle = r.title !== r.quality && r.title.length > 0
                    return (
                      <div key={globalIdx} className={`flex flex-col rounded-lg overflow-hidden ring-1 ${isPending ? 'ring-indigo-500' : 'ring-transparent'}`}>
                        <div className="flex items-stretch bg-gray-800 hover:bg-gray-750">
                          <button
                            disabled={loading}
                            onClick={() => setPendingIdx(isPending ? null : globalIdx)}
                            className="flex-1 flex items-center justify-between px-3 py-2.5 text-left transition-colors disabled:opacity-50 min-w-0"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-gray-200 text-xs truncate">{r.quality || r.title}</span>
                              {hasLongTitle && (
                                <span className="text-gray-500 text-[10px] truncate">{r.title}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              {r.size && <span className="text-gray-500 text-xs">{r.size}</span>}
                              {r.seeds > 0 && (
                                <span className="flex items-center gap-0.5 text-green-500 text-xs">
                                  {r.seeds}
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15"/>
                                  </svg>
                                </span>
                              )}
                              {r.language && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900 text-blue-300 font-medium">
                                  {r.language}
                                </span>
                              )}
                              {r.source === 'jackett' ? (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-teal-900 text-teal-300" title="via Jackett">
                                  {r.tracker ?? 'jackett'}
                                </span>
                              ) : (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${r.source === 'yts' ? 'bg-yellow-900 text-yellow-300' : 'bg-indigo-900 text-indigo-300'}`}>
                                  {r.source}
                                </span>
                              )}
                            </div>
                          </button>
                          {hasLongTitle && (
                            <button
                              onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                              className="px-2.5 text-gray-600 hover:text-gray-300 border-l border-gray-700 transition-colors shrink-0"
                              title="Show full name"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {isExpanded
                                  ? <polyline points="18 15 12 9 6 15"/>
                                  : <polyline points="6 9 12 15 18 9"/>}
                              </svg>
                            </button>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="px-3 py-2 bg-gray-800/60 border-t border-gray-700">
                            <p className="text-gray-300 text-xs leading-relaxed break-words">{r.title}</p>
                          </div>
                        )}
                        {isPending && (
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-indigo-950 border-t border-indigo-800">
                            <span className="text-indigo-300 text-xs truncate">Send to downloader?</span>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => setPendingIdx(null)}
                                className="text-xs px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => sendMagnetLink(r.magnet)}
                                className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium"
                              >
                                {loading ? 'Sending…' : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => { setPage(p => p - 1); setExpandedIdx(null); setPendingIdx(null) }}
                        disabled={page === 0}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Prev
                      </button>
                      <span className="text-gray-500 text-xs">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => { setPage(p => p + 1); setExpandedIdx(null); setPendingIdx(null) }}
                        disabled={page >= totalPages - 1}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Manual section */}
        {!autoSearching && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowManual(v => !v)}
              className="flex items-center justify-between text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors"
            >
              <span>{showManual ? 'Hide manual input' : hasResults ? 'Enter magnet manually instead' : 'Enter magnet manually'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                {showManual
                  ? <polyline points="18 15 12 9 6 15"/>
                  : <polyline points="6 9 12 15 18 9"/>}
              </svg>
            </button>

            {showManual && (
              <div className="flex flex-col gap-3 pt-1">
                {!hasResults && <p className="text-gray-500 text-xs">No torrents found automatically.</p>}
                <button
                  onClick={search1337x}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg py-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Search on 1337x
                </button>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 text-xs">Magnet link</label>
                  <textarea
                    value={magnet}
                    onChange={e => setMagnet(e.target.value)}
                    placeholder="magnet:?xt=urn:btih:… or https://…/file.torrent"
                    rows={3}
                    className="bg-gray-800 text-gray-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-600 font-mono"
                  />
                </div>
                <button
                  onClick={handleManualSend}
                  disabled={loading || !magnet}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg py-2.5"
                >
                  {loading ? 'Sending…' : 'Send to downloader'}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  )
}
