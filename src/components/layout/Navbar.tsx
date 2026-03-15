import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="border-b border-zinc-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">moonzip</Link>
        <div className="flex gap-4 text-sm text-zinc-500">
          {user ? (
            <>
              <Link href="/my" className="hover:text-black">내 리뷰</Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth" className="hover:text-black">로그인</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
