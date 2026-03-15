import Link from 'next/link'
import { Series } from '@/lib/supabase/types'

function DifficultyBadge({ value }: { value: number | null | undefined }) {
  const v = value ?? 5
  const color =
    v <= 3 ? 'bg-blue-50 text-blue-600' :
    v <= 6 ? 'bg-amber-50 text-amber-600' :
             'bg-red-50 text-red-600'
  return (
    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}>
      <span className="text-lg font-bold leading-none">{v.toFixed(1)}</span>
    </div>
  )
}

export function SeriesCard({ series }: { series: Series }) {
  const hasVotes = series.review_count && series.review_count > 0

  return (
    <Link
      href={`/series/${series.id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <DifficultyBadge value={series.avg_difficulty} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-zinc-900">{series.name}</h3>
          {series.types.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500 font-medium">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {series.subjects && series.subjects.slice(0, 4).map(s => (
            <span key={s} className="text-xs text-zinc-400">{s}</span>
          ))}
          {series.subjects && series.subjects.length > 4 && (
            <span className="text-xs text-zinc-300">+{series.subjects.length - 4}</span>
          )}
        </div>
      </div>
      <div className="text-xs text-zinc-400 shrink-0">
        {hasVotes ? `${series.review_count}명` : '—'}
      </div>
    </Link>
  )
}
