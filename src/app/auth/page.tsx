'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { USER_ROLES } from '@/lib/constants'
import { UserRole } from '@/lib/supabase/types'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('학생')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  const handleSignup = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-bold mb-6 text-center">moonzip</h1>

      <div className="flex border-b mb-6">
        {(['login', 'signup'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-black text-black' : 'border-transparent text-zinc-400'
            }`}
          >
            {t === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />

        {tab === 'signup' && (
          <div className="flex gap-2">
            {USER_ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm border rounded-xl transition-colors ${
                  role === r ? 'bg-black text-white border-black' : 'border-zinc-300 text-zinc-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={tab === 'login' ? handleLogin : handleSignup}
          disabled={loading}
          className="w-full py-3 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {loading ? '처리 중...' : tab === 'login' ? '로그인' : '회원가입'}
        </button>
      </div>
    </main>
  )
}
