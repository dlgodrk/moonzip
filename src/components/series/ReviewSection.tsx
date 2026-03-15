'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Review, User } from '@/lib/supabase/types'
import { ReviewList } from './ReviewList'
import { ReviewModal } from './ReviewModal'

interface Props {
  seriesId: string
  seriesName: string
  reviews: Review[]
  currentUser: User | null
  myReview: Review | null
}

export function ReviewSection({ seriesId, seriesName, reviews, currentUser, myReview }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleDelete = async () => {
    if (!myReview || !confirm('리뷰를 삭제할까요?')) return
    await fetch(`/api/reviews?id=${myReview.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <ReviewList reviews={reviews} />

      <div className="mt-4">
        {currentUser ? (
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)}
              className="flex-1 py-2.5 border border-zinc-300 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
              {myReview ? '내 리뷰 수정 →' : '리뷰 작성하기 →'}
            </button>
            {myReview && (
              <button onClick={handleDelete}
                className="px-4 py-2.5 border border-red-200 text-red-400 rounded-xl text-sm hover:bg-red-50">
                삭제
              </button>
            )}
          </div>
        ) : (
          <a href="/auth" className="block text-center py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50">
            로그인하고 리뷰 작성하기 →
          </a>
        )}
      </div>

      {showModal && (
        <ReviewModal
          seriesId={seriesId}
          seriesName={seriesName}
          existing={myReview}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
