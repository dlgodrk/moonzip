import { Review } from '@/lib/supabase/types'

export function ReviewCard({ review }: { review: Review }) {
  const role = review.user?.role ?? '익명'
  const meta = [review.exam_type, review.grade].filter(Boolean).join(' · ')

  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-zinc-600">{role}</span>
        <span className="text-xs text-zinc-400">난이도 {review.difficulty}</span>
        {meta && <span className="text-xs text-zinc-400">{meta} 추천</span>}
      </div>
      <p className="text-sm text-zinc-800">{review.content}</p>
    </div>
  )
}
