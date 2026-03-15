import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyReviews } from '@/lib/db/reviews'
import { MyReviewList } from '@/components/my/MyReviewList'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [reviews, userData] = await Promise.all([
    getMyReviews(user.id),
    supabase.from('users').select('*').eq('id', user.id).single(),
  ])

  const role = userData.data?.role ?? ''

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">내 리뷰</h1>
        <p className="text-sm text-zinc-400 mt-1">{user.email} · {role}</p>
      </div>
      <MyReviewList reviews={reviews} />
    </main>
  )
}
