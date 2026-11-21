import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, Spinner, type IconName } from './Icon'
import type { MediaStatus } from '../types'
import { STATUS_LABEL } from '../lib/library'
import { STATUS_PILL } from '../constants'

// ── Buttons ──────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'white' | 'glass' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent-fill text-white hover:bg-accent-fill-hover',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-surface-3',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  white: 'bg-white text-canvas hover:bg-white/90',
  glass: 'glass hover:bg-white/25',
  danger: 'bg-fail/12 text-fail hover:bg-fail/20',
}

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, loading, className = '', children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out-soft active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  variant?: 'ghost' | 'glass' | 'glass-dark' | 'secondary' | 'primary'
  size?: 'sm' | 'md'
  iconSize?: number
}

const ICON_VARIANT = {
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  glass: 'glass hover:bg-white/25',
  'glass-dark': 'glass-dark hover:bg-black/60',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-surface-3',
  primary: 'bg-accent-fill text-white hover:bg-accent-fill-hover',
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', iconSize, className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-full transition-[transform,background-color,color] duration-150 ease-out-soft active:scale-[.92] disabled:cursor-not-allowed disabled:opacity-40 ${size === 'sm' ? 'size-9' : 'size-11'} ${ICON_VARIANT[variant]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (size === 'sm' ? 16 : 18)} />
    </button>
  )
}

// ── Status ───────────────────────────────────────────────────────────────────

const MARK: Record<MediaStatus, { cls: string; icon: IconName }> = {
  wanted: { cls: 'bg-wanted text-wanted-ink', icon: 'clock' },
  downloading: { cls: 'bg-downloading text-white', icon: 'download' },
  downloaded: { cls: 'bg-downloaded text-white', icon: 'check' },
}

/** Round status glyph that sits on a poster corner. */
export function StatusMark({ status, size = 24, className = '' }: { status: MediaStatus; size?: number; className?: string }) {
  const m = MARK[status]
  return (
    <span
      className={`grid place-items-center rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.22),0_2px_6px_rgb(0_0_0/0.3)] ${m.cls} ${className}`}
      style={{ width: size, height: size }}
      title={STATUS_LABEL[status]}
    >
      <Icon name={m.icon} size={Math.round(size * 0.55)} strokeWidth={status === 'downloaded' ? 3 : 2.6} />
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  )
}

export function StatusPill({ status, children }: { status: MediaStatus | 'unmonitored'; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ${STATUS_PILL[status]}`}>
      {children ?? (status === 'unmonitored' ? 'Not tracked' : STATUS_LABEL[status])}
    </span>
  )
}

export function ProgressBar({ pct, className = '', tone = 'downloading' }: { pct: number; className?: string; tone?: 'downloading' | 'white' }) {
  return (
    <span className={`block h-1 overflow-hidden rounded-full ${tone === 'white' ? 'bg-white/25' : 'bg-surface-3'} ${className}`}>
      <span
        className={`block h-full rounded-full transition-[width] duration-700 ease-out-soft ${tone === 'white' ? 'bg-white' : 'bg-downloading'}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

// ── Layout bits ──────────────────────────────────────────────────────────────

export function SectionTitle({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2.5 text-xl font-bold tracking-[-0.018em]">
      {children}
      {count !== undefined && <small className="text-[13px] font-medium tracking-normal text-faint">{count}</small>}
    </h2>
  )
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[15px] font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}
