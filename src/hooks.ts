import { useState } from 'react'
import { useSettings } from './contexts/settings'
import type { SyncResult } from './types'

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
