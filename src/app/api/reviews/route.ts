import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json()
  const { series_id, difficulty, content, exam_type, grade } = body

  if (!series_id || !difficulty || !content) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .upsert({
      series_id,
      user_id: user.id,
      difficulty: Number(difficulty),
      content: content.trim(),
      exam_type: exam_type || null,
      grade: grade || null,
    }, { onConflict: 'user_id,series_id' })
    .select('*, user:users(id, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
