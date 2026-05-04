import type { SeasonItem } from '../types'
import { SEASON_STATUS_CLASSES } from '../constants'

interface Props {
  seasons: SeasonItem[]
  onDownload: (season: SeasonItem) => void
  onStatusChange: (seasonNumber: number, status: SeasonItem['status']) => void
}

export function SeasonPanel({ seasons, onDownload, onStatusChange }: Props) {
  return (
    <div className="divide-y divide-gray-800">
      {seasons.map(season => (
        <div key={season.seasonNumber} className="flex flex-col gap-2 py-2.5 px-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm w-20 shrink-0">
              Season {season.seasonNumber}
            </span>
            <span className="text-gray-500 text-xs">
              {season.episodeCount} eps
            </span>
            <span className={`ml-auto sm:ml-0 text-[10px] font-semibold px-2 py-0.5 rounded ${SEASON_STATUS_CLASSES[season.status] ?? 'bg-gray-700 text-gray-400'}`}>
              {season.status}
            </span>
          </div>

          <div className="flex gap-2 items-center sm:ml-auto">
            <select
              value={season.status}
              onChange={e => onStatusChange(season.seasonNumber, e.target.value as SeasonItem['status'])}
              className="flex-1 sm:flex-none text-xs bg-gray-800 text-gray-300 rounded px-1 py-1 sm:py-0.5 border border-gray-700"
            >
              <option value="wanted">Wanted</option>
              <option value="downloading">Downloading</option>
              <option value="downloaded">Downloaded</option>
              <option value="unmonitored">Unmonitored</option>
            </select>
            {season.status !== 'unmonitored' && season.status !== 'downloaded' && (
              <button
                onClick={() => onDownload(season)}
                className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-2 py-1 sm:py-0.5 whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                DL
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
