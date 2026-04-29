import { useState } from 'react'
import { sendMagnet } from '../lib/downloader'
import { getStore, KEYS, SETTING_DEFAULTS } from '../lib/store'

interface Props {
  title: string
  searchQuery: string
  folderKey: string
  onSuccess: (jobId: string) => void
  onClose: () => void
}

export function DownloadModal({ title, searchQuery, folderKey: defaultFolder, onSuccess, onClose }: Props) {
  const [settings] = useState(() => getStore(KEYS.settings, SETTING_DEFAULTS))

  const [magnet, setMagnet] = useState('')
  const [folder, setFolder] = useState(defaultFolder)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search1337x = () => {
    const q = encodeURIComponent(searchQuery)
    window.open(`https://www.1337x.to/search/${q}/1/`, '_blank')
  }

  const handleSend = async () => {
    const trimmedMagnet = magnet.trim()
    if (!trimmedMagnet.startsWith('magnet:')) {
      setError('Paste a valid magnet link (starts with magnet:)')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await sendMagnet(trimmedMagnet, folder, settings.downloaderUrl, settings.downloaderToken)
      onSuccess(result.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl w-full max-w-md p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-gray-100 font-medium">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">Send torrent to local-link-downloader</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-4">✕</button>
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label className="text-gray-400 text-xs">Folder key</label>
          <input
            value={folder}
            onChange={e => setFolder(e.target.value)}
            className="bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={handleSend}
          disabled={loading || !magnet}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg py-2.5"
        >
          {loading ? 'Sending…' : 'Send to downloader'}
        </button>
      </div>
    </div>
  )
}
