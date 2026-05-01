import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getStore, setStore, KEYS, SETTING_DEFAULTS } from '../lib/store'
import type { Settings } from '../types'

interface SettingsContextValue {
  settings: Settings
  saveSettings: (next: Settings) => void
}

const Ctx = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => getStore(KEYS.settings, SETTING_DEFAULTS))

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next)
    setStore(KEYS.settings, next)
  }, [])

  return <Ctx.Provider value={{ settings, saveSettings }}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
