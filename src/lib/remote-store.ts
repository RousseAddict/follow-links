import type { Settings, MovieItem, ShowItem } from '../types'

const FILENAME = 'follow-links-library.json'

export interface RemoteLibrary {
  movies: MovieItem[]
  shows: ShowItem[]
  settings?: Partial<Settings>
  updatedAt: string
}

function url(settings: Settings): string {
  return `${settings.downloaderUrl.replace(/\/$/, '')}/api/json/${settings.movieFolderKey}/${FILENAME}`
}

function headers(settings: Settings): Record<string, string> {
  return settings.downloaderToken
    ? { Authorization: `Bearer ${settings.downloaderToken}` }
    : {}
}

export function isRemoteConfigured(settings: Settings): boolean {
  return Boolean(settings.downloaderUrl && settings.movieFolderKey)
}

export async function fetchRemoteLibrary(settings: Settings): Promise<RemoteLibrary | null> {
  try {
    const res = await fetch(url(settings), {
      headers: headers(settings),
      signal: AbortSignal.timeout(5000),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as RemoteLibrary
  } catch {
    return null
  }
}

export async function pushRemoteLibrary(
  movies: MovieItem[],
  shows: ShowItem[],
  settings: Settings,
): Promise<void> {
  const body: RemoteLibrary = { movies, shows, settings, updatedAt: new Date().toISOString() }
  const res = await fetch(url(settings), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers(settings) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
