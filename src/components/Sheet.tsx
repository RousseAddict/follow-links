import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent as ReactTouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { openOverlay, closeOverlay, historyDepth, isTopOverlay } from '../lib/overlay'
import { IconButton } from './ui'

interface SheetContextValue {
  close: () => void
  scrollToTop: () => void
}

const SheetCtx = createContext<SheetContextValue>({ close: () => {}, scrollToTop: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useSheet() {
  return useContext(SheetCtx)
}

interface Props {
  label: string
  onClose: () => void
  children: ReactNode
  /** Fixed area above the scrolling content (title bar). */
  header?: ReactNode
  /** Fixed area below the scrolling content (save button). */
  footer?: ReactNode
  size?: 'md' | 'lg'
  /** Round glass close button floating over the top-right corner (for sheets that open on artwork). */
  floatingClose?: boolean
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet on phones (swipe down to close), centred dialog from 768px up.
 * Closes with Escape, the back gesture, a tap outside or `useSheet().close()`.
 */
export function Sheet({ label, onClose, children, header, footer, size = 'md', floatingClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const drag = useRef<{ startY: number; lastY: number; lastT: number; v: number; dy: number; active: boolean } | null>(null)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const panel = panelRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!panel || reduce) { onCloseRef.current(); return }
    const desktop = window.matchMedia('(min-width: 768px)').matches
    const ms = desktop ? 160 : 240
    panel.style.transition = desktop
      ? `opacity ${ms}ms cubic-bezier(.4,0,1,1), transform ${ms}ms cubic-bezier(.4,0,1,1)`
      : `transform ${ms}ms cubic-bezier(.4,0,1,1)`
    panel.style.transform = desktop ? 'translateY(8px) scale(.98)' : 'translateY(100%)'
    if (desktop) panel.style.opacity = '0'
    if (backdropRef.current) backdropRef.current.style.opacity = '0'
    window.setTimeout(() => onCloseRef.current(), ms)
  }, [])

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const handle = openOverlay()
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })

    const onPop = () => { if (historyDepth() < handle.depth) close() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopOverlay(handle.id)) {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      closeOverlay(handle)
      previous?.focus?.({ preventScroll: true })
    }
  }, [close])

  // Keep Tab inside the sheet.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
    if (items.length === 0) { e.preventDefault(); return }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  // Swipe down to close (phones only): from the handle, or from the content when it is scrolled to the top.
  const onTouchStart = (e: ReactTouchEvent) => {
    if (window.matchMedia('(min-width: 768px)').matches || closingRef.current) return
    const fromHandle = (e.target as HTMLElement).closest('[data-sheet-handle]')
    if (!fromHandle && (scrollRef.current?.scrollTop ?? 0) > 0) return
    const y = e.touches[0].clientY
    drag.current = { startY: y, lastY: y, lastT: e.timeStamp, v: 0, dy: 0, active: false }
  }
  const onTouchMove = (e: ReactTouchEvent) => {
    const d = drag.current
    const panel = panelRef.current
    if (!d || !panel) return
    const y = e.touches[0].clientY
    const dy = y - d.startY
    if (!d.active) {
      if (dy < -6) { drag.current = null; return }
      if (dy < 6) return
      d.active = true
      panel.style.transition = 'none'
    }
    d.v = (y - d.lastY) / Math.max(1, e.timeStamp - d.lastT)
    d.lastY = y
    d.lastT = e.timeStamp
    d.dy = Math.max(0, dy)
    panel.style.transform = `translateY(${d.dy}px)`
  }
  const onTouchEnd = () => {
    const d = drag.current
    const panel = panelRef.current
    drag.current = null
    if (!d?.active || !panel) return
    if (d.dy > 120 || d.v > 0.6) { close(); return }
    panel.style.transition = 'transform 280ms cubic-bezier(.22,1,.36,1)'
    panel.style.transform = ''
  }

  return createPortal(
    <SheetCtx.Provider value={{ close, scrollToTop }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
        <div ref={backdropRef} className="sheet-backdrop absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className={`sheet-panel relative flex max-h-[calc(100dvh_-_env(safe-area-inset-top,0px)_-_16px)] w-full flex-col overflow-hidden rounded-t-sheet bg-surface-1 shadow-modal outline-none md:max-h-[min(88dvh,920px)] md:rounded-sheet ${size === 'lg' ? 'md:max-w-[760px]' : 'md:max-w-[560px]'}`}
        >
          <div data-sheet-handle className="absolute inset-x-0 top-0 z-30 flex h-6 justify-center pt-2 md:hidden" aria-hidden="true">
            <span className="h-[5px] w-10 rounded-full bg-white/40" />
          </div>
          {floatingClose && (
            <IconButton icon="x" label="Close" variant="glass-dark" size="sm" onClick={close} className="absolute right-3 top-3 z-30 md:right-4 md:top-4" />
          )}
          {header}
          <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${footer ? '' : 'pad-safe-bottom'}`}>
            {children}
          </div>
          {footer && <div className="pad-safe-bottom shrink-0 border-t border-line bg-surface-1">{footer}</div>}
        </div>
      </div>
    </SheetCtx.Provider>,
    document.body,
  )
}

/** Standard title bar for form-style sheets. */
export function SheetHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  const { close } = useSheet()
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-6 md:pt-5">
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.014em]">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      <IconButton icon="x" label="Close" size="sm" variant="secondary" onClick={close} className="-mr-1 -mt-1" />
    </div>
  )
}
