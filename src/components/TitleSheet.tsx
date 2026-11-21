import { useState, type ReactNode } from 'react'
import { Sheet, useSheet } from './Sheet'
import { TitleLogo } from './TitleLogo'
import { Icon } from './Icon'
import { useTitleDetails } from '../hooks/useTitleDetails'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { imageUrl, posterUrl, type TitleDetails, type TitleKind } from '../lib/tmdb'
import { embedUrl, videoLabel, videoThumbUrl } from '../lib/trailer'
import { formatRuntime } from '../lib/library'

interface Props {
  kind: TitleKind
  id: number
  title: string
  year?: string
  overview?: string
  posterPath?: string
  /** Start the main trailer as soon as it is known (the hero's Trailer button). */
  autoPlay?: boolean
  onClose: () => void
  /** Status, seasons and actions for this title. */
  children?: ReactNode
}

function metaLine(kind: TitleKind, d: TitleDetails | null, year?: string): string[] {
  if (!d) return [year ?? ''].filter(Boolean)
  const parts = [d.year || year || '']
  if (kind === 'movie') parts.push(formatRuntime(d.runtime))
  else {
    if (d.network) parts.push(d.network)
    if (d.seasonCount) parts.push(`${d.seasonCount} season${d.seasonCount === 1 ? '' : 's'}`)
  }
  parts.push(d.genres.slice(0, kind === 'movie' ? 3 : 2).join(', '))
  return parts.filter(Boolean)
}

export function TitleSheet({ kind, id, title, year, overview, posterPath, autoPlay, onClose, children }: Props) {
  return (
    <Sheet label={title} onClose={onClose} size="lg" floatingClose>
      <TitleSheetBody kind={kind} id={id} title={title} year={year} overview={overview} posterPath={posterPath} autoPlay={autoPlay}>
        {children}
      </TitleSheetBody>
    </Sheet>
  )
}

