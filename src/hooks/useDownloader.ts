import { useMemo } from 'react'
import { useSettings } from '../contexts/settings'
import { createDownloader } from '../lib/backends'
import type { Downloader } from '../lib/downloader'

/** The configured downloader, or null when none is set up. */
export function useDownloader(): Downloader | null {
  const { downloaderUrl, downloaderToken, movieFolderKey, tvFolderKey } = useSettings().settings
  return useMemo(
    () => createDownloader({ downloaderUrl, downloaderToken, movieFolderKey, tvFolderKey }),
    [downloaderUrl, downloaderToken, movieFolderKey, tvFolderKey],
  )
}
