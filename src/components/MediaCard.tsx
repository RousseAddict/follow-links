import type { MediaStatus } from '../types'
import { posterUrl } from '../lib/tmdb'
import { STATUS_BADGE } from '../constants'

interface Props {
  title: string
  year: string
  posterPath: string
  status?: MediaStatus
  isInLibrary?: boolean
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
  onAdd,
  onDownload,
  onStatusChange,
  onRemove,
  onClick,
}: Props) {
  return (
    <div
      className="bg-gray-900 rounded-lg overflow-hidden flex flex-col cursor-pointer group"
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
              ↓
            </button>
          )}
          {isInLibrary && onRemove && (
            <button
              onClick={status !== 'downloaded' ? onRemove : undefined}
              disabled={status === 'downloaded'}
              className={`shrink-0 w-7 h-7 flex items-center justify-center text-[13px] rounded ${status === 'downloaded' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-300'}`}
              title={status === 'downloaded' ? 'Cannot remove downloaded media' : 'Remove from library'}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
