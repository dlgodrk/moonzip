'use client'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="시리즈명으로 검색 (예: 쎈, 개념원리)"
        className="w-full px-4 py-3 pr-10 border border-zinc-300 rounded-xl text-base focus:outline-none focus:border-zinc-500"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">🔍</span>
    </div>
  )
}
