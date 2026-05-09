import { useState } from 'react'
import { useSettings } from '../contexts/settings'
import { useLibrary } from '../contexts/library'
import type { Settings } from '../types'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },
]

type DotStatus = 'ok' | 'partial' | 'empty'

function dot(status: DotStatus): string {
  if (status === 'ok') return 'bg-green-500'
  if (status === 'partial') return 'bg-amber-500'
  return 'bg-gray-600'
}

function allFilled(...values: string[]): DotStatus {
  const filled = values.filter(Boolean).length
  if (filled === values.length) return 'ok'
  if (filled > 0) return 'partial'
  return 'empty'
}

interface Props {
  onClose: () => void
}

type ActionStatus = 'idle' | 'loading' | 'ok' | 'error'

export function SettingsModal({ onClose }: Props) {
  const { settings, saveSettings } = useSettings()
  const { syncFromRemote, syncFromJellyfin } = useLibrary()
  const [form, setForm] = useState<Settings>(settings)
  const [pullStatus, setPullStatus] = useState<ActionStatus>('idle')
  const [pullMsg, setPullMsg] = useState('')
  const [jellyfinStatus, setJellyfinStatus] = useState<ActionStatus>('idle')
  const [jellyfinMsg, setJellyfinMsg] = useState('')

  const set = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const save = () => {
    saveSettings(form)
    onClose()
  }

  const handlePullFromRemote = async () => {
    setPullStatus('loading')
    setPullMsg('')
    try {
      const remoteSettings = await syncFromRemote(form)
      if (remoteSettings === null) {
        setPullStatus('error')
        setPullMsg('Could not reach remote — check downloader URL and token')
        return
      }
      if (Object.keys(remoteSettings).length > 0) {
        setForm(f => ({ ...f, ...remoteSettings }))
      }
      setPullStatus('ok')
      setPullMsg('Library and settings pulled from remote')
    } catch {
      setPullStatus('error')
      setPullMsg('Pull failed')
    }
  }

  const handleSyncJellyfin = async () => {
    setJellyfinStatus('loading')
    setJellyfinMsg('')
    try {
      const msg = await syncFromJellyfin(form)
      setJellyfinStatus('ok')
      setJellyfinMsg(msg)
    } catch (e) {
      setJellyfinStatus('error')
      setJellyfinMsg(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  const hasJellyfin = !!(settings.jellyfinUrl || settings.jellyfinApiKey)
  const hasJackett = !!(settings.jackettUrl || settings.jackettApiKey)
  const canPull = !!(form.downloaderUrl)
  const canSyncJellyfin = !!(form.jellyfinUrl && form.jellyfinApiKey)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — sticky so it stays visible while scrolling */}
        <div className="sticky top-0 z-10 bg-gray-900 flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-gray-100 font-medium">Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 flex flex-col gap-3">

          <CollapsibleSection label="TMDB" status={allFilled(form.tmdbApiKey)} defaultOpen>
            <Field label="API Key" value={form.tmdbApiKey} onChange={set('tmdbApiKey')} placeholder="your_tmdb_api_key" type="password" />
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Content language</label>
              <select
                value={form.language}
                onChange={set('language')}
                className="bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </CollapsibleSection>

          <CollapsibleSection label="local-link-downloader" status={allFilled(form.downloaderUrl)} defaultOpen>
            <Field label="URL" value={form.downloaderUrl} onChange={set('downloaderUrl')} placeholder="http://localhost:3001" />
            <Field label="Bearer token" value={form.downloaderToken} onChange={set('downloaderToken')} placeholder="your-password-token" type="password" />
          </CollapsibleSection>

          <CollapsibleSection label="Folder keys" status={allFilled(form.movieFolderKey, form.tvFolderKey)} defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Movies" value={form.movieFolderKey} onChange={set('movieFolderKey')} placeholder="movies" />
              <Field label="TV shows" value={form.tvFolderKey} onChange={set('tvFolderKey')} placeholder="tv" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection label="Jellyfin" status={allFilled(form.jellyfinUrl, form.jellyfinApiKey)} defaultOpen={hasJellyfin} optional>
            <Field label="Server URL" value={form.jellyfinUrl} onChange={set('jellyfinUrl')} placeholder="http://192.168.1.x:8096" />
            <Field label="API key" value={form.jellyfinApiKey} onChange={set('jellyfinApiKey')} placeholder="your_jellyfin_api_key" type="password" />
          </CollapsibleSection>

          <CollapsibleSection label="Jackett" status={allFilled(form.jackettUrl, form.jackettApiKey)} defaultOpen={hasJackett} optional>
            <Field label="URL" value={form.jackettUrl} onChange={set('jackettUrl')} placeholder="http://localhost:9117" />
            <Field label="API key" value={form.jackettApiKey} onChange={set('jackettApiKey')} placeholder="your_jackett_api_key" type="password" />
          </CollapsibleSection>

          {/* ── Sync actions ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide px-1">Sync</p>

            <SyncRow
              label="Pull from remote"
              description="Re-import library and settings from the downloader file"
              buttonLabel="Pull"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              status={pullStatus}
              message={pullMsg}
              disabled={!canPull || pullStatus === 'loading'}
              onClick={handlePullFromRemote}
            />

            {(form.jellyfinUrl || hasJellyfin) && (
              <SyncRow
                label="Sync from Jellyfin"
                description="Import movies and shows from your Jellyfin library"
                buttonLabel="Sync"
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>}
                status={jellyfinStatus}
                message={jellyfinMsg}
                disabled={!canSyncJellyfin || jellyfinStatus === 'loading'}
                onClick={handleSyncJellyfin}
              />
            )}
          </div>

        </div>

        {/* Footer — sticky so it stays visible while scrolling */}
        <div className="sticky bottom-0 bg-gray-900 px-5 py-4 border-t border-gray-800">
          <button
            onClick={save}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg py-2.5"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

interface CollapsibleSectionProps {
  label: string
  status: DotStatus
  defaultOpen: boolean
  optional?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ label, status, defaultOpen, optional, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dot(status)}`} />
          <span className="text-gray-200 text-sm font-medium">{label}</span>
          {optional && (
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-medium">optional</span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-gray-800">
          {children}
        </div>
      )}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  type?: string
}

function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-gray-400 text-xs">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
      />
    </div>
  )
}

interface SyncRowProps {
  label: string
  description: string
  buttonLabel: string
  icon: React.ReactNode
  status: ActionStatus
  message: string
  disabled: boolean
  onClick: () => void
}

function SyncRow({ label, description, buttonLabel, icon, status, message, disabled, onClick }: SyncRowProps) {
  return (
    <div className="border border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-gray-200 text-sm font-medium">{label}</span>
          <span className="text-gray-500 text-xs">{description}</span>
        </div>
        <button
          onClick={onClick}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 shrink-0 transition-colors"
        >
          {status === 'loading'
            ? <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            : icon
          }
          {status === 'loading' ? 'Working…' : buttonLabel}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
