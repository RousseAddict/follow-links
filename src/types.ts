export type MediaStatus = 'wanted' | 'downloading' | 'downloaded'

export interface MovieItem {
  id: number
  title: string
  year: string
  overview: string
  posterPath: string
  status: MediaStatus
  monitored: boolean
  addedAt: string
  imdbId?: string
  downloadJobId?: string
}

export interface SeasonItem {
  seasonNumber: number
  episodeCount: number
  status: MediaStatus | 'unmonitored'
  monitored: boolean
  downloadJobId?: string
}

export interface ShowItem {
  id: number
  title: string
  overview: string
  posterPath: string
  monitored: boolean
  addedAt: string
  imdbId?: string
  seasons: SeasonItem[]
}

export interface Settings {
  tmdbApiKey: string
  language: string
  downloaderUrl: string
  downloaderToken: string
  movieFolderKey: string
  tvFolderKey: string
  jellyfinUrl: string
  jellyfinApiKey: string
  jackettUrl: string
  jackettApiKey: string
}

export interface JellyfinItem {
  Id: string
  Name: string
  ProductionYear?: number
  Overview?: string
  ImageTags?: { Primary?: string }
  ProviderIds?: { Tmdb?: string }
}

export interface JellyfinSeason {
  Id: string
  IndexNumber: number
}

export interface TmdbMovie {
  id: number
  title: string
  release_date: string
  overview: string
  poster_path: string | null
}

export interface TmdbShow {
  id: number
  name: string
  first_air_date: string
  overview: string
  poster_path: string | null
}

export interface TmdbSeason {
  season_number: number
  episode_count: number
  name: string
}

export type SyncResult = { ok: boolean; message: string } | null

export interface DownloaderJob {
  id: string
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  filename?: string
  progress?: number
  type?: string
  createdAt?: string
}
