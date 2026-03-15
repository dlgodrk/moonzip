'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Review } from '@/lib/supabase/types'
import { ReviewModal } from '@/components/series/ReviewModal'

type SortKey = 'latest' | 'difficulty_asc' | 'difficulty_desc'

export function MyReviewList({ reviews }: { reviews: Review[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<SortKey>('latest')
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  const sorted = [...reviews].sort((a, b) => {
    if (sort === 'latest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sort === 'difficulty_asc') return a.difficulty - b.difficulty
    return b.difficulty - a.difficulty
  })

  const handleDelete = async (id: string) => {
    if (!confirm('리뷰를 삭제할까요?')) return
    await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {([
          { key: 'latest', label: '최신순' },
          { key: 'difficulty_asc', label: '난이도 낮은순' },
          { key: 'difficulty_desc', label: '난이도 높은순' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSort(key)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              sort === key ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-zinc-400 text-sm py-8 text-center">
          아직 작성한 리뷰가 없어요.<br />
          <Link href="/" className="underline">문제집을 찾아보세요 →</Link>
        </p>
      )}

      <div className="space-y-3">
        {sorted.map(r => (
          <div key={r.id} className="p-4 border border-zinc-200 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/series/${r.series_id}`} className="font-medium hover:underline">
                  {(r as any).series?.name ?? '시리즈'}
                </Link>
                <div className="flex gap-2 mt-1 text-xs text-zinc-400">
                  <span>난이도 {r.difficulty}</span>
                  {r.exam_type && <span>{r.exam_type}</span>}
                  {r.grade && <span>{r.grade} 추천</span>}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditingReview(r)} className="text-zinc-400 hover:text-black">수정</button>
                <button onClick={() => handleDelete(r.id)} className="text-red-300 hover:text-red-500">삭제</button>
              </div>
            </div>
            <p className="text-sm mt-2 text-zinc-700">{r.content}</p>
          </div>
        ))}
      </div>

      {editingReview && (
        <ReviewModal
          seriesId={editingReview.series_id}
          seriesName={(editingReview as any).series?.name ?? '시리즈'}
          existing={editingReview}
          onClose={() => setEditingReview(null)}
        />
      )}
    </div>
  )
}
