import type { TmdbMovie, TmdbShow, TmdbSeason } from '../types'
import { rankVideos, type TmdbVideo } from './trailer'

const BASE = 'https://api.themoviedb.org/3'

export type TitleKind = 'movie' | 'tv'

export function posterUrl(path: string, size = 'w342'): string {
  if (!path) return ''
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/${size}${path}`
}

export function imageUrl(path: string | null | undefined, size: string): string {
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

// ── Title details (artwork, facts and trailers in one call) ──────────────────

export interface TitleDetails {
  kind: TitleKind
  id: number
  title: string
  year: string
  overview: string
  tagline: string
  posterPath: string | null
  backdropPath: string | null
  logoPath: string | null
  runtime: number | null
  seasonCount: number | null
  network: string | null
  genres: string[]
  rating: number | null
  imdbId: string | null
  videos: TmdbVideo[]
}

interface TmdbImage {
  file_path: string
  iso_639_1: string | null
  vote_average: number
}

interface RawDetails {
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  overview?: string
  tagline?: string
  poster_path?: string | null
  backdrop_path?: string | null
  runtime?: number | null
  episode_run_time?: number[]
  number_of_seasons?: number
  networks?: { name: string }[]
  genres?: { name: string }[]
  vote_average?: number
  vote_count?: number
  imdb_id?: string | null
  external_ids?: { imdb_id?: string | null }
  videos?: { results: TmdbVideo[] }
  images?: { backdrops?: TmdbImage[]; logos?: TmdbImage[] }
}

function baseLang(language: string): string {
  return (language || 'en').toLowerCase().split('-')[0]
}

function pickImage(images: TmdbImage[] | undefined, order: (string | null)[]): TmdbImage | null {
  if (!images?.length) return null
  for (const lang of order) {
    const match = images
      .filter(i => (i.iso_639_1 ?? null) === lang && !i.file_path.endsWith('.svg'))
      .sort((a, b) => b.vote_average - a.vote_average)[0]
    if (match) return match
  }
  return null
}

export async function getDetails(kind: TitleKind, id: number, apiKey: string, language = 'en'): Promise<TitleDetails> {
  const lang = baseLang(language)
  const langs = Array.from(new Set([lang, 'en'])).join(',')
  const raw = await tmdbFetch<RawDetails>(`/${kind}/${id}`, apiKey, {
    language,
    append_to_response: 'videos,images,external_ids',
    include_image_language: `${langs},null`,
    include_video_language: `${langs},null`,
  })

  // Textless backdrops look best behind the title; fall back to TMDB's default pick.
  const backdrop = pickImage(raw.images?.backdrops, [null])?.file_path ?? raw.backdrop_path ?? null
  const logo = pickImage(raw.images?.logos, [lang, 'en', null])?.file_path ?? null
  const date = raw.release_date || raw.first_air_date || ''

  return {
    kind,
    id,
    title: raw.title ?? raw.name ?? '',
    year: date.slice(0, 4),
    overview: raw.overview ?? '',
    tagline: raw.tagline ?? '',
    posterPath: raw.poster_path ?? null,
    backdropPath: backdrop,
    logoPath: logo,
    runtime: raw.runtime || raw.episode_run_time?.[0] || null,
    seasonCount: raw.number_of_seasons ?? null,
    network: raw.networks?.[0]?.name ?? null,
    genres: (raw.genres ?? []).map(g => g.name),
    rating: raw.vote_count && raw.vote_count >= 20 && raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : null,
    imdbId: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    videos: rankVideos(raw.videos?.results ?? [], lang).slice(0, 8),
  }
}
