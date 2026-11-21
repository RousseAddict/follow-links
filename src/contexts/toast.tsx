import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'

type Tone = 'default' | 'ok' | 'error'
interface Toast { id: number; message: string; tone: Tone }

const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {})
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Tone = 'default') => {
    const id = ++seq
    setToasts(list => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), tone === 'error' ? 5000 : 2800)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--tabbar-h)_+_env(safe-area-inset-bottom,0px)_+_14px)] md:bottom-6"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="animate-toast pointer-events-auto flex max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full border border-line-strong bg-surface-3/90 py-2.5 pl-3 pr-4 text-sm font-medium text-ink shadow-modal backdrop-blur-xl"
          >
            {t.tone === 'ok' && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-downloaded text-white"><Icon name="check" size={12} strokeWidth={3} /></span>}
            {t.tone === 'error' && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-fail/20 text-fail"><Icon name="alert" size={12} strokeWidth={2.5} /></span>}
            <span className="min-w-0">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(Ctx)
}
