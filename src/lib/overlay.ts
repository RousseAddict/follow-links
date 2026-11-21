// Open sheets form a stack. Each one adds a history entry so the phone's back
// gesture (or the browser back button) closes the top sheet instead of leaving the page.

const stack: number[] = []
let seq = 0
let pendingBack = 0
let locks = 0

export interface OverlayHandle {
  id: number
  depth: number
}

export function historyDepth(): number {
  const depth = (window.history.state as { flOverlay?: number } | null)?.flOverlay
  return typeof depth === 'number' ? depth : 0
}

export function openOverlay(): OverlayHandle {
  const id = ++seq
  stack.push(id)
  const depth = stack.length
  // Keep the router's own state (key, idx) so it treats the entry as the same page.
  window.history.pushState({ ...(window.history.state ?? {}), flOverlay: depth }, '')
  lockScroll()
  return { id, depth }
}

/** Remove a sheet from the stack and drop its history entry if it is still there. */
export function closeOverlay({ id, depth }: OverlayHandle) {
  const i = stack.indexOf(id)
  if (i >= 0) stack.splice(i, 1)
  unlockScroll()
  if (historyDepth() >= depth) {
    // Several sheets can close in the same tick: go back once by the total.
    pendingBack++
    if (pendingBack === 1) {
      queueMicrotask(() => {
        const n = pendingBack
        pendingBack = 0
        window.history.go(-n)
      })
    }
  }
}

export function isTopOverlay(id: number): boolean {
  return stack[stack.length - 1] === id
}

function lockScroll() {
  locks++
  if (locks !== 1) return
  const root = document.documentElement
  const gap = window.innerWidth - root.clientWidth
  root.style.overflow = 'hidden'
  if (gap > 0) root.style.paddingRight = `${gap}px`
}

function unlockScroll() {
  locks = Math.max(0, locks - 1)
  if (locks !== 0) return
  const root = document.documentElement
  root.style.overflow = ''
  root.style.paddingRight = ''
}
