import { NavLink } from 'react-router-dom'
import { useLibrary } from '../contexts/library'
import type { SyncStatus } from '../lib/library-store'
import { useSearch } from '../contexts/search'
import { Icon, type IconName } from './Icon'
import { IconButton } from './ui'

const SYNC: Record<SyncStatus, { cls: string; title: string } | null> = {
  idle: null,
  syncing: { cls: 'bg-warn animate-pulse', title: 'Syncing library…' },
  ok: { cls: 'bg-ok shadow-[0_0_0_3px_rgb(48_209_88/0.18)]', title: 'Library synced' },
}

export function SyncDot() {
  const { syncStatus } = useLibrary()
  const s = SYNC[syncStatus]
  if (!s) return null
  return <span className={`size-2 shrink-0 rounded-full ${s.cls}`} title={s.title} role="img" aria-label={s.title} />
}

/** Titles currently downloading (movies + seasons), shown as a badge on Queue. */
function useDownloadingCount(): number {
  const { movies, shows } = useLibrary()
  return movies.filter(m => m.status === 'downloading').length +
    shows.reduce((n, s) => n + (s.seasons ?? []).filter(se => se.status === 'downloading').length, 0)
}

function Badge({ n, className = '' }: { n: number; className?: string }) {
  if (!n) return null
  return <span className={`rounded-full bg-downloading px-1.5 py-[3px] text-[10.5px] font-bold leading-none text-white ${className}`}>{n}</span>
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.02em]">
      <span className="grid size-7 place-items-center rounded-[9px] border border-line bg-surface-2 text-accent">
        <Icon name="play" size={13} />
      </span>
      <span className={compact ? 'hidden lg:inline' : ''}>follow-links</span>
    </span>
  )
}

export function SearchField({ className = '' }: { className?: string }) {
  const { value, setValue, placeholder } = useSearch()
  return (
    <div className={`relative flex items-center ${className}`}>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 text-faint" />
      <input
        data-search-input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setValue(''); e.currentTarget.blur() } }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full min-w-0 text-ellipsis rounded-full border border-line bg-surface-1 pl-10 pr-10 text-sm text-ink outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:bg-surface-2 focus:shadow-[0_0_0_3px_rgb(255_69_58/0.25)] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 grid size-7 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"
        >
          <Icon name="x" size={14} strokeWidth={2.5} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3.5 hidden rounded-[5px] border border-line-strong px-1.5 py-0.5 text-[11px] font-medium leading-none text-faint lg:block">/</kbd>
      )}
    </div>
  )
}

const NAV: { to: string; label: string; short: string; icon: IconName }[] = [
  { to: '/movies', label: 'Movies', short: 'Movies', icon: 'film' },
  { to: '/shows', label: 'TV Shows', short: 'Shows', icon: 'tv' },
  { to: '/queue', label: 'Queue', short: 'Queue', icon: 'queue' },
]

/** Desktop: sticky glass bar with nav, search and settings. */
export function TopBar({ onSettings }: { onSettings: () => void }) {
  const downloading = useDownloadingCount()
  const { scope } = useSearch()
  return (
    <header className="pad-safe-top sticky top-0 z-40 hidden border-b border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150 md:block">
      <div className="px-gutter mx-auto flex h-16 max-w-[1600px] items-center gap-3 lg:gap-5">
        <NavLink to="/movies" aria-label="follow-links home" className="shrink-0"><Brand compact /></NavLink>
        <nav className="flex shrink-0 gap-0.5 rounded-full border border-line bg-surface-1 p-[3px]" aria-label="Main">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-9 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-150 lg:px-4 ${isActive ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink'}`}
            >
              {item.label}
              {item.to === '/queue' && <Badge n={downloading} />}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 lg:gap-4">
          {scope && <SearchField className="w-full max-w-[400px]" />}
          <SyncDot />
          <IconButton icon="gear" label="Settings" onClick={onSettings} />
        </div>
      </div>
    </header>
  )
}

/** Phones: tab bar within thumb reach. */
export function TabBar({ onSettings }: { onSettings: () => void }) {
  const downloading = useDownloadingCount()
  const tab = 'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors'
  return (
    <nav
      aria-label="Main"
      className="pad-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-1/85 backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <div className="flex h-[var(--tabbar-h)] px-[max(8px,env(safe-area-inset-left,0px))]">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `${tab} ${isActive ? 'text-accent' : 'text-faint active:text-muted'}`}>
            <Icon name={item.icon} size={23} strokeWidth={1.9} />
            {item.short}
            {item.to === '/queue' && <Badge n={downloading} className="absolute left-1/2 top-1.5 ml-1.5" />}
          </NavLink>
        ))}
        <button type="button" onClick={onSettings} className={`${tab} text-faint active:text-muted`}>
          <Icon name="gear" size={23} strokeWidth={1.9} />
          Settings
        </button>
      </div>
    </nav>
  )
}

/** Phones: large page title (and search for library pages). Desktop shows these in the top bar. */
export function PageHeader({ title, search }: { title: string; search?: boolean }) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.025em]">{title}</h1>
        <SyncDot />
      </div>
      {search && <SearchField />}
    </div>
  )
}
