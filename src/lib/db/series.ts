import { createClient } from '@/lib/supabase/server'
import { Series } from '@/lib/supabase/types'

export interface SeriesSearchParams {
  types?: string[]
  keyword?: string
  diffMin?: number
  diffMax?: number
}

export async function searchSeries(params: SeriesSearchParams): Promise<Series[]> {
  const supabase = await createClient()

  let query = supabase
    .from('series')
    .select(`
      id, name, slug, types, created_at,
      reviews(difficulty),
      books(subject)
    `)

  if (params.keyword) {
    query = query.ilike('name', `%${params.keyword}%`)
  }

  if (params.types && params.types.length > 0) {
    query = query.overlaps('types', params.types)
  }

  const { data, error } = await query.order('name')
  if (error) throw error

  return (data || []).map((s: any) => {
    const difficulties: number[] = (s.reviews || []).map((r: any) => r.difficulty)
    const avg_difficulty = difficulties.length > 0
      ? Math.round((difficulties.reduce((a: number, b: number) => a + b, 0) / difficulties.length) * 10) / 10
      : null
    const review_count = difficulties.length

    const subjectSet = new Set<string>()
    ;(s.books || []).forEach((b: any) => {
      if (b.subject) {
        b.subject.split(',').forEach((sub: string) => {
          const trimmed = sub.trim()
          if (trimmed) subjectSet.add(trimmed)
        })
      }
    })

    const eff_difficulty = avg_difficulty ?? 5
    if (params.diffMin !== undefined && eff_difficulty < params.diffMin) return null
    if (params.diffMax !== undefined && eff_difficulty > params.diffMax) return null

    return {
      ...s,
      reviews: undefined,
      books: undefined,
      avg_difficulty,
      review_count,
      subjects: Array.from(subjectSet).sort(),
    } as Series
  }).filter(Boolean) as Series[]
}

export async function getSeriesById(id: string): Promise<Series | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('series')
    .select('id, name, slug, types, created_at')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
