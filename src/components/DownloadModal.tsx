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
  const [manual, setManual] = useState(false)
  const [magnet, setMagnet] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!imdbId) { setManual(true); return }
    setAutoSearching(true)
    ;(season !== undefined ? findSeasonTorrents(imdbId, season) : findMovieTorrents(imdbId))
      .then(results => { if (!cancelled) { setAutoResults(results); if (results.length === 0) setManual(true) } })
      .catch(() => { if (!cancelled) setManual(true) })
      .finally(() => { if (!cancelled) setAutoSearching(false) })
    return () => { cancelled = true }
  }, [imdbId, season])

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
    if (!trimmed.startsWith('magnet:')) {
      setError('Paste a valid magnet link (starts with magnet:)')
      return
    }
    await sendMagnetLink(trimmed)
  }

  const search1337x = () => {
    window.open(`https://www.1337x.to/search/${encodeURIComponent(searchQuery)}/1/`, '_blank')
  }

  const showAuto = !manual && (autoSearching || (autoResults !== null && autoResults.length > 0))

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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-4">✕</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-gray-400 text-xs">Folder key</label>
          <input
            value={folder}
            onChange={e => setFolder(e.target.value)}
            className="bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {showAuto && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                {autoSearching ? 'Searching…' : 'Found torrents'}
              </span>
              <button
                onClick={() => setManual(true)}
                className="text-gray-600 hover:text-gray-400 text-xs"
              >
                manual
              </button>
            </div>
            {autoSearching && (
              <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
                <span className="animate-spin">⟳</span> Searching YTS & Torrentio…
              </div>
            )}
            {autoResults?.map((r, i) => (
              <button
                key={i}
                disabled={loading}
                onClick={() => sendMagnetLink(r.magnet)}
                className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-gray-200 text-xs truncate">{r.quality || r.title}</span>
                  {r.title !== r.quality && (
                    <span className="text-gray-500 text-xs truncate">{r.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {r.size && <span className="text-gray-500 text-xs">{r.size}</span>}
                  {r.seeds > 0 && (
                    <span className="text-green-500 text-xs">{r.seeds}↑</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${r.source === 'yts' ? 'bg-yellow-900 text-yellow-300' : 'bg-indigo-900 text-indigo-300'}`}>
                    {r.source}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {manual && (
          <div className="flex flex-col gap-3">
            {!showAuto && autoResults?.length === 0 && (
              <p className="text-gray-500 text-xs">No torrents found automatically.</p>
            )}
            <button
              onClick={search1337x}
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg py-2"
            >
              🔍 Search on 1337x
            </button>
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs">Magnet link</label>
              <textarea
                value={magnet}
                onChange={e => setMagnet(e.target.value)}
                placeholder="magnet:?xt=urn:btih:…"
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

        {!showAuto && !manual && !autoSearching && (
          <button
            onClick={() => setManual(true)}
            className="text-gray-600 hover:text-gray-400 text-xs text-center"
          >
            Enter magnet manually
          </button>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  )
}
