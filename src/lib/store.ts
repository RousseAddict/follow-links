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
  moviesSort: 'fl:moviesSort',
  showsSort: 'fl:showsSort',
} as const

export const SCHEMA_VERSION = 1

const rc = window.__FL_CONFIG__ ?? {}

export const SETTING_DEFAULTS: Settings = {
  tmdbApiKey: rc.tmdbApiKey || import.meta.env.VITE_TMDB_API_KEY || '',
  language: rc.language || import.meta.env.VITE_LANGUAGE || 'en',
  downloaderUrl: rc.downloaderUrl || import.meta.env.VITE_DOWNLOADER_URL || 'http://localhost:3001',
  downloaderToken: rc.downloaderToken || import.meta.env.VITE_DOWNLOADER_TOKEN || '',
  movieFolderKey: rc.movieFolderKey || import.meta.env.VITE_MOVIE_FOLDER_KEY || 'movies',
  tvFolderKey: rc.tvFolderKey || import.meta.env.VITE_TV_FOLDER_KEY || 'tv',
  jellyfinUrl: rc.jellyfinUrl || import.meta.env.VITE_JELLYFIN_URL || '',
  jellyfinApiKey: rc.jellyfinApiKey || import.meta.env.VITE_JELLYFIN_API_KEY || '',
  jackettUrl: rc.jackettUrl || import.meta.env.VITE_JACKETT_URL || '',
  jackettApiKey: rc.jackettApiKey || import.meta.env.VITE_JACKETT_API_KEY || '',
}
