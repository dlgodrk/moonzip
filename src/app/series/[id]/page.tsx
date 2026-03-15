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

  const diffVal = avg ? parseFloat(avg) : null
  const diffColor = diffVal === null ? 'text-zinc-400' :
    diffVal <= 3 ? 'text-blue-600' :
    diffVal <= 6 ? 'text-amber-600' : 'text-red-600'

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{series.name}</h1>
            <div className="flex gap-1.5 mt-2">
              {series.types.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500 font-medium">{t}</span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-3xl font-bold ${diffColor}`}>{avg ?? '—'}</div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {reviews.length > 0 ? `${reviews.length}명 투표` : '아직 투표 없음'}
            </div>
          </div>
        </div>
      </div>

      {/* 문제집 목록 */}
      <section className="bg-white rounded-2xl border border-zinc-200/80 p-6">
        <h2 className="font-semibold text-zinc-900 mb-4">문제집 목록</h2>
        <BookTable books={books} />
      </section>

      {/* 리뷰 */}
      <section className="bg-white rounded-2xl border border-zinc-200/80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-zinc-900">리뷰</h2>
          <span className="text-xs text-zinc-400">
            강사 {reviews.filter(r => r.user?.role === '강사').length} ·
            학생 {reviews.filter(r => r.user?.role === '학생').length} ·
            학부모 {reviews.filter(r => r.user?.role === '학부모').length}
          </span>
        </div>
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
