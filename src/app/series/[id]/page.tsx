import { notFound } from 'next/navigation'
import { getSeriesById } from '@/lib/db/series'
import { getBooksBySeries } from '@/lib/db/books'
import { getReviewsBySeries, getMyReview } from '@/lib/db/reviews'
import { BookTable } from '@/components/series/BookTable'
import { ReviewSection } from '@/components/series/ReviewSection'
import { createClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ id: string }> }

export default async function SeriesPage({ params }: Props) {
  const { id } = await params
  const [series, books, reviews] = await Promise.all([
    getSeriesById(id),
    getBooksBySeries(id),
    getReviewsBySeries(id),
  ])
  if (!series) notFound()

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let currentUser = null
  let myReview = null
  if (authUser) {
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    currentUser = data
    myReview = await getMyReview(id, authUser.id)
  }

  const difficulties = reviews.map(r => r.difficulty)
  const avg = difficulties.length > 0
    ? (difficulties.reduce((a, b) => a + b, 0) / difficulties.length).toFixed(1)
    : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{series.name}</h1>
            <div className="flex gap-1 mt-1">
              {series.types.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600">{t}</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{avg ?? '5.0'}</div>
            <div className="text-xs text-zinc-400">
              {reviews.length > 0 ? `${reviews.length}명 투표` : '아직 투표 없음'}
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-3">📚 문제집 목록</h2>
        <BookTable books={books} />
      </section>

      <section>
        <h2 className="font-semibold mb-3">
          💬 리뷰
          <span className="text-zinc-400 font-normal text-sm ml-2">
            강사 {reviews.filter(r => r.user?.role === '강사').length} ·
            학생 {reviews.filter(r => r.user?.role === '학생').length} ·
            학부모 {reviews.filter(r => r.user?.role === '학부모').length}
          </span>
        </h2>
        <ReviewSection
          seriesId={id}
          seriesName={series.name}
          reviews={reviews}
          currentUser={currentUser}
          myReview={myReview}
        />
      </section>
    </main>
  )
}
