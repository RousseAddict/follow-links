import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SORT_OPTIONS, type Filter, type Sort } from '../lib/library'
import { Icon } from './Icon'
import { PosterSkeleton } from './PosterCard'
import { IconButton, SectionTitle } from './ui'

const FILTERS: { value: Filter; label: string; dot?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wanted', label: 'Wanted', dot: 'bg-wanted' },
  { value: 'downloading', label: 'Downloading', dot: 'bg-downloading' },
  { value: 'downloaded', label: 'Downloaded', dot: 'bg-downloaded' },
]

interface ToolbarProps {
  title: string
  total: number
  noun: [string, string]
  filter: Filter
  onFilter: (f: Filter) => void
  counts: Record<Filter, number>
  sort: Sort
  onSort: (s: Sort) => void
}

export function LibraryToolbar({ title, total, noun, filter, onFilter, counts, sort, onSort }: ToolbarProps) {
  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort'
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="mr-auto">
        <SectionTitle count={`${total} ${total === 1 ? noun[0] : noun[1]}`}>{title}</SectionTitle>
      </div>

      <label className="relative inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-1 hover:text-ink lg:order-3">
        <span className="sr-only">Sort by</span>
        {sortLabel}
        <Icon name="chevron-down" size={14} />
        <select
          value={sort}
          onChange={e => onSort(e.target.value as Sort)}
          className="absolute inset-0 cursor-pointer appearance-none opacity-0"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <div role="radiogroup" aria-label="Filter by status" className="no-scrollbar bleed-x flex w-full gap-1.5 overflow-x-auto lg:order-2 lg:m-0 lg:w-auto lg:p-0">
        {FILTERS.map(f => {
          const on = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onFilter(f.value)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 ${on ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface-1 text-muted hover:border-line-strong hover:text-ink'}`}
            >
              {f.dot && <span className={`size-2 rounded-full ${f.dot}`} />}
              {f.label}
              <span className={`font-semibold ${on ? 'text-canvas/60' : 'text-faint'}`}>{counts[f.value]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Library grid: 3 columns on phones, fluid poster columns from tablet up. */
export function PosterGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-x-4 sm:gap-y-6 lg:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
      {children}
    </div>
  )
}

interface ResultsProps {
  query: string
  searching: boolean
  error: string
  count: number
  children: ReactNode
}

/** Search results as a horizontal rail (arrows on desktop, swipe on phones). */
export function SearchResults({ query, searching, error, count, children }: ResultsProps) {
  const rail = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  // Arrows only when the rail actually overflows, each one disabled at its end.
  useEffect(() => {
    const el = rail.current
    if (!el) return
    const update = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    const frame = requestAnimationFrame(update)
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [searching, count])

  const scroll = (dir: 1 | -1) => {
    const el = rail.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <section className="animate-fade-in flex flex-col gap-3" aria-busy={searching}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle count={searching ? 'Searching…' : error ? undefined : `${count} result${count === 1 ? '' : 's'}`}>
          <span className="truncate">Results for “{query}”</span>
        </SectionTitle>
        {!searching && (edges.left || edges.right) && (
          <div className="hidden gap-1.5 md:flex">
            <IconButton icon="chevron-left" label="Scroll left" size="sm" variant="secondary" disabled={!edges.left} onClick={() => scroll(-1)} />
            <IconButton icon="chevron-right" label="Scroll right" size="sm" variant="secondary" disabled={!edges.right} onClick={() => scroll(1)} />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-fail">{error}</p>}
      {!error && !searching && count === 0 && <p className="text-sm text-muted">No matches on TMDB. Try the original title or fewer words.</p>}
      {(searching || count > 0) && (
        <div ref={rail} className="no-scrollbar bleed-x flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 md:gap-4">
          {searching
            ? Array.from({ length: 8 }, (_, i) => <div key={i} className="w-[30vw] max-w-[150px] shrink-0 sm:w-[150px]"><PosterSkeleton compact /></div>)
            : children}
        </div>
      )}
    </section>
  )
}

export function RailItem({ children }: { children: ReactNode }) {
  return <div className="w-[30vw] max-w-[150px] shrink-0 snap-start sm:w-[150px] md:w-[160px] md:max-w-[160px]">{children}</div>
}
