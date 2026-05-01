import type { MediaStatus } from './types'

export const STATUS_BADGE: Record<MediaStatus, string> = {
  wanted: 'bg-yellow-600 text-yellow-100',
  downloading: 'bg-blue-600 text-blue-100',
  downloaded: 'bg-green-700 text-green-100',
}

export const SEASON_STATUS_CLASSES: Record<MediaStatus | 'unmonitored', string> = {
  ...STATUS_BADGE,
  unmonitored: 'bg-gray-700 text-gray-400',
}
