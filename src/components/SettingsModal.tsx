import { useState } from 'react'
import { useSettings } from '../contexts/settings'
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

export function SettingsModal({ onClose }: Props) {
  const { settings, saveSettings } = useSettings()
  const [form, setForm] = useState<Settings>(settings)

  const set = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const save = () => {
    saveSettings(form)
    onClose()
  }

  const hasJellyfin = !!(settings.jellyfinUrl || settings.jellyfinApiKey)
  const hasJackett = !!(settings.jackettUrl || settings.jackettApiKey)

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
