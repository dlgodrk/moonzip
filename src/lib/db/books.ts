import { createClient } from '@/lib/supabase/server'
import { Book } from '@/lib/supabase/types'

export async function getBooksBySeries(seriesId: string): Promise<Book[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('series_id', seriesId)
    .order('subject')
  if (error) throw error
  return data || []
}
