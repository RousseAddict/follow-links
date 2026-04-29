import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Movies } from './pages/Movies'
import { Shows } from './pages/Shows'
import { Queue } from './pages/Queue'
import { SettingsModal } from './components/SettingsModal'
import { getStore, setStore, KEYS, SETTING_DEFAULTS } from './lib/store'
import type { Settings, ShowItem } from './types'

function Nav({ onSettings }: { onSettings: () => void }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`

  return (
    <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
      <span className="text-gray-100 font-semibold text-sm mr-4">follow-links</span>
      <NavLink to="/movies" className={linkClass}>Movies</NavLink>
      <NavLink to="/shows" className={linkClass}>TV Shows</NavLink>
      <NavLink to="/queue" className={linkClass}>Queue</NavLink>
      <button
        onClick={onSettings}
        className="ml-auto text-gray-500 hover:text-gray-300 text-lg"
        title="Settings"
      >
        ⚙
      </button>
    </header>
  )
}

function migrateShows() {
  const shows = getStore<ShowItem[]>(KEYS.shows, [])
  const needsMigration = shows.some(s => !Array.isArray(s.seasons))
  if (!needsMigration) return
  setStore(KEYS.shows, shows.map(s => ({ ...s, seasons: s.seasons ?? [] })))
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
        // Whitelist to known keys so stale keys from old schema versions don't persist
        const merged = Object.fromEntries(
          (Object.keys(SETTING_DEFAULTS) as (keyof Settings)[]).map(k => [k, raw[k]])
        ) as Settings
        setStore(KEYS.settings, merged)
        migrateShows()
        if (!merged.tmdbApiKey) setSettingsOpen(true)
        setReady(true)
      })
  }, [])

  if (!ready) return null

  return (
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
  )
}
