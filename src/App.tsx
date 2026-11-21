import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Movies } from './pages/Movies'
import { Shows } from './pages/Shows'
import { Queue } from './pages/Queue'
import { SettingsModal } from './components/SettingsModal'
import { TabBar, TopBar } from './components/Shell'
import { SettingsProvider } from './contexts/settings'
import { LibraryProvider } from './contexts/library'
import { JobsProvider } from './contexts/jobs'
import { SearchProvider } from './contexts/search'
import { ToastProvider } from './contexts/toast'
import { fetchRemoteLibrary } from './lib/remote-store'
import { getStore, setStore, KEYS, SETTING_DEFAULTS, SCHEMA_VERSION } from './lib/store'
import type { Settings, ShowItem } from './types'

/** Each tab opens at the top, like a native app. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
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
    const stored = getStore<Partial<Settings>>(KEYS.settings, {})
    const local: Settings = { ...SETTING_DEFAULTS, ...stored }

    migrateData()

    const finish = (final: Settings) => {
      setStore(KEYS.settings, final)
      if (!final.tmdbApiKey) setSettingsOpen(true)
      setReady(true)
    }

    if (!local.downloaderUrl || !local.movieFolderKey) {
      finish(local)
      return
    }

    // Try to pull settings from remote — lets a new device bootstrap by only entering the downloader URL
    fetchRemoteLibrary(local).then(remote => {
      if (!remote?.settings) { finish(local); return }
      finish({
        ...SETTING_DEFAULTS,
        ...local,
        ...remote.settings,
        // Never override the bootstrap credentials from remote
        downloaderUrl: local.downloaderUrl,
        downloaderToken: local.downloaderToken,
      })
    })
  }, [])

  if (!ready) return null

  const openSettings = () => setSettingsOpen(true)

  return (
    <SettingsProvider>
      <LibraryProvider>
        <JobsProvider>
          <ToastProvider>
            <BrowserRouter>
              <SearchProvider>
                <ScrollToTop />
                <div className="flex min-h-dvh flex-col">
                  <TopBar onSettings={openSettings} />
                  <main className="px-gutter pad-tabbar mx-auto w-full max-w-[1600px] flex-1 pt-[calc(env(safe-area-inset-top,0px)_+_16px)] md:pb-16 md:pt-7">
                    <Routes>
                      <Route path="/" element={<Navigate to="/movies" replace />} />
                      <Route path="/movies" element={<Movies />} />
                      <Route path="/shows" element={<Shows />} />
                      <Route path="/queue" element={<Queue />} />
                      <Route path="*" element={<Navigate to="/movies" replace />} />
                    </Routes>
                  </main>
                  <TabBar onSettings={openSettings} />
                  {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
                </div>
              </SearchProvider>
            </BrowserRouter>
          </ToastProvider>
        </JobsProvider>
      </LibraryProvider>
    </SettingsProvider>
  )
}
