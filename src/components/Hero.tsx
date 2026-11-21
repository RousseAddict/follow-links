import { useCallback, useEffect, useRef, useState } from 'react'
import { useTitleDetails } from '../hooks/useTitleDetails'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { imageUrl, posterUrl, type TitleKind } from '../lib/tmdb'
import { PREVIEW_DELAY_MS, embedUrl, playerCommand, playerListen, previewAllowed, readPlayerMessage } from '../lib/trailer'
import { formatRuntime } from '../lib/library'
import { getStore, setStore, KEYS } from '../lib/store'
import { TitleLogo } from './TitleLogo'
import { PosterImage } from './PosterCard'
import { Button, IconButton } from './ui'
import type { IconName } from './Icon'
import type { MediaStatus } from '../types'

interface Action {
  label: string
  icon: IconName
  onClick: () => void
}

interface Props {
  kind: TitleKind
  id: number
  title: string
  year?: string
  overview?: string
  posterPath: string
  status: MediaStatus | null
  /** Short line in the top pill, e.g. "Wanted · added yesterday". */
  badge: string
  primary?: Action
  onTrailer: () => void
  onDetails: () => void
  /** Stop the muted preview (a sheet is open on top). */
  paused?: boolean
}

const DOT: Record<MediaStatus, string> = {
  wanted: 'bg-wanted',
  downloading: 'bg-downloading',
  downloaded: 'bg-downloaded',
}

type PreviewState = 'playing' | 'ended' | 'error'

