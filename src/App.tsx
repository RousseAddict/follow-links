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
import { loadSettings } from './lib/store'

/** Each tab opens at the top, like a native app. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  // Nothing set up on this device yet: open Settings right away.
  const [settingsOpen, setSettingsOpen] = useState(() => !loadSettings().tmdbApiKey)

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
