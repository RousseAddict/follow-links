#!/bin/sh
set -e

# Escape backslashes then double-quotes so values are safe inside JS string literals
_esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > /usr/share/nginx/html/config.js << JS
window.__FL_CONFIG__ = {
  tmdbApiKey: "$(_esc "${VITE_TMDB_API_KEY:-}")",
  language: "$(_esc "${VITE_LANGUAGE:-}")",
  downloaderUrl: "$(_esc "${VITE_DOWNLOADER_URL:-}")",
  downloaderToken: "$(_esc "${VITE_DOWNLOADER_TOKEN:-}")",
  movieFolderKey: "$(_esc "${VITE_MOVIE_FOLDER_KEY:-}")",
  tvFolderKey: "$(_esc "${VITE_TV_FOLDER_KEY:-}")",
  jellyfinUrl: "$(_esc "${VITE_JELLYFIN_URL:-}")",
  jellyfinApiKey: "$(_esc "${VITE_JELLYFIN_API_KEY:-}")",
  jackettUrl: "$(_esc "${VITE_JACKETT_URL:-}")",
  jackettApiKey: "$(_esc "${VITE_JACKETT_API_KEY:-}")",
};
JS

exec nginx -g "daemon off;"
