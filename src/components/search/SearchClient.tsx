'use client'
import { useState } from 'react'
import { TypeFilter } from './TypeFilter'
import { SearchInput } from './SearchInput'
import { DifficultySlider } from './DifficultySlider'
import { Series } from '@/lib/supabase/types'
import { SeriesCard } from './SeriesCard'

interface Marker { seriesName: string; avgDifficulty: number }
interface Props {
  initialSeries: Series[]
  markers: { low: Marker | null; mid: Marker | null; high: Marker | null }
}

export function SearchClient({ initialSeries, markers }: Props) {
  const [types, setTypes] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [diffMin, setDiffMin] = useState(1)
  const [diffMax, setDiffMax] = useState(10)

  const filtered = initialSeries.filter(s => {
    if (types.length > 0 && !s.types.some(t => types.includes(t))) return false
    if (keyword && !s.name.toLowerCase().includes(keyword.toLowerCase())) return false
    const eff = s.avg_difficulty ?? 5
    if (eff < diffMin || eff > diffMax) return false
    return true
  })

  return (
    <div className="space-y-4">
      <SearchInput value={keyword} onChange={setKeyword} />
      <TypeFilter selected={types} onChange={setTypes} />
      <DifficultySlider
        min={diffMin} max={diffMax}
        onMinChange={setDiffMin} onMaxChange={setDiffMax}
        markers={markers}
      />
      <div className="text-sm text-zinc-400">{filtered.length}개 시리즈</div>
      <div className="space-y-2">
        {filtered.map(s => <SeriesCard key={s.id} series={s} />)}
      </div>
    </div>
  )
}
