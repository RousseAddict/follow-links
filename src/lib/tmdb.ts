import type { TmdbMovie, TmdbShow, TmdbSeason } from '../types'

const BASE = 'https://api.themoviedb.org/3'

export function posterUrl(path: string, size = 'w342'): string {
  if (!path) return ''
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/${size}${path}`
}

async function tmdbFetch<T>(path: string, apiKey: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', apiKey)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json() as Promise<T>
}

export async function searchMovies(query: string, apiKey: string): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>('/search/movie', apiKey, { query })
  return data.results.slice(0, 20)
}

export async function searchShows(query: string, apiKey: string): Promise<TmdbShow[]> {
  const data = await tmdbFetch<{ results: TmdbShow[] }>('/search/tv', apiKey, { query })
  return data.results.slice(0, 20)
}

export async function getSeasons(showId: number, apiKey: string): Promise<TmdbSeason[]> {
  const data = await tmdbFetch<{ seasons: TmdbSeason[] }>(`/tv/${showId}`, apiKey)
  return data.seasons.filter(s => s.season_number > 0)
}
