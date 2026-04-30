# follow-links

A personal media tracker that connects TMDB, Jellyfin, and a local link downloader. Track movies and TV shows, sync what's already in your Jellyfin library, and queue downloads.

## Features

- Search movies and TV shows via TMDB
- Track status: wanted / downloading / downloaded
- Sync library from Jellyfin (marks items as downloaded, imports new ones)
- Queue downloads via [local-link-downloader](https://github.com/your-repo/local-link-downloader)
- Content language setting — controls titles, overviews, and search results from both TMDB and Jellyfin

## Setup

### Option 1 — `public/config.json` (recommended for self-hosting)

Drop a `config.json` in the `public/` folder before building. Values here act as defaults that can still be overridden per-user via the in-app Settings.

```json
{
  "tmdbApiKey": "your_tmdb_api_key",
  "language": "en",
  "downloaderUrl": "http://localhost:3001",
  "downloaderToken": "your_token",
  "movieFolderKey": "movies",
  "tvFolderKey": "tv",
  "jellyfinUrl": "http://192.168.1.x:8096",
  "jellyfinApiKey": "your_jellyfin_api_key"
}
```

### Option 2 — in-app Settings

Open the gear icon and fill in the fields directly. Values are persisted in `localStorage`.

## Config fields

| Field | Description |
|---|---|
| `tmdbApiKey` | [TMDB API key](https://www.themoviedb.org/settings/api) |
| `language` | BCP 47 language code for content (`en`, `fr`, `es`, `de`, `ja`, …) |
| `downloaderUrl` | URL of the local-link-downloader instance |
| `downloaderToken` | Bearer token for the downloader |
| `movieFolderKey` | Destination folder key for movies |
| `tvFolderKey` | Destination folder key for TV shows |
| `jellyfinUrl` | Base URL of your Jellyfin server |
| `jellyfinApiKey` | Jellyfin API key |

## Dev

```bash
npm install
npm run dev
```
