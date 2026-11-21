import { useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { useSettings } from '../contexts/settings'
import { useLibrary } from '../contexts/library'
import { useToast } from '../contexts/toast'
import { Sheet, SheetHeader, useSheet } from './Sheet'
import { Icon, Spinner, type IconName } from './Icon'
import { Button } from './ui'
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

const DOT: Record<DotStatus, { cls: string; label: string }> = {
  ok: { cls: 'bg-ok', label: 'Set up' },
  partial: { cls: 'bg-warn', label: 'Partly set up' },
  empty: { cls: 'bg-surface-3 ring-1 ring-line-strong', label: 'Not set up' },
}

function allFilled(...values: string[]): DotStatus {
  const filled = values.filter(Boolean).length
  if (filled === values.length) return 'ok'
  if (filled > 0) return 'partial'
  return 'empty'
}

const fieldClass =
  'w-full rounded-btn border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-line-strong focus:shadow-[0_0_0_3px_rgb(255_69_58/0.25)]'

interface Props {
  onClose: () => void
}

type ActionStatus = 'idle' | 'loading' | 'ok' | 'error'

export function SettingsModal({ onClose }: Props) {
  const { settings, saveSettings } = useSettings()
  const { syncFromRemote, syncFromJellyfin } = useLibrary()
  const toast = useToast()
  const [form, setForm] = useState<Settings>(settings)
  const [pullStatus, setPullStatus] = useState<ActionStatus>('idle')
  const [pullMsg, setPullMsg] = useState('')
  const [jellyfinStatus, setJellyfinStatus] = useState<ActionStatus>('idle')
  const [jellyfinMsg, setJellyfinMsg] = useState('')

  const set = (field: keyof Settings) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const save = () => {
    saveSettings(form)
    toast('Settings saved', 'ok')
  }

  const handlePullFromRemote = async () => {
    setPullStatus('loading')
    setPullMsg('')
    try {
      const remoteSettings = await syncFromRemote(form)
      if (remoteSettings === null) {
        setPullStatus('error')
        setPullMsg('Could not reach remote. Check the downloader URL and token.')
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
    <Sheet
      label="Settings"
      onClose={onClose}
      header={<SheetHeader title="Settings" subtitle="Saved on this device, and synced through your downloader when it’s set up." />}
      footer={<SaveBar onSave={save} />}
    >
      <div className="flex flex-col gap-3 px-5 py-5">
        <Section label="TMDB" hint="Titles, posters and trailers" icon="film" status={allFilled(form.tmdbApiKey)} defaultOpen>
          <Field label="API key" value={form.tmdbApiKey} onChange={set('tmdbApiKey')} placeholder="your_tmdb_api_key" type="password" />
          <FieldShell label="Content language">
            {id => (
              <select id={id} value={form.language} onChange={set('language')} className={`${fieldClass} appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`} style={{ backgroundImage: CHEVRON }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
          </FieldShell>
        </Section>

        <Section label="local-link-downloader" hint="Where downloads and the sync file live" icon="download" status={allFilled(form.downloaderUrl)} defaultOpen>
          <Field label="URL" value={form.downloaderUrl} onChange={set('downloaderUrl')} placeholder="http://localhost:3001" />
          <Field label="Bearer token" value={form.downloaderToken} onChange={set('downloaderToken')} placeholder="your-password-token" type="password" />
        </Section>

        <Section label="Folder keys" hint="Destination folders on the downloader" icon="layers" status={allFilled(form.movieFolderKey, form.tvFolderKey)} defaultOpen>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Movies" value={form.movieFolderKey} onChange={set('movieFolderKey')} placeholder="movies" />
            <Field label="TV shows" value={form.tvFolderKey} onChange={set('tvFolderKey')} placeholder="tv" />
          </div>
        </Section>

        <Section label="Jellyfin" hint="Import what you already have" icon="tv" status={allFilled(form.jellyfinUrl, form.jellyfinApiKey)} defaultOpen={hasJellyfin} optional>
          <Field label="Server URL" value={form.jellyfinUrl} onChange={set('jellyfinUrl')} placeholder="http://192.168.1.x:8096" />
          <Field label="API key" value={form.jellyfinApiKey} onChange={set('jellyfinApiKey')} placeholder="your_jellyfin_api_key" type="password" />
        </Section>

        <Section label="Jackett" hint="More release sources" icon="search" status={allFilled(form.jackettUrl, form.jackettApiKey)} defaultOpen={hasJackett} optional>
          <Field label="URL" value={form.jackettUrl} onChange={set('jackettUrl')} placeholder="http://localhost:9117" />
          <Field label="API key" value={form.jackettApiKey} onChange={set('jackettApiKey')} placeholder="your_jackett_api_key" type="password" />
        </Section>

        <div className="mt-3 flex flex-col gap-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-[0.06em] text-faint">Sync</h3>
          <SyncRow
            label="Pull from remote"
            description="Re-import library and settings from the downloader file"
            buttonLabel="Pull"
            icon="download"
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
              icon="sync"
              status={jellyfinStatus}
              message={jellyfinMsg}
              disabled={!canSyncJellyfin || jellyfinStatus === 'loading'}
              onClick={handleSyncJellyfin}
            />
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-faint">
          follow-links · build <span className="font-mono">{__COMMIT_HASH__}</span>
        </p>
      </div>
    </Sheet>
  )
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1a6' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

function SaveBar({ onSave }: { onSave: () => void }) {
  const { close } = useSheet()
  return (
    <div className="px-5 py-4">
      <Button variant="primary" className="w-full" onClick={() => { onSave(); close() }}>Save</Button>
    </div>
  )
}

interface SectionProps {
  label: string
  hint: string
  icon: IconName
  status: DotStatus
  defaultOpen: boolean
  optional?: boolean
  children: ReactNode
}

function Section({ label, hint, icon, status, defaultOpen, optional, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface-2/50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="relative grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-muted">
          <Icon name={icon} size={17} />
          <span className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface-2 ${DOT[status].cls}`} title={DOT[status].label} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {label}
            {optional && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-medium text-faint">optional</span>}
          </span>
          <span className="truncate text-xs text-faint">
            {status !== 'ok' && <span className={status === 'partial' ? 'text-warn' : optional ? '' : 'text-muted'}>{DOT[status].label} · </span>}
            {hint}
          </span>
        </span>
        <Icon name="chevron-down" size={15} className={`text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-line px-4 pb-4 pt-3.5">
          {children}
        </div>
      )}
    </div>
  )
}

function FieldShell({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      {children(id)}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  type?: string
}

function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <FieldShell label={label}>
      {id => (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={fieldClass}
        />
      )}
    </FieldShell>
  )
}

interface SyncRowProps {
  label: string
  description: string
  buttonLabel: string
  icon: IconName
  status: ActionStatus
  message: string
  disabled: boolean
  onClick: () => void
}

function SyncRow({ label, description, buttonLabel, icon, status, message, disabled, onClick }: SyncRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-panel border border-line bg-surface-2/50 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-faint">{description}</span>
        </div>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onClick} className="shrink-0">
          {status === 'loading' ? <Spinner size={14} /> : <Icon name={icon} size={14} />}
          {status === 'loading' ? 'Working…' : buttonLabel}
        </Button>
      </div>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-fail' : 'text-ok'}`}>{message}</p>
      )}
    </div>
  )
}
