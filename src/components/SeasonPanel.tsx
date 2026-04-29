import type { SeasonItem } from '../types'

interface Props {
  seasons: SeasonItem[]
  onDownload: (season: SeasonItem) => void
  onStatusChange: (seasonNumber: number, status: SeasonItem['status']) => void
}

const STATUS_CLASSES: Record<SeasonItem['status'], string> = {
  wanted: 'bg-yellow-600 text-yellow-100',
  downloading: 'bg-blue-600 text-blue-100',
  downloaded: 'bg-green-700 text-green-100',
  unmonitored: 'bg-gray-700 text-gray-400',
}

export function SeasonPanel({ seasons, onDownload, onStatusChange }: Props) {
  return (
    <div className="divide-y divide-gray-800">
      {seasons.map(season => (
        <div key={season.seasonNumber} className="flex items-center gap-3 py-2 px-3">
          <span className="text-gray-300 text-sm w-20 shrink-0">
            Season {season.seasonNumber}
          </span>
          <span className="text-gray-500 text-xs w-24 shrink-0">
            {season.episodeCount} eps
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_CLASSES[season.status] ?? 'bg-gray-700 text-gray-400'}`}>
            {season.status}
          </span>

          <div className="ml-auto flex gap-2 items-center">
            <select
              value={season.status}
              onChange={e => onStatusChange(season.seasonNumber, e.target.value as SeasonItem['status'])}
              className="text-xs bg-gray-800 text-gray-300 rounded px-1 py-0.5 border border-gray-700"
            >
              <option value="wanted">Wanted</option>
              <option value="downloading">Downloading</option>
              <option value="downloaded">Downloaded</option>
              <option value="unmonitored">Unmonitored</option>
            </select>
            {season.status !== 'unmonitored' && season.status !== 'downloaded' && (
              <button
                onClick={() => onDownload(season)}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-2 py-0.5"
              >
                ↓ DL
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
