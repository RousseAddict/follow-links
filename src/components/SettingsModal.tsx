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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl w-full max-w-md p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-gray-100 font-medium">Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <Section label="TMDB">
          <Field label="API Key" value={form.tmdbApiKey} onChange={set('tmdbApiKey')} placeholder="your_tmdb_api_key" />
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
        </Section>

        <Section label="local-link-downloader">
          <Field label="URL" value={form.downloaderUrl} onChange={set('downloaderUrl')} placeholder="http://localhost:3001" />
          <Field label="Bearer token" value={form.downloaderToken} onChange={set('downloaderToken')} placeholder="your-password-token" type="password" />
        </Section>

        <Section label="Folder keys">
          <Field label="Movies folder" value={form.movieFolderKey} onChange={set('movieFolderKey')} placeholder="movies" />
          <Field label="TV folder" value={form.tvFolderKey} onChange={set('tvFolderKey')} placeholder="tv" />
        </Section>

        <Section label="Jellyfin (optional)">
          <Field label="Server URL" value={form.jellyfinUrl} onChange={set('jellyfinUrl')} placeholder="http://192.168.1.x:8096" />
          <Field label="API key" value={form.jellyfinApiKey} onChange={set('jellyfinApiKey')} placeholder="your_jellyfin_api_key" type="password" />
        </Section>

        <button
          onClick={save}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg py-2.5"
        >
          Save
        </button>
      </div>
    </div>
  )
}

interface SectionProps { label: string; children: React.ReactNode }

function Section({ label, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      {children}
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
