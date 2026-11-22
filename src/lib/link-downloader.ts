// The only file that knows local-link-downloader's HTTP API.
import type { DownloaderJob } from '../types'
import type { Downloader, MediaKind } from './downloader'
import { parseLibraryDoc, type LibraryStore } from './library-store'

const LIBRARY_FILE = 'follow-links-library.json'

function api(baseUrl: string, token: string) {
  const base = baseUrl.replace(/\/$/, '')
  return (path: string, init: RequestInit = {}, headers: Record<string, string> = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
    })
}

const JSON_BODY = { 'Content-Type': 'application/json' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJob(j: any): DownloaderJob {
  return {
    id: j.id,
    status: j.status,
    filename: j.filename,
    progress: j.progress,
    type: j.type,
    createdAt: j.created_at,
    totalBytes: j.total_bytes,
    downloadedBytes: j.downloaded_bytes,
    downloadSpeed: j.download_speed,
    peers: j.peers,
    ytdlpPercent: j.ytdlp_percent,
  }
}

export function linkDownloader(opts: { url: string; token: string; folders: Record<MediaKind, string> }): Downloader {
  const call = api(opts.url, opts.token)
  return {
    defaultFolder: kind => opts.folders[kind],

    async addMagnet(magnet, folder) {
      const res = await call('/api/torrent', { method: 'POST', body: JSON.stringify({ magnet, folderKey: folder }) }, JSON_BODY)
      if (!res.ok) throw new Error(`Downloader error ${res.status}: ${await res.text()}`)
      return await res.json() as { id: string }
    },

    async listJobs() {
      const res = await call('/api/jobs')
      if (!res.ok) throw new Error(`Downloader error ${res.status}`)
      const data: unknown = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected response from downloader: expected array')
      return data.map(toJob)
    },
  }
}

/**
 * Keeps the library in a JSON file in one of the downloader's folders, through its /api/json endpoints.
 * The file has to exist before the first save: the downloader only overwrites files, it never creates them.
 */
export function linkDownloaderStore(opts: { url: string; token: string; folder: string }): LibraryStore {
  const call = api(opts.url, opts.token)
  const path = `/api/json/${encodeURIComponent(opts.folder)}/${LIBRARY_FILE}`
  return {
    async load() {
      try {
        const res = await call(path, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) return null
        return parseLibraryDoc(await res.json())
      } catch {
        return null
      }
    },

    async save(doc) {
      const res = await call(path, { method: 'PUT', body: JSON.stringify(doc), signal: AbortSignal.timeout(5000) }, JSON_BODY)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    },
  }
}
