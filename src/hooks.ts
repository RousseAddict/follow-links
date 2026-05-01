import { useState, type Dispatch, type SetStateAction } from 'react'
import { useSettings } from './contexts/settings'
import { setStore } from './lib/store'
import type { SyncResult } from './types'

export function patchImdbId<T extends { id: number; imdbId?: string }>(
  itemId: number,
  fetch: Promise<string | null>,
  setState: Dispatch<SetStateAction<T[]>>,
  storeKey: string,
): void {
  fetch
    .then(imdbId => {
      if (!imdbId) return
      setState(prev => {
        const next = prev.map(item => item.id === itemId ? { ...item, imdbId } : item)
        setStore(storeKey, next)
        return next
      })
    })
    .catch(e => console.warn(`[follow-links] Failed to fetch IMDB ID for item ${itemId}:`, e))
}

export function useSyncFromJellyfin() {
  const { settings } = useSettings()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult>(null)

  const sync = async (operation: () => Promise<string>) => {
    if (!settings.jellyfinUrl || !settings.jellyfinApiKey) {
      setSyncResult({ ok: false, message: 'Set Jellyfin URL and API key in Settings first' })
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      const message = await operation()
      setSyncResult({ ok: true, message })
    } catch (e) {
      setSyncResult({ ok: false, message: e instanceof Error ? `Sync failed: ${e.message}` : 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  return { syncing, syncResult, sync }
}
