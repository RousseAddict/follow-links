# follow-links

[![Docker image](https://img.shields.io/badge/docker-ghcr.io%2Frousseaddict%2Ffollow--links-blue?logo=docker)](https://github.com/RousseAddict/follow-links/pkgs/container/follow-links)

A personal media tracker that connects TMDB, Jellyfin, and [local-link-downloader](https://github.com/your-repo/local-link-downloader). Track movies and TV shows, sync what's already in your Jellyfin library, and queue downloads.

## Features

- Search movies and TV shows via TMDB, with posters, backdrops and trailers (YouTube, via TMDB; no extra key needed)
- Track status: wanted / downloading / downloaded
- Sync library from Jellyfin (marks items as downloaded, imports new ones)
- Queue downloads via local-link-downloader with automatic torrent search (YTS + Torrentio + Jackett)
- Content language setting — controls titles, overviews, and search results
- Works on phones: bottom tab bar, swipe-down sheets, and installable to the home screen (web app manifest)
- **Cross-device sync** — the library is stored in a JSON file on local-link-downloader and shared across all devices on your network

## Setup

### Settings

Settings come from environment variables on the container (see [Environment variables](#environment-variables)), so every device that opens the app gets them. Anything you change in the Settings modal is saved on that device only and wins over the container's value. Without the container (e.g. `npm run dev`), fill in the Settings modal on each device.

### Enabling cross-device sync

Cross-device sync is optional. It keeps the library (movies and shows, not settings) in a JSON file served by local-link-downloader's JSON file API.

**1. Create the sync file** in your movies folder on the machine running local-link-downloader:

```bash
echo '{"movies":[],"shows":[],"updatedAt":""}' > /path/to/movies-folder/follow-links-library.json
```

A ready-made example file is included at the root of this repo: `follow-links-library.json`.

**2. Point the app at the downloader** (`Downloader URL`, `Bearer token`, `Movies folder key`). As soon as the downloader is set up, the library in the file replaces the one on the device. The first device to find the file still empty (never written by the app) fills it with its own library instead.

> The sync file must exist on disk: local-link-downloader only overwrites files, it never creates them. Every library change is pushed automatically. If the file is unreachable the app keeps using the copy on the device.

## Settings fields

| Field | Description |
|---|---|
| `TMDB API key` | [TMDB API key](https://www.themoviedb.org/settings/api) |
| `Content language` | BCP 47 code for titles, overviews and search results (`en`, `fr`, `es`, `de`, `ja`, …) |
| `Downloader URL` | Base URL of your local-link-downloader instance |
| `Bearer token` | Auth token for local-link-downloader |
| `Movies folder key` | Destination folder key for movies (must match a key in local-link-downloader's `DOWNLOAD_FOLDERS`) |
| `TV folder key` | Destination folder key for TV shows |
| `Jellyfin server URL` | Base URL of your Jellyfin server (optional) |
| `Jellyfin API key` | Jellyfin API key (optional) |
| `Jackett URL` | Base URL of your Jackett instance (optional) |
| `Jackett API key` | Jackett API key shown in Jackett's top-right corner (optional) |

## Environment variables

In the Docker image these are read when the container starts (written to `config.js`), so changing them only needs a restart. For `npm run dev` or `npm run build`, copy `.env.example` to `.env` and fill in values. A value changed in the in-app Settings modal is stored in that device's `localStorage` and takes precedence.

| Variable | Default | Description |
|---|---|---|
| `VITE_TMDB_API_KEY` | _(empty)_ | TMDB API key |
| `VITE_LANGUAGE` | `en` | BCP 47 language code for TMDB results |
| `VITE_DOWNLOADER_URL` | `http://localhost:3001` | Base URL of local-link-downloader |
| `VITE_DOWNLOADER_TOKEN` | _(empty)_ | Bearer token for local-link-downloader |
| `VITE_MOVIE_FOLDER_KEY` | `movies` | Destination folder key for movies |
| `VITE_TV_FOLDER_KEY` | `tv` | Destination folder key for TV shows |
| `VITE_JELLYFIN_URL` | _(empty)_ | Jellyfin server URL (optional) |
| `VITE_JELLYFIN_API_KEY` | _(empty)_ | Jellyfin API key (optional) |
| `VITE_JACKETT_URL` | _(empty)_ | Jackett server URL (optional) |
| `VITE_JACKETT_API_KEY` | _(empty)_ | Jackett API key (optional) |

## Sync indicator

A small dot appears next to the settings gear (on phones, next to the page title) when remote sync is active:

| Color | Meaning |
|---|---|
| Yellow (pulsing) | Sync in progress |
| Green | Last sync successful |
| *(none)* | No sync configured, or fallback to localStorage |

## Dev

```bash
npm install
npm run dev
```
