'use client'
import { BOOK_TYPES } from '@/lib/constants'

interface Props {
  selected: string[]
  onChange: (types: string[]) => void
}

export function TypeFilter({ selected, onChange }: Props) {
  const toggle = (type: string) => {
    onChange(
      selected.includes(type)
        ? selected.filter(t => t !== type)
        : [...selected, type]
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BOOK_TYPES.map(type => (
        <button
          key={type}
          onClick={() => toggle(type)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selected.includes(type)
              ? 'bg-black text-white border-black'
              : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
