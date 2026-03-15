'use client'

interface Marker {
  seriesName: string
  avgDifficulty: number
}

interface Props {
  min: number
  max: number
  onMinChange: (v: number) => void
  onMaxChange: (v: number) => void
  markers: { low: Marker | null; mid: Marker | null; high: Marker | null }
}

export function DifficultySlider({ min, max, onMinChange, onMaxChange, markers }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-zinc-500">
        <span>난이도</span>
        <span className="font-medium text-black">{min} – {max}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={1} max={10} value={min}
          onChange={e => onMinChange(Number(e.target.value))}
          className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:appearance-none"
        />
        <input
          type="range" min={1} max={10} value={max}
          onChange={e => onMaxChange(Number(e.target.value))}
          className="relative w-full h-1 appearance-none bg-zinc-200 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:appearance-none"
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-400 mt-3">
        {markers.low  && <span className="text-center">▲<br/>{markers.low.seriesName}</span>}
        {markers.mid  && <span className="text-center">▲<br/>{markers.mid.seriesName}</span>}
        {markers.high && <span className="text-right">▲<br/>{markers.high.seriesName}</span>}
      </div>
    </div>
  )
}
