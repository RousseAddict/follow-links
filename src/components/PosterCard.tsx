import { useState } from 'react'
import { posterUrl } from '../lib/tmdb'
import { Icon, Spinner, type IconName } from './Icon'
import { StatusMark, ProgressBar } from './ui'
import type { MediaStatus } from '../types'

export interface CardAction {
  icon: IconName | 'spinner'
  label: string
  onClick?: () => void
  /** Solid red (add) instead of dark glass. */
  primary?: boolean
  /** Only on hover with a mouse; hidden on touch screens where the card opens a sheet instead. */
  hoverOnly?: boolean
  disabled?: boolean
}

interface Props {
  title: string
  subtitle?: string
  posterPath: string
  status?: MediaStatus | null
  progress?: number
  highlighted?: boolean
  onOpen?: () => void
  action?: CardAction
  /** Smaller type for dense phone grids and rails. */
  compact?: boolean
  /** Lazy-load the poster (true for long grids). */
  lazy?: boolean
}

export function PosterImage({ path, title, size = 'w342', lazy = true, className = '', thumb = false }: { path: string; title: string; size?: string; lazy?: boolean; className?: string; /** Tiny thumbnail: an icon instead of the title when there is no poster. */ thumb?: boolean }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const src = posterUrl(path, size)
  if ((!src || state === 'error') && thumb) {
    return (
      <span className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-3 to-surface-1 text-faint ${className}`}>
        <Icon name="film" size={18} />
      </span>
    )
  }
  if (!src || state === 'error') {
    return (
      <span className={`absolute inset-0 flex items-end bg-gradient-to-br from-surface-3 to-surface-1 p-3 ${className}`}>
        <span className="line-clamp-4 text-[13px] font-bold leading-tight tracking-tight text-muted [overflow-wrap:anywhere]">{title}</span>
      </span>
    )
  }
  return (
    <>
      {state === 'loading' && <span className={`skeleton absolute inset-0 ${className}`} />}
      <img
        src={src}
        alt=""
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        className={`absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[360ms] ease-out-soft ${state === 'ok' ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </>
  )
}

export function PosterCard({ title, subtitle, posterPath, status, progress, highlighted, onOpen, action, compact, lazy = true }: Props) {
  const showProgress = status === 'downloading' && progress !== undefined
  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className="group/open block w-full rounded-card text-left focus-visible:outline-none"
        aria-label={subtitle ? `${title}, ${subtitle}` : title}
      >
        <span
          className={`relative mb-2 block aspect-[2/3] max-w-full overflow-hidden bg-surface-2 shadow-card transition-[transform,box-shadow] duration-[240ms] ease-out-soft group-focus-visible/open:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-accent)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-[3px] [@media(hover:hover)_and_(pointer:fine)]:group-hover:shadow-lift ${compact ? 'rounded-[10px]' : 'rounded-card'} ${highlighted ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''}`}
        >
          <PosterImage path={posterPath} title={title} lazy={lazy} className="[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]" />
          {status && <StatusMark status={status} size={compact ? 20 : 24} className={`absolute ${compact ? 'left-1.5 top-1.5' : 'left-2 top-2'}`} />}
          {showProgress && <ProgressBar pct={progress} tone="white" className={`absolute ${compact ? 'inset-x-1.5 bottom-1.5' : 'inset-x-2 bottom-2'}`} />}
        </span>
        <span className={`block truncate font-semibold ${compact ? 'text-[12.5px]' : 'text-[13.5px]'}`}>{title}</span>
        {subtitle && <span className={`block truncate font-medium text-faint ${compact ? 'text-[11.5px]' : 'text-xs'}`}>{subtitle}</span>}
      </button>

      {action && (
        // Same box as the artwork so the button sits on the poster's corner.
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[2/3]">
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.label}
            className={`pointer-events-auto absolute grid place-items-center rounded-full transition-[transform,opacity,background-color] duration-150 ease-out-soft active:scale-90 disabled:cursor-default ${showProgress ? 'bottom-5' : 'bottom-2'} right-2 ${compact ? 'size-8' : 'size-9'} ${action.primary ? 'bg-accent-fill text-white shadow-lg hover:bg-accent-fill-hover' : 'glass-dark hover:bg-black/65'} ${action.hoverOnly ? 'pointer-coarse:hidden [@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:scale-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100' : ''}`}
          >
            {action.icon === 'spinner' ? <Spinner size={15} /> : <Icon name={action.icon} size={compact ? 15 : 16} strokeWidth={2.6} />}
          </button>
        </div>
      )}
    </div>
  )
}

export function PosterSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="min-w-0" aria-hidden="true">
      <span className={`skeleton mb-2 block aspect-[2/3] ${compact ? 'rounded-[10px]' : 'rounded-card'}`} />
      <span className="skeleton mb-1.5 block h-3 w-4/5 rounded-full" />
      <span className="skeleton block h-2.5 w-2/5 rounded-full" />
    </div>
  )
}
