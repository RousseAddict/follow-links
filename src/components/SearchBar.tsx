import { useState, useEffect, useRef } from 'react'

interface Props {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export function SearchBar({ placeholder = 'Search…', onSearch, debounceMs = 400 }: Props) {
  const [value, setValue] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          ✕
        </button>
      )}
    </div>
  )
}
