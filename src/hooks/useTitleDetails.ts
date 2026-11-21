import { useEffect, useState } from 'react'
import { getDetails, type TitleDetails, type TitleKind } from '../lib/tmdb'
import { useSettings } from '../contexts/settings'

// One request per title per session: in-flight requests are shared, finished ones are kept.
const pending = new Map<string, Promise<TitleDetails>>()
const done = new Map<string, TitleDetails>()

function load(key: string, kind: TitleKind, id: number, apiKey: string, language: string): Promise<TitleDetails> {
  let p = pending.get(key)
  if (!p) {
    p = getDetails(kind, id, apiKey, language)
      .then(d => { done.set(key, d); return d })
      .catch(e => { pending.delete(key); throw e })
    pending.set(key, p)
  }
  return p
}

export interface DetailsState {
  details: TitleDetails | null
  failed: boolean
}

export function useTitleDetails(kind: TitleKind, id: number | null | undefined): DetailsState {
  const { settings } = useSettings()
  const key = id && settings.tmdbApiKey ? `${kind}:${id}:${settings.language}` : ''
  const [state, setState] = useState<{ key: string; details: TitleDetails | null; failed: boolean }>({ key: '', details: null, failed: false })

  useEffect(() => {
    if (!key || !id || done.has(key)) return
    let live = true
    load(key, kind, id, settings.tmdbApiKey, settings.language)
      .then(details => { if (live) setState({ key, details, failed: false }) })
      .catch(() => { if (live) setState({ key, details: null, failed: true }) })
    return () => { live = false }
  }, [key, kind, id, settings.tmdbApiKey, settings.language])

  const cached = key ? done.get(key) : undefined
  if (cached) return { details: cached, failed: false }
  if (state.key === key) return { details: state.details, failed: state.failed }
  return { details: null, failed: !key }
}
