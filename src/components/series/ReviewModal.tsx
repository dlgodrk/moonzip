'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EXAM_TYPES, GRADES } from '@/lib/constants'
import { Review } from '@/lib/supabase/types'

interface Props {
  seriesId: string
  seriesName: string
  existing?: Review | null
  onClose: () => void
}

export function ReviewModal({ seriesId, seriesName, existing, onClose }: Props) {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 0)
  const [content, setContent] = useState(existing?.content ?? '')
  const [examType, setExamType] = useState(existing?.exam_type ?? '')
  const [grade, setGrade] = useState(existing?.grade ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!difficulty || !content.trim()) { setError('난이도와 리뷰를 입력해주세요'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        series_id: seriesId,
        difficulty,
        content: content.trim(),
        exam_type: examType || null,
        grade: grade || null,
      }),
    })

    if (!res.ok) { setError('저장 실패. 다시 시도해주세요.'); setLoading(false); return }

    const isFirst = !existing
    router.refresh()
    onClose()
    if (isFirst) alert('첫 번째 리뷰어예요! 🎉')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{seriesName} 리뷰</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-black">✕</button>
        </div>

        <div>
          <p className="text-sm text-zinc-500 mb-2">난이도 <span className="text-red-400">*</span></p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setDifficulty(n)}
                className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                  difficulty === n ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-zinc-500 mb-2">리뷰 <span className="text-red-400">*</span></p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="한 줄이면 충분해요"
            rows={2}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm resize-none focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <p className="text-sm text-zinc-400 mb-2">추천 대상 <span className="text-zinc-300">(선택)</span></p>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {EXAM_TYPES.map(t => (
                <button key={t} onClick={() => setExamType(examType === t ? '' : t)}
                  className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                    examType === t ? 'bg-zinc-800 text-white border-zinc-800' : 'border-zinc-200 text-zinc-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="flex-1 text-xs border border-zinc-200 rounded-lg px-2 text-zinc-500 focus:outline-none">
              <option value="">등급 선택</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? '저장 중...' : existing ? '수정하기' : '리뷰 등록'}
        </button>
      </div>
    </div>
  )
}
