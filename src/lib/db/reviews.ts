import { createClient } from '@/lib/supabase/server'
import { Review } from '@/lib/supabase/types'

export async function getReviewsBySeries(seriesId: string): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:users(id, role, email)')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Review[]
}

export async function getMyReview(seriesId: string, userId: string): Promise<Review | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .single()
  return data || null
}

export async function getMyReviews(userId: string): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, series(id, name, types)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Review[]
}