function TitleSheetBody({ kind, id, title, year, overview, posterPath, autoPlay, children }: Omit<Props, 'onClose'>) {
  const { details, failed } = useTitleDetails(kind, id)
  const { scrollToTop } = useSheet()
  const isDesktop = useIsDesktop()
  // undefined = "play the main trailer once it is known" (autoPlay); null = not playing.
  const [choice, setChoice] = useState<string | null | undefined>(autoPlay ? undefined : null)
  const [backdropLoaded, setBackdropLoaded] = useState(false)
  const [moreText, setMoreText] = useState(false)

  const videos = details?.videos ?? []
  const playing = choice === undefined ? videos[0]?.key ?? null : choice
  const backdrop = details?.backdropPath ? imageUrl(details.backdropPath, isDesktop ? 'w1280' : 'w780') : ''
  const text = details?.overview || overview || ''
  const meta = metaLine(kind, details, year)
  const playingVideo = videos.find(v => v.key === playing)
  // Nothing to show up top (no art, no trailer, nothing loading): skip the 16:9 block.
  const hasArt = !!playing || !!backdrop || !!posterPath || videos.length > 0 || (!details && !failed)

  const play = (key: string) => {
    setChoice(key)
    scrollToTop()
  }

  return (
    <>
      {/* While a trailer plays, a slim bar keeps the close button off YouTube's own controls. */}
      {playing && (
        <div className="flex h-[60px] items-center gap-3 pl-4 pr-16 md:h-[68px] md:pl-6">
          <span className="min-w-0 truncate text-[13px] font-medium text-muted">
            <span className="font-semibold text-ink">{playingVideo ? videoLabel(playingVideo) : 'Trailer'}</span>
            {playingVideo?.name ? ` · ${playingVideo.name}` : ''}
          </span>
          <button type="button" onClick={() => setChoice(null)} className="ml-auto h-8 shrink-0 rounded-full bg-surface-3 px-3 text-xs font-semibold text-ink transition-colors hover:bg-white/15">
            Stop
          </button>
        </div>
      )}

      {/* Artwork / trailer */}
      {!hasArt && <div className="h-16 md:h-[72px]" aria-hidden="true" />}
      {hasArt && <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
        {playing ? (
          <iframe
            key={playing}
            src={embedUrl(playing)}
            title={`${title} ${playingVideo ? videoLabel(playingVideo).toLowerCase() : 'trailer'}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <>
            {posterPath && !backdropLoaded && (
              <img src={posterUrl(posterPath, 'w185')} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-50 blur-2xl" />
            )}
            {!details && !failed && <span className="skeleton absolute inset-0 opacity-60" />}
            {backdrop && (
              <img
                src={backdrop}
                alt=""
                onLoad={() => setBackdropLoaded(true)}
                className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${backdropLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/20 to-transparent" />
            {videos[0] && (
              <button
                type="button"
                onClick={() => play(videos[0].key)}
                className="group absolute inset-0 grid place-items-center focus-visible:outline-none"
                aria-label={`Play ${videoLabel(videos[0]).toLowerCase()}`}
              >
                <span className="grid size-14 place-items-center rounded-full bg-white/90 pl-1 text-canvas shadow-[0_6px_20px_rgb(0_0_0/0.4)] transition-transform duration-200 ease-out-soft group-hover:scale-110 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-accent md:size-16">
                  <Icon name="play" size={24} />
                </span>
              </button>
            )}
            {videos[0] && (
              <span className="glass-dark pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11.5px] font-semibold md:left-4 md:top-4">
                {videoLabel(videos[0])}
              </span>
            )}
          </>
        )}
      </div>}

      {/* Title and facts */}
      <div className={`relative flex flex-col gap-5 px-5 pb-7 md:px-7 ${playing ? 'pt-5' : hasArt ? '-mt-10 md:-mt-14' : ''}`}>
        <div className="flex flex-col gap-2">
          <TitleLogo
            logoPath={details?.logoPath}
            title={details?.title || title}
            textClassName="text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance md:text-[34px]"
            logoClassName="max-h-14 max-w-[min(70%,320px)] md:max-h-20"
          />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-muted">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-faint" aria-hidden="true">·</span>}
                {m}
              </span>
            ))}
            {details?.rating && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-ink">
                <Icon name="star" size={11} className="text-warn" />
                {details.rating}
              </span>
            )}
          </p>
        </div>

        {text && (
          <div>
            <p className={`max-w-[68ch] text-[14.5px] leading-relaxed text-muted ${moreText ? '' : 'line-clamp-3'}`} dir="auto">{text}</p>
            {text.length > 200 && (
              <button type="button" onClick={() => setMoreText(m => !m)} className="mt-1 text-[13px] font-semibold text-ink hover:text-accent">
                {moreText ? 'Less' : 'More'}
              </button>
            )}
          </div>
        )}

        {children}

        {videos.length > 1 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold">Trailers & teasers</h3>
            <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:-mx-7 md:px-7">
              {videos.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => play(v.key)}
                  className="group flex w-[200px] shrink-0 snap-start flex-col gap-1.5 text-left"
                >
                  <span className={`relative block aspect-video overflow-hidden rounded-[9px] bg-surface-2 ${v.key === playing ? 'ring-2 ring-accent' : ''}`}>
                    <img src={videoThumbUrl(v.key)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 ease-out-soft group-hover:scale-105" />
                    <span className="glass-dark absolute bottom-2 left-2 grid size-7 place-items-center rounded-full pl-0.5">
                      <Icon name="play" size={12} />
                    </span>
                  </span>
                  <span className="truncate text-[13px] font-semibold">{v.name || `${title} ${videoLabel(v).toLowerCase()}`}</span>
                  <span className="text-xs text-faint">{videoLabel(v)}{v.iso_639_1 && v.iso_639_1 !== 'en' ? ` · ${v.iso_639_1.toUpperCase()}` : ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.themoviedb.org/${kind}/${id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            TMDB <Icon name="external" size={12} />
          </a>
          {details?.imdbId && (
            <a
              href={`https://www.imdb.com/title/${details.imdbId}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              IMDb <Icon name="external" size={12} />
            </a>
          )}
        </div>
      </div>
    </>
  )
}
