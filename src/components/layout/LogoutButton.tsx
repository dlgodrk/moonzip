'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }
  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
    >
      로그아웃
    </button>
  )
}
