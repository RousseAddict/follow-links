import { useEffect, useState } from 'react'

export interface SearchState<T> {
  results: T[]
  searching: boolean
  error: string
}

/** Runs `search` for each settled query; results always belong to the current query. */
export function useTmdbSearch<T>(query: string, search: (q: string) => Promise<T[]>, hasKey: boolean): SearchState<T> {
  const [state, setState] = useState<{ query: string; results: T[]; error: string }>({ query: '', results: [], error: '' })

  useEffect(() => {
    if (!query || !hasKey) return
    let live = true
    search(query)
      .then(results => { if (live) setState({ query, results, error: '' }) })
      .catch(() => { if (live) setState({ query, results: [], error: 'Search failed. Check your TMDB API key in Settings.' }) })
    return () => { live = false }
  }, [query, search, hasKey])

  if (!query) return { results: [], searching: false, error: '' }
  if (!hasKey) return { results: [], searching: false, error: 'Add your TMDB API key in Settings to search.' }
  const current = state.query === query
  return { results: current ? state.results : [], searching: !current, error: current ? state.error : '' }
}
