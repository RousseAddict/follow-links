import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Movies } from './pages/Movies'
import { Shows } from './pages/Shows'
import { Queue } from './pages/Queue'
import { SettingsModal } from './components/SettingsModal'
import { SettingsProvider } from './contexts/settings'
import { getStore, setStore, KEYS, SETTING_DEFAULTS, SCHEMA_VERSION } from './lib/store'
import type { Settings, ShowItem } from './types'

interface NavProps { onSettings: () => void }

function Nav({ onSettings }: NavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-2 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`

  return (
    <header className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 border-b border-gray-800">
      <span className="text-gray-100 font-semibold text-sm mr-2 sm:mr-4 shrink-0">follow-links</span>
      <NavLink to="/movies" className={linkClass}>Movies</NavLink>
      <NavLink to="/shows" className={linkClass}>TV Shows</NavLink>
      <NavLink to="/queue" className={linkClass}>Queue</NavLink>
      <button
        onClick={onSettings}
        className="ml-auto text-gray-500 hover:text-gray-300 shrink-0"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </header>
  )
}

function migrateData() {
  const version = getStore<number>(KEYS.schemaVersion, 0)

  if (version < 1) {
    const shows = getStore<ShowItem[]>(KEYS.shows, [])
    if (shows.some(s => !Array.isArray(s.seasons))) {
      setStore(KEYS.shows, shows.map(s => ({ ...s, seasons: s.seasons ?? [] })))
    }
  }

  if (version < SCHEMA_VERSION) {
    setStore(KEYS.schemaVersion, SCHEMA_VERSION)
  }
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/config.json')
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}))
      .then((fileSettings: unknown) => {
        const safe = fileSettings && typeof fileSettings === 'object' && !Array.isArray(fileSettings)
          ? fileSettings as Partial<Settings>
          : {}
        const stored = getStore<Partial<Settings>>(KEYS.settings, {})
        const raw = { ...SETTING_DEFAULTS, ...safe, ...stored }
        const merged = Object.fromEntries(
          (Object.keys(SETTING_DEFAULTS) as (keyof Settings)[]).map(k => [k, raw[k]])
        ) as unknown as Settings
        setStore(KEYS.settings, merged)
        migrateData()
        if (!merged.tmdbApiKey) setSettingsOpen(true)
        setReady(true)
      })
  }, [])

  if (!ready) return null

  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
          <Nav onSettings={() => setSettingsOpen(true)} />
          <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Navigate to="/movies" replace />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/shows" element={<Shows />} />
              <Route path="/queue" element={<Queue />} />
            </Routes>
          </main>
          {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        </div>
      </BrowserRouter>
    </SettingsProvider>
  )
}