/** Muted, chrome-less trailer behind the hero text. Reports when it really starts playing. */
function HeroPreview({ videoKey, muted, visible, onState }: { videoKey: string; muted: boolean; visible: boolean; onState: (s: PreviewState) => void }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const ev = readPlayerMessage(e, ref.current)
      if (!ev) return
      if (ev.kind === 'error') onState('error')
      else if (ev.state === 1) onState('playing')
      else if (ev.state === 0) onState('ended')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onState])

  useEffect(() => {
    if (loaded.current) playerCommand(ref.current, muted ? 'mute' : 'unMute')
  }, [muted])

  const onLoad = () => {
    // The player only reports its state once asked; ask a few times while it boots.
    const frame = ref.current
    loaded.current = true
    playerListen(frame)
    window.setTimeout(() => playerListen(frame), 400)
    window.setTimeout(() => playerListen(frame), 1500)
  }

  return (
    <div className={`absolute inset-0 overflow-hidden transition-opacity duration-[900ms] ease-[cubic-bezier(.65,0,.35,1)] [container-type:size] ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <iframe
        ref={ref}
        src={embedUrl(videoKey, { preview: true })}
        onLoad={onLoad}
        title="Trailer preview"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 scale-[1.2] border-0"
      />
    </div>
  )
}

export function Hero({ kind, id, title, year, overview, posterPath, status, badge, primary, onTrailer, onDetails, paused }: Props) {
  const { details } = useTitleDetails(kind, id)
  const isDesktop = useIsDesktop()
  const [collapsed, setCollapsed] = useState(() => getStore<boolean>(KEYS.heroCollapsed, false))
  const [backdropLoaded, setBackdropLoaded] = useState<string>('')
  const [allowed] = useState(previewAllowed)
  const [inView, setInView] = useState(true)
  const [armed, setArmed] = useState<string | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [finished, setFinished] = useState<string[]>([])
  const [muted, setMuted] = useState(true)
  const rootRef = useRef<HTMLElement>(null)

  const trailerKey = details?.videos[0]?.key ?? null
  const backdrop = details?.backdropPath ? imageUrl(details.backdropPath, isDesktop ? 'w1280' : 'w780') : ''
  const text = details?.overview || overview || ''
  const meta = [
    details?.year || year,
    kind === 'movie' ? formatRuntime(details?.runtime ?? null) : details?.seasonCount ? `${details.seasonCount} season${details.seasonCount === 1 ? '' : 's'}` : '',
    details?.genres.slice(0, 2).join(' · '),
  ].filter(Boolean).join(' · ')

  const toggleCollapsed = () => {
    setStore(KEYS.heroCollapsed, !collapsed)
    setCollapsed(!collapsed)
  }

  // Only preview while the hero is on screen.
  useEffect(() => {
    const el = rootRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.4), { threshold: [0, 0.4, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [collapsed])

  const active = allowed && !!trailerKey && !paused && inView && !collapsed && !finished.includes(trailerKey)

  useEffect(() => {
    if (!active || !trailerKey) return
    const t = window.setTimeout(() => {
      setPreviewPlaying(false)
      setArmed(trailerKey)
    }, PREVIEW_DELAY_MS)
    return () => {
      window.clearTimeout(t)
      setArmed(null)
    }
  }, [active, trailerKey])

  const onPreviewState = useCallback((s: PreviewState) => {
    if (s === 'playing') setPreviewPlaying(true)
    else {
      // Play once, then settle back on the backdrop.
      setPreviewPlaying(false)
      setFinished(f => (trailerKey && !f.includes(trailerKey) ? [...f, trailerKey] : f))
    }
  }, [trailerKey])

  const showFrame = active && armed === trailerKey && !!trailerKey
  const videoVisible = showFrame && previewPlaying

  // A billboard needs art; without a backdrop or a poster, the compact card reads better.
  // Decided up front from the poster, so a title with no art never flashes an empty billboard first.
  const noArt = !posterPath && !details?.backdropPath

  if (collapsed || noArt) {
    return (
      <section className="animate-fade-in flex items-center gap-3 rounded-panel border border-line bg-surface-1 p-2.5 pr-3 md:gap-4 md:p-3 md:pr-4">
        <button type="button" onClick={onDetails} className="flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4">
          <span className="relative block aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 md:w-14">
            <PosterImage path={posterPath} title={title} size="w154" lazy={false} thumb />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-faint">
              {status && <span className={`size-1.5 rounded-full ${DOT[status]}`} />}
              {badge}
            </span>
            <span className="block truncate text-[15px] font-semibold">{title}</span>
            {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
          </span>
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          {primary && <Button variant="primary" size="sm" icon={primary.icon} onClick={primary.onClick}>{primary.label}</Button>}
          {trailerKey && <Button variant="secondary" size="sm" icon="play" onClick={onTrailer}>Trailer</Button>}
        </div>
        {!noArt && <IconButton icon="expand" label="Show the featured title" size="sm" onClick={toggleCollapsed} />}
      </section>
    )
  }

  return (
    <section
      ref={rootRef}
      className="animate-fade-in relative isolate flex min-h-[clamp(360px,100vw,480px)] flex-col justify-end overflow-hidden rounded-[18px] bg-surface-1 text-white md:min-h-[clamp(300px,min(40vw,72svh),580px)] md:rounded-hero"
    >
      {/* Art */}
      <div className="absolute inset-0 -z-10">
        {posterPath && backdropLoaded !== backdrop && (
          <img src={posterUrl(posterPath, 'w185')} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-3xl" />
        )}
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            fetchPriority="high"
            onLoad={() => setBackdropLoaded(backdrop)}
            className={`absolute inset-0 size-full object-cover object-[center_25%] transition-opacity duration-700 ${backdropLoaded === backdrop ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {showFrame && trailerKey && (
          <HeroPreview videoKey={trailerKey} muted={muted} visible={videoVisible} onState={onPreviewState} />
        )}
        <div className={`hero-shade absolute inset-0 transition-opacity duration-500 ${videoVisible ? 'opacity-85' : 'opacity-100'}`} />
      </div>

      {/* Top strip */}
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 md:inset-x-7 md:top-6">
        <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
          {status && <span className={`size-2 rounded-full ${DOT[status]}`} />}
          {badge}
        </span>
        <IconButton icon="collapse" label="Make the featured title smaller" variant="glass-dark" size="sm" onClick={toggleCollapsed} />
      </div>

      {/* Words and actions */}
      <div className="flex w-full flex-col gap-3 p-5 pt-20 md:w-[min(620px,80%)] md:gap-3.5 md:p-8 md:pt-24 lg:w-[min(600px,60%)] lg:p-10 lg:pt-28 [@media(max-height:520px)]:pt-16">
        <TitleLogo
          logoPath={details?.logoPath}
          title={title}
          as="h2"
          textClassName="text-shadow-art text-[34px] font-extrabold leading-[0.98] tracking-[-0.035em] text-balance md:text-[clamp(40px,4.6vw,64px)]"
          logoClassName="max-h-[72px] max-w-[min(80%,360px)] md:max-h-[clamp(80px,9vw,140px)] md:max-w-[min(100%,460px)]"
        />
        {meta && <p className="text-shadow-art text-sm font-semibold text-white/90 md:text-[15px]">{meta}</p>}
        {text && <p className="text-shadow-art line-clamp-2 max-w-[60ch] text-sm leading-relaxed text-white/85 md:line-clamp-3 md:text-[15px] [@media(max-height:520px)]:hidden">{text}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          {primary && (
            <Button variant="primary" icon={primary.icon} onClick={primary.onClick} className="max-sm:basis-full">
              {primary.label}
            </Button>
          )}
          {trailerKey && <Button variant="white" icon="play" onClick={onTrailer} className="max-sm:flex-1">Trailer</Button>}
          <Button variant="glass" onClick={onDetails} className="max-sm:flex-1">Details</Button>
        </div>
      </div>

      {videoVisible && (
        <IconButton
          icon={muted ? 'volume-off' : 'volume-on'}
          label={muted ? 'Turn sound on' : 'Turn sound off'}
          variant="glass-dark"
          size="sm"
          onClick={() => setMuted(m => !m)}
          className="absolute bottom-5 right-5 md:bottom-7 md:right-7"
        />
      )}
    </section>
  )
}
