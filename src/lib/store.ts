import type { Settings } from '../types'

export function getStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const KEYS = {
  movies: 'fl:movies',
  shows: 'fl:shows',
  settings: 'fl:settings',
} as const

export const SETTING_DEFAULTS: Settings = {
  tmdbApiKey: '',
  downloaderUrl: 'http://localhost:3001',
  downloaderToken: '',
  movieFolderKey: 'movies',
  tvFolderKey: 'tv',
  jellyfinUrl: '',
  jellyfinApiKey: '',
}
