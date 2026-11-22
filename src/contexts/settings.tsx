import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { setStore, KEYS, loadSettings, settingsOverrides } from '../lib/store'
import type { Settings } from '../types'

interface SettingsContextValue {
  settings: Settings
  saveSettings: (next: Settings) => void
}

const Ctx = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Settings stay on this device. Shared values belong in config.js (env vars on the container).
  const saveSettings = useCallback((next: Settings) => {
    setSettings(next)
    setStore(KEYS.settings, settingsOverrides(next))
  }, [])

  return <Ctx.Provider value={{ settings, saveSettings }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
