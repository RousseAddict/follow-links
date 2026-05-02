import type { MediaStatus } from '../types'
import { posterUrl } from '../lib/tmdb'
import { STATUS_BADGE } from '../constants'

interface Props {
  title: string
  year: string
  posterPath: string
  status?: MediaStatus
  isInLibrary?: boolean
  highlighted?: boolean
  onAdd?: () => void
  onDownload?: () => void
  onStatusChange?: (status: MediaStatus) => void
  onRemove?: () => void
  onClick?: () => void
}

export function MediaCard({
  title,
  year,
  posterPath,
  status,
  isInLibrary,
  highlighted,
  onAdd,
  onDownload,
  onStatusChange,
  onRemove,
  onClick,
}: Props) {
  return (
    <div
      className={`bg-gray-900 rounded-lg overflow-hidden flex flex-col cursor-pointer group transition-shadow ${highlighted ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-950' : ''}`}
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] bg-gray-800">
        {posterPath ? (
          <img
            src={posterUrl(posterPath)}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs px-2 text-center">
            No poster
          </div>
        )}
        {status && (
          <span className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[status]}`}>
            {status}
          </span>
        )}
      </div>

      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <p className="text-gray-100 text-xs font-medium leading-tight line-clamp-2">{title}</p>
        {year && <p className="text-gray-500 text-[11px]">{year}</p>}

        <div className="flex gap-1 mt-auto" onClick={e => e.stopPropagation()}>
          {!isInLibrary && onAdd && (
            <button
              onClick={onAdd}
              className="flex-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded px-2 py-1"
            >
              + Add
            </button>
          )}
          {isInLibrary && status && onStatusChange && (
            <select
              value={status}
              onChange={e => onStatusChange(e.target.value as MediaStatus)}
              className="flex-1 min-w-0 text-[11px] bg-gray-800 text-gray-300 rounded px-1 py-1 border border-gray-700"
            >
              <option value="wanted">Wanted</option>
              <option value="downloading">Downloading</option>
              <option value="downloaded">Downloaded</option>
            </select>
          )}
          {isInLibrary && onDownload && (
            <button
              onClick={onDownload}
              className="shrink-0 w-7 h-7 flex items-center justify-center text-[13px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
              title="Download"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          )}
          {isInLibrary && onRemove && (
            <button
              onClick={status !== 'downloaded' ? onRemove : undefined}
              disabled={status === 'downloaded'}
              className={`shrink-0 w-7 h-7 flex items-center justify-center text-[13px] rounded ${status === 'downloaded' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-300'}`}
              title={status === 'downloaded' ? 'Cannot remove downloaded media' : 'Remove from library'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
