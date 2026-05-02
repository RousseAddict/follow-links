import { useState, useEffect, useRef } from 'react'

interface Props {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
  resetKey?: number
}

export function SearchBar({ placeholder = 'Search…', onSearch, debounceMs = 400, resetKey }: Props) {
  const [value, setValue] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (resetKey !== undefined) setValue('')
  }, [resetKey])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(value.trim()), debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value, debounceMs, onSearch])

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
