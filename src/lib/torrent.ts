export interface TorrentResult {
  title: string
  magnet: string
  quality: string
  seeds: number
  size: string
  source: 'yts' | 'torrentio'
  language?: string
}

const LANG_KEYWORDS: [RegExp, string][] = [
  [/\b(french|vostfr)\b/i, 'FR'],
  [/\bvf\b/i, 'FR'],
  [/\b(english)\b/i, 'EN'],
  [/\bvo\b/i, 'EN'],
  [/\bspanish\b/i, 'ES'],
  [/\bgerman\b/i, 'DE'],
  [/\bitalian\b/i, 'IT'],
  [/\bportuguese\b/i, 'PT'],
  [/\bjapanese\b/i, 'JA'],
  [/\bkorean\b/i, 'KO'],
  [/\bchinese\b/i, 'ZH'],
  [/\brussian\b/i, 'RU'],
  [/\bmulti\b/i, 'MULTi'],
  [/🇫🇷/, 'FR'],
  [/🇬🇧|🇺🇸/, 'EN'],
  [/🇪🇸/, 'ES'],
  [/🇩🇪/, 'DE'],
  [/🇮🇹/, 'IT'],
  [/🇵🇹/, 'PT'],
  [/🇯🇵/, 'JA'],
  [/🇰🇷/, 'KO'],
  [/🇨🇳/, 'ZH'],
  [/🇷🇺/, 'RU'],
]

function parseLanguage(text: string): string | undefined {
  for (const [re, code] of LANG_KEYWORDS) {
    if (re.test(text)) return code
  }
  return undefined
}

const YTS_TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.leechers-paradise.org:6969',
]

function buildMagnet(hash: string, name: string): string {
  const parts = [
    `xt=urn:btih:${hash}`,
    `dn=${encodeURIComponent(name)}`,
    ...YTS_TRACKERS.map(tr => `tr=${encodeURIComponent(tr)}`),
  ]
  return `magnet:?${parts.join('&')}`
}

async function searchYts(imdbId: string): Promise<TorrentResult[]> {
  try {
    const res = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}&quality=all&limit=10`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return []
    const data = await res.json() as {
      data?: {
        movies?: Array<{
          title: string
          torrents?: Array<{ quality: string; hash: string; seeds: number; size: string }>
        }>
      }
    }
    const results: TorrentResult[] = []
    for (const movie of data.data?.movies ?? []) {
      for (const t of movie.torrents ?? []) {
        results.push({
          title: `${movie.title} [${t.quality}]`,
          magnet: buildMagnet(t.hash, movie.title),
          quality: t.quality,
          seeds: t.seeds,
          size: t.size,
          source: 'yts',
        })
      }
    }
    return results
  } catch {
    return []
  }
}

interface TorrentioStream {
  name?: string
  title?: string
  infoHash?: string
}

function parseTorrentioStream(stream: TorrentioStream): TorrentResult | null {
  if (!stream.infoHash) return null
  const titleLine = stream.title ?? ''
  const seedMatch = titleLine.match(/👤\s*(\d+)/)
  const seeds = seedMatch ? parseInt(seedMatch[1], 10) : 0
  const sizeMatch = titleLine.match(/💾\s*([\d.]+ \w+)/)
  const size = sizeMatch ? sizeMatch[1] : ''
  const quality = (stream.name ?? '').split('\n')[0] ?? ''
  const displayTitle = titleLine.split('\n').slice(0, 2).join(' — ')
  return {
    title: displayTitle || quality,
    magnet: buildMagnet(stream.infoHash, quality),
    quality,
    seeds,
    size,
    source: 'torrentio',
    language: parseLanguage(titleLine) ?? parseLanguage(stream.name ?? ''),
  }
}

async function searchTorrentio(path: string): Promise<TorrentResult[]> {
  try {
    const res = await fetch(`https://torrentio.strem.fun/stream/${path}.json`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json() as { streams?: TorrentioStream[] }
    return (data.streams ?? []).flatMap(s => {
      const r = parseTorrentioStream(s)
      return r ? [r] : []
    })
  } catch {
    return []
  }
}

export async function findMovieTorrents(imdbId: string): Promise<TorrentResult[]> {
  const [yts, torrentio] = await Promise.allSettled([
    searchYts(imdbId),
    searchTorrentio(`movie/${imdbId}`),
  ])
  const all = [
    ...(yts.status === 'fulfilled' ? yts.value : []),
    ...(torrentio.status === 'fulfilled' ? torrentio.value : []),
  ]
  return all.sort((a, b) => b.seeds - a.seeds).slice(0, 10)
}

// Torrentio requires an episode number — querying episode 1 surfaces both per-episode and
// season-pack torrents for the given season. YTS is movies-only and is not queried here.
export async function findSeasonTorrents(imdbId: string, season: number): Promise<TorrentResult[]> {
  const results = await searchTorrentio(`series/${imdbId}:${season}:1`)
  return results.sort((a, b) => b.seeds - a.seeds).slice(0, 10)
}
