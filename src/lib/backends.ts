// Picks which service does the downloading and which one keeps the shared library.
// To move either one somewhere else, add an adapter next to link-downloader.ts and switch it here.
import type { Settings } from '../types'
import type { Downloader } from './downloader'
import type { LibraryStore } from './library-store'
import { linkDownloader, linkDownloaderStore } from './link-downloader'

export function createDownloader(
  s: Pick<Settings, 'downloaderUrl' | 'downloaderToken' | 'movieFolderKey' | 'tvFolderKey'>,
): Downloader | null {
  if (!s.downloaderUrl) return null
  return linkDownloader({
    url: s.downloaderUrl,
    token: s.downloaderToken,
    folders: { movie: s.movieFolderKey, tv: s.tvFolderKey },
  })
}

export function createLibraryStore(
  s: Pick<Settings, 'downloaderUrl' | 'downloaderToken' | 'movieFolderKey'>,
): LibraryStore | null {
  if (!s.downloaderUrl || !s.movieFolderKey) return null
  return linkDownloaderStore({ url: s.downloaderUrl, token: s.downloaderToken, folder: s.movieFolderKey })
}
