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
  schemaVersion: 'fl:schemaVersion',
} as const

export const SCHEMA_VERSION = 1

export const SETTING_DEFAULTS: Settings = {
  tmdbApiKey: import.meta.env.VITE_TMDB_API_KEY ?? '',
  language: import.meta.env.VITE_LANGUAGE ?? 'en',
  downloaderUrl: import.meta.env.VITE_DOWNLOADER_URL ?? 'http://localhost:3001',
  downloaderToken: import.meta.env.VITE_DOWNLOADER_TOKEN ?? '',
  movieFolderKey: import.meta.env.VITE_MOVIE_FOLDER_KEY ?? 'movies',
  tvFolderKey: import.meta.env.VITE_TV_FOLDER_KEY ?? 'tv',
  jellyfinUrl: import.meta.env.VITE_JELLYFIN_URL ?? '',
  jellyfinApiKey: import.meta.env.VITE_JELLYFIN_API_KEY ?? '',
  jackettUrl: import.meta.env.VITE_JACKETT_URL ?? '',
  jackettApiKey: import.meta.env.VITE_JACKETT_API_KEY ?? '',
}
