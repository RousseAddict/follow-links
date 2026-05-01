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

export async function searchMovies(query: string, apiKey: string, language = 'en'): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>('/search/movie', apiKey, { query, language })
  return data.results.slice(0, 20)
}

export async function searchShows(query: string, apiKey: string, language = 'en'): Promise<TmdbShow[]> {
  const data = await tmdbFetch<{ results: TmdbShow[] }>('/search/tv', apiKey, { query, language })
  return data.results.slice(0, 20)
}

export async function getSeasons(showId: number, apiKey: string, language = 'en'): Promise<TmdbSeason[]> {
  const data = await tmdbFetch<{ seasons: TmdbSeason[] }>(`/tv/${showId}`, apiKey, { language })
  return data.seasons.filter(s => s.season_number > 0)
}

export async function getMovieImdbId(movieId: number, apiKey: string): Promise<string | null> {
  const data = await tmdbFetch<{ imdb_id?: string }>(`/movie/${movieId}/external_ids`, apiKey)
  return data.imdb_id ?? null
}

export async function getShowImdbId(showId: number, apiKey: string): Promise<string | null> {
  const data = await tmdbFetch<{ imdb_id?: string }>(`/tv/${showId}/external_ids`, apiKey)
  return data.imdb_id ?? null
}
