import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-ink">
        <div className="flex w-full max-w-lg flex-col gap-4 rounded-panel border border-fail/30 bg-surface-1 p-6 shadow-modal">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-fail/15 text-fail">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5.5M12 16.5h.01" />
              </svg>
            </div>
            <h1 className="text-[17px] font-semibold">Something went wrong</h1>
          </div>
          <p className="text-sm text-muted">{error.message}</p>
          {error.stack && (
            <pre className="max-h-48 overflow-auto rounded-btn bg-canvas p-3 text-xs leading-relaxed text-faint">
              {error.stack}
            </pre>
          )}
          <button
            onClick={() => this.setState({ error: null })}
            className="h-10 self-start rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-3"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
