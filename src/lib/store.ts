import type { Settings, ShowItem } from '../types'

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
  heroCollapsed: 'fl:heroCollapsed',
} as const

export const SCHEMA_VERSION = 2

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

/** Stored values win over the defaults (config.js, then build-time env). */
export function loadSettings(): Settings {
  const stored = getStore<Partial<Settings>>(KEYS.settings, {})
  return Object.fromEntries(
    (Object.keys(SETTING_DEFAULTS) as (keyof Settings)[]).map(k => [k, stored[k] || SETTING_DEFAULTS[k]]),
  ) as unknown as Settings
}

/** Only the values that differ from the defaults, so later changes to config.js still reach this device. */
export function settingsOverrides(s: Partial<Settings>): Partial<Settings> {
  return Object.fromEntries(
    Object.entries(s).filter(([k, v]) => k in SETTING_DEFAULTS && v && v !== SETTING_DEFAULTS[k as keyof Settings]),
  )
}

/** Upgrades what this device has in localStorage. Runs once, before the app renders. */
export function migrateStorage(): void {
  const version = getStore<number>(KEYS.schemaVersion, 0)

  if (version < 1) {
    const shows = getStore<ShowItem[]>(KEYS.shows, [])
    if (shows.some(s => !Array.isArray(s.seasons))) {
      setStore(KEYS.shows, shows.map(s => ({ ...s, seasons: s.seasons ?? [] })))
    }
  }

  if (version < 2) {
    // Startup used to write every setting back to localStorage, which pinned the defaults
    // and hid later changes to config.js. Keep only the values this device really overrides.
    setStore(KEYS.settings, settingsOverrides(getStore<Partial<Settings>>(KEYS.settings, {})))
  }

  if (version < SCHEMA_VERSION) {
    setStore(KEYS.schemaVersion, SCHEMA_VERSION)
  }
}
