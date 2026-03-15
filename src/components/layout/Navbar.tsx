import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/60">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-base tracking-tight text-zinc-900">
          moonzip
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link href="/my" className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">
                내 리뷰
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth" className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors">
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
