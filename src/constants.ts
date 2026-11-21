import type { MediaStatus } from './types'

/** Soft pill colours for a status, readable on dark surfaces. */
export const STATUS_PILL: Record<MediaStatus | 'unmonitored', string> = {
  wanted: 'bg-wanted/15 text-wanted-text',
  downloading: 'bg-downloading/25 text-downloading-text',
  downloaded: 'bg-ok/15 text-ok',
  unmonitored: 'bg-surface-3 text-faint',
}
