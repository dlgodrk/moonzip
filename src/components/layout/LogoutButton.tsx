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
  return <button onClick={handleLogout} className="hover:text-black">로그아웃</button>
}
