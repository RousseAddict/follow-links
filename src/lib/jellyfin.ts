import type { JellyfinItem, JellyfinSeason } from '../types'

function headers(apiKey: string) {
  return { 'X-Emby-Token': apiKey }
}

export function parseTmdbId(item: JellyfinItem): number | null {
  const str = item.ProviderIds?.Tmdb
  if (!str) return null
  const id = parseInt(str, 10)
  return isNaN(id) ? null : id
}

async function jellyfinFetch<T>(url: string, apiKey: string, params: Record<string, string> = {}): Promise<T> {
  const requestUrl = new URL(url)
  for (const [k, v] of Object.entries(params)) requestUrl.searchParams.set(k, v)
  const res = await fetch(requestUrl.toString(), { headers: headers(apiKey) })
  if (!res.ok) throw new Error(`Jellyfin ${res.status}: ${res.statusText}`)
  const data = await res.json() as { Items?: unknown; [k: string]: unknown }
  const items = Array.isArray(data.Items) ? data.Items : Array.isArray(data) ? data : []
  return items as T
}

export async function fetchJellyfinMovies(baseUrl: string, apiKey: string, language = 'en'): Promise<JellyfinItem[]> {
  return jellyfinFetch<JellyfinItem[]>(`${baseUrl}/Items`, apiKey, {
    Recursive: 'true',
    IncludeItemTypes: 'Movie',
    Fields: 'ProviderIds,Overview',
    Language: language,
  })
}

export async function fetchJellyfinShows(baseUrl: string, apiKey: string, language = 'en'): Promise<JellyfinItem[]> {
  return jellyfinFetch<JellyfinItem[]>(`${baseUrl}/Items`, apiKey, {
    Recursive: 'true',
    IncludeItemTypes: 'Series',
    Fields: 'ProviderIds,Overview',
    Language: language,
  })
}

export async function fetchJellyfinSeasons(
  jellyfinSeriesId: string,
  baseUrl: string,
  apiKey: string,
): Promise<JellyfinSeason[]> {
  return jellyfinFetch<JellyfinSeason[]>(`${baseUrl}/Shows/${jellyfinSeriesId}/Seasons`, apiKey)
}

export function jellyfinPosterUrl(baseUrl: string, itemId: string, apiKey: string): string {
  return `${baseUrl}/Items/${itemId}/Images/Primary?width=342&api_key=${apiKey}`
}
