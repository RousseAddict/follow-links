import type { DownloaderJob } from '../types'

function normalizeUrl(base: string): string {
  return base.replace(/\/$/, '')
}

export async function sendMagnet(
  magnet: string,
  folderKey: string,
  downloaderUrl: string,
  token: string,
): Promise<{ id: string }> {
  const res = await fetch(`${normalizeUrl(downloaderUrl)}/api/torrent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ magnet, folderKey }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Downloader error ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ id: string }>
}

export async function fetchJobs(downloaderUrl: string, token: string): Promise<DownloaderJob[]> {
  const res = await fetch(`${normalizeUrl(downloaderUrl)}/api/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Downloader error ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Unexpected response from downloader: expected array')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(j => ({
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
  }))
}
