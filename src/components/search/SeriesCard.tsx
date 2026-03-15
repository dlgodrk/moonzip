import Link from 'next/link'
import { Series } from '@/lib/supabase/types'

export function SeriesCard({ series }: { series: Series }) {
  const diff = series.avg_difficulty
  const hasVotes = series.review_count && series.review_count > 0

  return (
    <Link href={`/series/${series.id}`} className="block p-4 border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{series.name}</h3>
            <div className="flex gap-1">
              {series.types.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600">{t}</span>
              ))}
            </div>
          </div>
          {series.subjects && series.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {series.subjects.slice(0, 6).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 border border-zinc-200 rounded text-zinc-500">{s}</span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold">{diff?.toFixed(1) ?? '5.0'}</div>
          <div className="text-xs text-zinc-400">
            {hasVotes ? `${series.review_count}명 투표` : '아직 투표 없음'}
          </div>
        </div>
      </div>
    </Link>
  )
}
