# follow-links

A personal media tracker that connects TMDB, Jellyfin, and [local-link-downloader](https://github.com/your-repo/local-link-downloader). Track movies and TV shows, sync what's already in your Jellyfin library, and queue downloads.

## Features

- Search movies and TV shows via TMDB
- Track status: wanted / downloading / downloaded
- Sync library from Jellyfin (marks items as downloaded, imports new ones)
- Queue downloads via local-link-downloader with automatic torrent search (YTS + Torrentio)
- Content language setting — controls titles, overviews, and search results
- **Cross-device sync** — library and settings are stored in a JSON file on local-link-downloader and shared across all devices on your network

## Setup

### First device

1. Open the app — the Settings modal will appear automatically
2. Fill in your credentials (see fields below)
3. Click Save — settings and library are written to localStorage

### Enabling cross-device sync

Cross-device sync is optional. It uses local-link-downloader's JSON file API to store the library and settings alongside your downloads.

**1. Create the sync file** in your movies folder on the machine running local-link-downloader:

```bash
echo '{"movies":[],"shows":[],"settings":{},"updatedAt":""}' > /path/to/movies-folder/follow-links-library.json
```

A ready-made example file is included at the root of this repo: `follow-links-library.json`.

**2. Configure the downloader URL** in Settings on your first device. On next save, all settings and library data are pushed to the file automatically.

**3. New device bootstrap** — on any additional device, open the app, enter only the `Downloader URL` and `Bearer token`, then save. On the next load the app will pull all other settings (TMDB key, Jellyfin, folder keys…) and the full library from the remote file.

> The sync file must exist on disk before the first push. Afterwards every save (library change or settings update) pushes automatically. If the file is unreachable the app falls back to localStorage silently.

### Settings-only setup (no sync)

If you don't need cross-device sync, just fill in the Settings modal on each device. Values are persisted in localStorage only.

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

## Sync indicator

A small dot appears next to the settings gear when remote sync is active:

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
