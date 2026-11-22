import type { DownloaderJob } from '../types'

export type MediaKind = 'movie' | 'tv'

/** Whatever fetches the files. Pages and contexts only talk to this, never to a specific service. */
export interface Downloader {
  /** Folder a new download of this kind goes to, unless the user picks another one. */
  defaultFolder(kind: MediaKind): string
  /** Queues a magnet link (or a URL to a .torrent file) and returns the job id to track it by. */
  addMagnet(magnet: string, folder: string): Promise<{ id: string }>
  listJobs(): Promise<DownloaderJob[]>
}
