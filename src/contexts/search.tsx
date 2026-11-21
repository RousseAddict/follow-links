import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

type Scope = 'movies' | 'shows' | ''

interface SearchContextValue {
  /** What is typed in the field right now. */
  value: string
  setValue: (v: string) => void
  /** The settled query (debounced and trimmed) that pages search for. */
  query: string
  clear: () => void
  scope: Scope
  placeholder: string
}

const Ctx = createContext<SearchContextValue | null>(null)

const PLACEHOLDER: Record<Scope, string> = {
  movies: 'Search movies to add…',
  shows: 'Search TV shows to add…',
  '': '',
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const scope: Scope = pathname.startsWith('/movies') ? 'movies' : pathname.startsWith('/shows') ? 'shows' : ''
  // Each page keeps its own search, so switching tabs and back keeps what you typed.
  const [values, setValues] = useState<Record<string, string>>({})
  const [queries, setQueries] = useState<Record<string, string>>({})
  const value = values[scope] ?? ''

  useEffect(() => {
    const next = value.trim()
    const t = setTimeout(() => setQueries(q => (q[scope] === next ? q : { ...q, [scope]: next })), 400)
    return () => clearTimeout(t)
  }, [value, scope])

  const setValue = useCallback((v: string) => {
    setValues(s => ({ ...s, [scope]: v }))
    if (!v.trim()) setQueries(q => ({ ...q, [scope]: '' }))
  }, [scope])

  const clear = useCallback(() => setValue(''), [setValue])

  // "/" jumps to the search field, like most media apps.
  useEffect(() => {
    if (!scope) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const field = Array.from(document.querySelectorAll<HTMLInputElement>('[data-search-input]')).find(el => el.offsetParent !== null)
      if (!field) return
      e.preventDefault()
      field.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scope])

  const ctx = useMemo<SearchContextValue>(() => ({
    value,
    setValue,
    query: queries[scope] ?? '',
    clear,
    scope,
    placeholder: PLACEHOLDER[scope],
  }), [value, setValue, queries, scope, clear])

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch(): SearchContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSearch must be used within SearchProvider')
  return ctx
}
