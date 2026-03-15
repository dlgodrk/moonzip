'use client'
import { useState } from 'react'
import { Review, UserRole } from '@/lib/supabase/types'
import { ReviewCard } from './ReviewCard'

const ROLE_FILTERS: (UserRole | '전체')[] = ['전체', '강사', '학생', '학부모']

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [filter, setFilter] = useState<UserRole | '전체'>('전체')

  const filtered = filter === '전체'
    ? reviews
    : reviews.filter(r => r.user?.role === filter)

  const counts = {
    강사: reviews.filter(r => r.user?.role === '강사').length,
    학생: reviews.filter(r => r.user?.role === '학생').length,
    학부모: reviews.filter(r => r.user?.role === '학부모').length,
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {ROLE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === f ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
            }`}
          >
            {f}
            {f !== '전체' && ` ${counts[f as UserRole]}`}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <p className="text-zinc-400 text-sm py-4">아직 리뷰가 없어요. 첫 번째가 되세요!</p>
        : filtered.map(r => <ReviewCard key={r.id} review={r} />)
      }
    </div>
  )
}
