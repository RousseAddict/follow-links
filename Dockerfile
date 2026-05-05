# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* vars are baked in at build time.
# Pass them as --build-arg when building a pre-configured image,
# or leave them empty and configure everything via the in-app Settings modal.
ARG VITE_TMDB_API_KEY
ARG VITE_LANGUAGE=en
ARG VITE_DOWNLOADER_URL=http://localhost:3001
ARG VITE_DOWNLOADER_TOKEN
ARG VITE_MOVIE_FOLDER_KEY=movies
ARG VITE_TV_FOLDER_KEY=tv
ARG VITE_JELLYFIN_URL
ARG VITE_JELLYFIN_API_KEY
ARG VITE_JACKETT_URL
ARG VITE_JACKETT_API_KEY

RUN npm run build

# ── Serve stage ─────────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
