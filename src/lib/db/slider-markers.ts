import { createClient } from '@/lib/supabase/server'

export interface SliderMarker {
  seriesName: string
  avgDifficulty: number
}

export async function getSliderMarkers(): Promise<{
  low: SliderMarker | null
  mid: SliderMarker | null
  high: SliderMarker | null
}> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('series_id, difficulty, series(name)')

  if (!data || data.length === 0) {
    return { low: null, mid: null, high: null }
  }

  const map = new Map<string, { name: string; difficulties: number[] }>()
  for (const r of data) {
    const sid = r.series_id
    const name = (r as any).series?.name ?? ''
    if (!map.has(sid)) map.set(sid, { name, difficulties: [] })
    map.get(sid)!.difficulties.push(r.difficulty)
  }

  const series = Array.from(map.values()).map(s => ({
    name: s.name,
    avg: s.difficulties.reduce((a, b) => a + b, 0) / s.difficulties.length,
    count: s.difficulties.length,
  }))

  const findTopInRange = (min: number, max: number): SliderMarker | null => {
    const inRange = series
      .filter(s => s.avg >= min && s.avg <= max)
      .sort((a, b) => b.count - a.count)
    if (!inRange.length) return null
    return { seriesName: inRange[0].name, avgDifficulty: Math.round(inRange[0].avg * 10) / 10 }
  }

  return {
    low:  findTopInRange(1, 3),
    mid:  findTopInRange(4, 7),
    high: findTopInRange(8, 10),
  }
}
