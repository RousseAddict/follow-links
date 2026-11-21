// Trailer rules: which videos count, which one plays first, and when a muted preview may autoplay.

export interface TmdbVideo {
  key: string
  name: string
  site: string
  type: string
  official: boolean
  iso_639_1: string | null
  published_at?: string
}

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{6,20}$/
const EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

export const PREVIEW_DELAY_MS = 1500

/** YouTube trailers and teasers only, best first: Trailer over Teaser, official, your language, then English. */
export function rankVideos(videos: TmdbVideo[], lang: string): TmdbVideo[] {
  const want = lang.toLowerCase().split('-')[0]
  const score = (v: TmdbVideo) => {
    let s = v.type === 'Trailer' ? 100 : 50
    if (v.official) s += 10
    const l = (v.iso_639_1 ?? '').toLowerCase()
    if (l === want) s += 5
    else if (l === 'en' || l === '') s += 2
    return s
  }
  const seen = new Set<string>()
  return videos
    .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && YOUTUBE_KEY.test(v.key))
    .filter(v => (seen.has(v.key) ? false : (seen.add(v.key), true)))
    .map((v, i) => ({ v, s: score(v), i }))
    .sort((a, b) => b.s - a.s || (b.v.published_at ?? '').localeCompare(a.v.published_at ?? '') || a.i - b.i)
    .map(x => x.v)
}

interface EmbedOptions {
  /** Muted, chrome-less background preview that reports its state over postMessage. */
  preview?: boolean
}

export function embedUrl(key: string, { preview = false }: EmbedOptions = {}): string {
  const q = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
  })
  if (preview) {
    q.set('mute', '1')
    q.set('controls', '0')
    q.set('disablekb', '1')
    q.set('enablejsapi', '1')
    q.set('origin', window.location.origin)
  }
  return `${EMBED_ORIGIN}/embed/${encodeURIComponent(key)}?${q}`
}

export function videoThumbUrl(key: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(key)}/mqdefault.jpg`
}

export function videoLabel(v: TmdbVideo): string {
  return v.type === 'Teaser' ? 'Teaser' : 'Trailer'
}

/** Send a command to a preview iframe (YouTube's postMessage API, no script needed). */
export function playerCommand(frame: HTMLIFrameElement | null, func: 'mute' | 'unMute' | 'playVideo' | 'pauseVideo') {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), EMBED_ORIGIN)
}

/** Ask the iframe to start reporting player state changes. */
export function playerListen(frame: HTMLIFrameElement | null) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), EMBED_ORIGIN)
}

export type PlayerEvent = { kind: 'state'; state: number } | { kind: 'error' }

/** Read a message from a preview iframe. State: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering. */
export function readPlayerMessage(e: MessageEvent, frame: HTMLIFrameElement | null): PlayerEvent | null {
  if (e.origin !== EMBED_ORIGIN || !frame || e.source !== frame.contentWindow) return null
  let data: { event?: string; info?: unknown }
  try {
    data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
  } catch {
    return null
  }
  if (data?.event === 'onError') return { kind: 'error' }
  if (data?.event === 'onStateChange' && typeof data.info === 'number') return { kind: 'state', state: data.info }
  if (data?.event === 'infoDelivery' || data?.event === 'initialDelivery') {
    const state = (data.info as { playerState?: number } | undefined)?.playerState
    if (typeof state === 'number') return { kind: 'state', state }
  }
  return null
}

/** Muted previews only on a desktop pointer, and never with reduced motion or a data saver on. */
export function previewAllowed(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData) return false
  if (['slow-2g', '2g', '3g'].includes(conn?.effectiveType ?? '')) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches
}
