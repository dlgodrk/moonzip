# moonzip Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고등 수학 문제집 전문 검색 & 난이도 투표 사이트 moonzip.kr 구축

**Architecture:** Next.js 서버 컴포넌트로 검색/목록 페이지를 렌더링하고, Supabase를 DB + Auth로 사용한다. 리뷰 작성/수정/삭제는 Next.js API Routes를 통해 처리한다. 기존 Python 스크래핑 파이프라인의 Excel 데이터를 Python import 스크립트로 Supabase에 적재한다.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase (PostgreSQL + Auth), TypeScript, Python (데이터 import)

**Spec:** `docs/superpowers/specs/2026-03-15-moonzip-design.md`

---

## File Structure

```
src/
  app/
    page.tsx                          # 메인 검색 페이지 (서버 컴포넌트)
    series/[id]/page.tsx              # 시리즈 상세 페이지 (서버 컴포넌트)
    auth/page.tsx                     # 로그인/회원가입 페이지
    my/page.tsx                       # 마이페이지 (서버 컴포넌트)
    api/
      reviews/route.ts                # POST (작성), PUT (수정), DELETE (삭제)
    layout.tsx                        # 루트 레이아웃 (네비게이션 포함)
    globals.css                       # 전역 스타일
  components/
    search/
      TypeFilter.tsx                  # 유형 복수선택 드롭다운
      SearchInput.tsx                 # 시리즈명 검색 입력창
      DifficultySlider.tsx            # 난이도 범위 슬라이더 + 마커
      SeriesCard.tsx                  # 시리즈 목록 카드
      SearchClient.tsx                # 검색 필터 전체 클라이언트 래퍼
    series/
      BookTable.tsx                   # 문제집 목록 테이블
      ReviewList.tsx                  # 리뷰 목록 + 역할 필터
      ReviewCard.tsx                  # 리뷰 카드 1개
      ReviewModal.tsx                 # 리뷰 작성/수정 모달
    my/
      MyReviewList.tsx                # 마이페이지 리뷰 목록 + 정렬
    layout/
      Navbar.tsx                      # 네비게이션 바
  lib/
    supabase/
      client.ts                       # 브라우저 클라이언트
      server.ts                       # 서버 컴포넌트 클라이언트
      types.ts                        # DB 타입 정의
    db/
      series.ts                       # 시리즈 쿼리 함수
      books.ts                        # 문제집 쿼리 함수
      reviews.ts                      # 리뷰 쿼리 함수
      slider-markers.ts               # 난이도 슬라이더 마커 계산
    constants.ts                      # BOOK_TYPES, EXAM_TYPES, GRADES 상수
book-list/
  scripts/
    import_to_supabase.py             # Excel → Supabase import 스크립트
```

> **URL 전략:** `/series/[id]` — UUID 사용. 한글 slug 처리 복잡도를 피하고 MVP에 집중. slug는 DB에 남겨두고 추후 pretty URL 추가 가능.

---

## Chunk 1: Foundation — Supabase 설정 & DB 스키마

### Task 1: 패키지 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd /c/Users/dlgod/Desktop/code/project/moonzip
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: 설치 확인**

```bash
npm list @supabase/supabase-js @supabase/ssr
```
Expected: 두 패키지 버전 출력됨

---

### Task 2: 환경변수 설정

**Files:**
- Create: `.env.local`
- Modify: `.gitignore` (이미 있으면 확인만)

- [ ] **Step 1: Supabase 프로젝트 생성**

  1. supabase.com 접속 → New project 생성
  2. Project name: `moonzip`
  3. Database password 기록해두기
  4. Region: Northeast Asia (Seoul)

- [ ] **Step 2: API 키 확인**

  Supabase 대시보드 → Settings → API
  - `Project URL` 복사
  - `anon public` 키 복사
  - `service_role` 키 복사 (import 스크립트용)

- [ ] **Step 3: .env.local 생성**

```bash
# /c/Users/dlgod/Desktop/code/project/moonzip/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 4: .gitignore 확인**

`.env.local`이 `.gitignore`에 있는지 확인. 없으면 추가.

---

### Task 3: DB 스키마 생성

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: supabase 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/supabase
```

- [ ] **Step 2: schema.sql 파일 생성**

```sql
-- supabase/schema.sql

-- series 테이블
create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  types text[] not null default '{}',
  created_at timestamptz default now()
);

-- books 테이블
create table if not exists books (
  id text primary key,
  isbn text,
  title text not null,
  series_id uuid references series(id) on delete set null,
  subject text,
  author text,
  publisher text,
  released_at date,
  edition text,
  status text,
  price integer,
  link text,
  cover_image text
);

-- users 테이블 (Supabase auth.users 확장)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('강사', '학생', '학부모')),
  created_at timestamptz default now()
);

-- reviews 테이블
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  difficulty integer not null check (difficulty between 1 and 10),
  content text not null,
  exam_type text check (exam_type in ('내신', '정시')),
  grade text check (grade in ('1등급', '2등급', '3등급', '4등급', '5등급', '6이하')),
  created_at timestamptz default now(),
  unique(user_id, series_id)
);

-- 인덱스
create index if not exists books_series_id_idx on books(series_id);
create index if not exists reviews_series_id_idx on reviews(series_id);
create index if not exists reviews_user_id_idx on reviews(user_id);

-- RLS 활성화
alter table series enable row level security;
alter table books enable row level security;
alter table public.users enable row level security;
alter table reviews enable row level security;

-- series: 누구나 읽기 가능
create policy "series read" on series for select using (true);

-- books: 누구나 읽기 가능
create policy "books read" on books for select using (true);

-- users: 본인만 읽기/쓰기
create policy "users read own" on public.users for select using (auth.uid() = id);
create policy "users insert own" on public.users for insert with check (auth.uid() = id);
create policy "users update own" on public.users for update using (auth.uid() = id);

-- reviews: 누구나 읽기, 본인만 쓰기/수정/삭제
create policy "reviews read" on reviews for select using (true);
create policy "reviews insert" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews update own" on reviews for update using (auth.uid() = user_id);
create policy "reviews delete own" on reviews for delete using (auth.uid() = user_id);

-- 신규 유저 가입 시 users 테이블 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', '학생')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Supabase SQL Editor에서 실행**

  Supabase 대시보드 → SQL Editor → schema.sql 내용 전체 붙여넣기 → Run

- [ ] **Step 4: 테이블 생성 확인**

  Supabase 대시보드 → Table Editor → series, books, users, reviews 테이블 확인

---

### Task 4: Supabase 클라이언트 & 타입 설정

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/types.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/lib/supabase
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/lib/db
```

- [ ] **Step 2: 브라우저 클라이언트 생성**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: 서버 클라이언트 생성**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: 타입 정의**

```typescript
// src/lib/supabase/types.ts
export type BookType = '개념서' | '유형서' | '심화서' | '기출문제집' | 'N제' | 'EBS'
export type UserRole = '강사' | '학생' | '학부모'
export type ExamType = '내신' | '정시'
export type Grade = '1등급' | '2등급' | '3등급' | '4등급' | '5등급' | '6이하'

export interface Series {
  id: string
  name: string
  slug: string | null
  types: BookType[]
  created_at: string
  // computed
  avg_difficulty?: number
  review_count?: number
  subjects?: string[]
}

export interface Book {
  id: string
  isbn: string | null
  title: string
  series_id: string | null
  subject: string | null
  author: string | null
  publisher: string | null
  released_at: string | null
  edition: string | null
  status: string | null
  price: number | null
  link: string | null
  cover_image: string | null
}

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface Review {
  id: string
  series_id: string
  user_id: string
  difficulty: number
  content: string
  exam_type: ExamType | null
  grade: Grade | null
  created_at: string
  // joined
  user?: User
  series?: Series
}
```

- [ ] **Step 5: 상수 정의**

```typescript
// src/lib/constants.ts
export const BOOK_TYPES = ['개념서', '유형서', '심화서', '기출문제집', 'N제', 'EBS'] as const
export const USER_ROLES = ['강사', '학생', '학부모'] as const
export const EXAM_TYPES = ['내신', '정시'] as const
export const GRADES = ['1등급', '2등급', '3등급', '4등급', '5등급', '6이하'] as const
```

- [ ] **Step 6: 빌드 오류 없는지 확인**

```bash
cd /c/Users/dlgod/Desktop/code/project/moonzip
npm run build
```

---

## Chunk 2: 데이터 Import — Excel → Supabase

### Task 5: Python import 스크립트 작성

**Files:**
- Create: `book-list/scripts/import_to_supabase.py`

- [ ] **Step 1: 필요 패키지 설치**

```bash
pip install supabase openpyxl pandas
```

- [ ] **Step 2: import 스크립트 작성**

```python
# book-list/scripts/import_to_supabase.py
"""
교보문고_필터결과.xlsx → Supabase import
실행: python import_to_supabase.py
"""

import pandas as pd
from supabase import create_client
import os
import re

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or input("Supabase URL: ")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or input("Service Role Key: ")

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
FILTER_FILE = os.path.join(BASE_DIR, "../db/교보문고_필터결과.xlsx")

def parse_types(type_str):
    """'유형서, EBS' → ['유형서', 'EBS']"""
    if pd.isna(type_str) or not type_str:
        return []
    return [t.strip() for t in str(type_str).split(',') if t.strip()]

def make_slug(name):
    """시리즈명 → URL 슬러그 (한글 제거, 영문/숫자/하이픈만)"""
    s = re.sub(r'[가-힣]', '', name)          # 한글 제거
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', s)    # 특수문자 제거
    s = re.sub(r'\s+', '-', s.strip()).lower()
    s = re.sub(r'-+', '-', s).strip('-')      # 중복 하이픈 정리
    return s[:80] or 'series'

def main():
    df = pd.read_excel(FILTER_FILE)
    print(f"전체: {len(df)}개 로드")

    # 1. series 테이블 insert
    series_map = {}  # name → id
    unique_series = df[['시리즈', '유형']].dropna(subset=['시리즈']).drop_duplicates(subset='시리즈')

    series_rows = []
    for _, row in unique_series.iterrows():
        name = str(row['시리즈']).strip()
        types = parse_types(row.get('유형', ''))
        series_rows.append({
            'name': name,
            'slug': make_slug(name),
            'types': types,
        })

    print(f"\n시리즈 {len(series_rows)}개 insert 중...")
    # upsert on conflict (name)
    res = supabase.table('series').upsert(series_rows, on_conflict='name').execute()
    print(f"완료: {len(res.data)}개")

    # series id 맵 구성
    all_series = supabase.table('series').select('id, name').execute()
    series_map = {s['name']: s['id'] for s in all_series.data}

    # 2. books 테이블 insert
    book_rows = []
    for _, row in df.iterrows():
        series_name = str(row.get('시리즈', '') or '').strip()
        series_id = series_map.get(series_name)

        price = row.get('판매가')
        try:
            price = int(float(str(price).replace(',', ''))) if pd.notna(price) else None
        except:
            price = None

        released_at = None
        raw_date = row.get('출시일')
        if pd.notna(raw_date):
            try:
                released_at = pd.to_datetime(raw_date).strftime('%Y-%m-%d')
            except:
                pass

        book_rows.append({
            'id':          str(row['판매상품ID']).strip(),
            'isbn':        str(row.get('상품코드', '') or '').strip() or None,
            'title':       str(row.get('상품명', '')).strip(),
            'series_id':   series_id,
            'subject':     str(row.get('과목', '') or '').strip() or None,
            'author':      str(row.get('저자', '') or '').strip() or None,
            'publisher':   str(row.get('출판사', '') or '').strip() or None,
            'released_at': released_at,
            'edition':     str(row.get('개정판여부', '') or '').strip() or None,
            'status':      str(row.get('판매현황', '') or '').strip() or None,
            'price':       price,
            'link':        str(row.get('링크', '') or '').strip() or None,
            'cover_image': str(row.get('표지이미지', '') or '').strip() or None,
        })

    print(f"\n문제집 {len(book_rows)}개 insert 중...")
    BATCH = 100
    for i in range(0, len(book_rows), BATCH):
        batch = book_rows[i:i+BATCH]
        supabase.table('books').upsert(batch, on_conflict='id').execute()
        print(f"  {i+len(batch)}/{len(book_rows)}")

    print(f"\n완료! series: {len(series_rows)}개, books: {len(book_rows)}개")

if __name__ == '__main__':
    main()
```

- [ ] **Step 3: import 실행**

```bash
cd /c/Users/dlgod/Desktop/code/project/moonzip/book-list/scripts
python import_to_supabase.py
```

- [ ] **Step 4: Supabase 대시보드에서 데이터 확인**

  - series 테이블: 수십~수백 개 시리즈 확인
  - books 테이블: 733개 문제집 확인

---

## Chunk 3: 검색 페이지

### Task 6: DB 쿼리 함수 — series

**Files:**
- Create: `src/lib/db/series.ts`
- Create: `src/lib/db/slider-markers.ts`

- [ ] **Step 1: series 쿼리 함수 작성**

```typescript
// src/lib/db/series.ts
import { createClient } from '@/lib/supabase/server'
import { Series } from '@/lib/supabase/types'

export interface SeriesSearchParams {
  types?: string[]
  keyword?: string
  diffMin?: number
  diffMax?: number
}

export async function searchSeries(params: SeriesSearchParams): Promise<Series[]> {
  const supabase = await createClient()

  // series + 리뷰 집계 + 문제집 과목 목록
  let query = supabase
    .from('series')
    .select(`
      id, name, slug, types, created_at,
      reviews(difficulty),
      books(subject)
    `)

  if (params.keyword) {
    query = query.ilike('name', `%${params.keyword}%`)
  }

  if (params.types && params.types.length > 0) {
    query = query.overlaps('types', params.types)
  }

  const { data, error } = await query.order('name')
  if (error) throw error

  return (data || []).map((s: any) => {
    const difficulties: number[] = (s.reviews || []).map((r: any) => r.difficulty)
    const avg_difficulty = difficulties.length > 0
      ? Math.round((difficulties.reduce((a: number, b: number) => a + b, 0) / difficulties.length) * 10) / 10
      : null
    const review_count = difficulties.length

    // 과목 목록 (중복 제거)
    const subjectSet = new Set<string>()
    ;(s.books || []).forEach((b: any) => {
      if (b.subject) {
        b.subject.split(',').forEach((sub: string) => {
          const trimmed = sub.trim()
          if (trimmed) subjectSet.add(trimmed)
        })
      }
    })

    // 난이도 필터
    const eff_difficulty = avg_difficulty ?? 5
    if (params.diffMin !== undefined && eff_difficulty < params.diffMin) return null
    if (params.diffMax !== undefined && eff_difficulty > params.diffMax) return null

    return {
      ...s,
      reviews: undefined,
      books: undefined,
      avg_difficulty,
      review_count,
      subjects: Array.from(subjectSet).sort(),
    } as Series
  }).filter(Boolean) as Series[]
}

export async function getSeriesById(id: string): Promise<Series | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('series')
    .select('id, name, slug, types, created_at')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: 슬라이더 마커 계산 함수**

```typescript
// src/lib/db/slider-markers.ts
import { createClient } from '@/lib/supabase/server'

export interface SliderMarker {
  seriesName: string
  avgDifficulty: number
}

export async function getSliderMarkers(): Promise<{
  low: SliderMarker | null    // 1~3
  mid: SliderMarker | null    // 4~7
  high: SliderMarker | null   // 8~10
}> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('series_id, difficulty, series(name)')

  if (!data || data.length === 0) {
    return { low: null, mid: null, high: null }
  }

  // series별 집계
  const map = new Map<string, { name: string; difficulties: number[] }>()
  for (const r of data) {
    const sid = r.series_id
    const name = (r as any).series?.name ?? ''
    if (!map.has(sid)) map.set(sid, { name, difficulties: [] })
    map.get(sid)!.difficulties.push(r.difficulty)
  }

  const series = Array.from(map.values()).map(s => ({
    name: s.name,
    avg: s.difficulties.reduce((a, b) => a + b, 0) / s.difficulties.length,
    count: s.difficulties.length,
  }))

  const findTopInRange = (min: number, max: number): SliderMarker | null => {
    const inRange = series
      .filter(s => s.avg >= min && s.avg <= max)
      .sort((a, b) => b.count - a.count)
    if (!inRange.length) return null
    return { seriesName: inRange[0].name, avgDifficulty: Math.round(inRange[0].avg * 10) / 10 }
  }

  return {
    low:  findTopInRange(1, 3),
    mid:  findTopInRange(4, 7),
    high: findTopInRange(8, 10),
  }
}
```

---

### Task 7: 검색 UI 컴포넌트

**Files:**
- Create: `src/components/search/TypeFilter.tsx`
- Create: `src/components/search/SearchInput.tsx`
- Create: `src/components/search/DifficultySlider.tsx`
- Create: `src/components/search/SeriesCard.tsx`
- Create: `src/components/search/SearchClient.tsx`

- [ ] **Step 1: 컴포넌트 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/components/search
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/components/layout
```

- [ ] **Step 2: 유형 필터 컴포넌트**

```typescript
// src/components/search/TypeFilter.tsx
'use client'
import { BOOK_TYPES } from '@/lib/constants'

interface Props {
  selected: string[]
  onChange: (types: string[]) => void
}

export function TypeFilter({ selected, onChange }: Props) {
  const toggle = (type: string) => {
    onChange(
      selected.includes(type)
        ? selected.filter(t => t !== type)
        : [...selected, type]
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BOOK_TYPES.map(type => (
        <button
          key={type}
          onClick={() => toggle(type)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selected.includes(type)
              ? 'bg-black text-white border-black'
              : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 검색 입력창**

```typescript
// src/components/search/SearchInput.tsx
'use client'
import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="시리즈명으로 검색 (예: 쎈, 개념원리)"
        className="w-full px-4 py-3 pr-10 border border-zinc-300 rounded-xl text-base focus:outline-none focus:border-zinc-500"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">🔍</span>
    </div>
  )
}
```

- [ ] **Step 4: 난이도 슬라이더**

```typescript
// src/components/search/DifficultySlider.tsx
'use client'

interface Marker {
  seriesName: string
  avgDifficulty: number
}

interface Props {
  min: number
  max: number
  onMinChange: (v: number) => void
  onMaxChange: (v: number) => void
  markers: { low: Marker | null; mid: Marker | null; high: Marker | null }
}

export function DifficultySlider({ min, max, onMinChange, onMaxChange, markers }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-zinc-500">
        <span>난이도</span>
        <span className="font-medium text-black">{min} – {max}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={1} max={10} value={min}
          onChange={e => onMinChange(Number(e.target.value))}
          className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:appearance-none"
        />
        <input
          type="range" min={1} max={10} value={max}
          onChange={e => onMaxChange(Number(e.target.value))}
          className="relative w-full h-1 appearance-none bg-zinc-200 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:appearance-none"
        />
      </div>
      {/* 마커 */}
      <div className="flex justify-between text-xs text-zinc-400 mt-3">
        {markers.low  && <span className="text-center">▲<br/>{markers.low.seriesName}</span>}
        {markers.mid  && <span className="text-center">▲<br/>{markers.mid.seriesName}</span>}
        {markers.high && <span className="text-right">▲<br/>{markers.high.seriesName}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 시리즈 카드**

```typescript
// src/components/search/SeriesCard.tsx
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
          {/* 과목 태그 */}
          {series.subjects && series.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {series.subjects.slice(0, 6).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 border border-zinc-200 rounded text-zinc-500">{s}</span>
              ))}
            </div>
          )}
        </div>
        {/* 난이도 */}
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
```

- [ ] **Step 6: SearchClient 래퍼 (클라이언트 필터 상태)**

```typescript
// src/components/search/SearchClient.tsx
'use client'
import { useState } from 'react'
import { TypeFilter } from './TypeFilter'
import { SearchInput } from './SearchInput'
import { DifficultySlider } from './DifficultySlider'
import { Series } from '@/lib/supabase/types'
import { SeriesCard } from './SeriesCard'

interface Marker { seriesName: string; avgDifficulty: number }
interface Props {
  initialSeries: Series[]
  markers: { low: Marker | null; mid: Marker | null; high: Marker | null }
}

export function SearchClient({ initialSeries, markers }: Props) {
  const [types, setTypes] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [diffMin, setDiffMin] = useState(1)
  const [diffMax, setDiffMax] = useState(10)

  const filtered = initialSeries.filter(s => {
    if (types.length > 0 && !s.types.some(t => types.includes(t))) return false
    if (keyword && !s.name.toLowerCase().includes(keyword.toLowerCase())) return false
    const eff = s.avg_difficulty ?? 5
    if (eff < diffMin || eff > diffMax) return false
    return true
  })

  return (
    <div className="space-y-4">
      <SearchInput value={keyword} onChange={setKeyword} />
      <TypeFilter selected={types} onChange={setTypes} />
      <DifficultySlider
        min={diffMin} max={diffMax}
        onMinChange={setDiffMin} onMaxChange={setDiffMax}
        markers={markers}
      />
      <div className="text-sm text-zinc-400">{filtered.length}개 시리즈</div>
      <div className="space-y-2">
        {filtered.map(s => <SeriesCard key={s.id} series={s} />)}
      </div>
    </div>
  )
}
```

---

### Task 8: 메인 페이지

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 메인 페이지 작성**

```typescript
// src/app/page.tsx
import { searchSeries } from '@/lib/db/series'
import { getSliderMarkers } from '@/lib/db/slider-markers'
import { SearchClient } from '@/components/search/SearchClient'

export default async function HomePage() {
  const [series, markers] = await Promise.all([
    searchSeries({}),
    getSliderMarkers(),
  ])

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">moonzip</h1>
      <p className="text-zinc-500 text-sm mb-6">고등 수학 문제집 난이도 검색</p>
      <SearchClient initialSeries={series} markers={markers} />
    </main>
  )
}
```

- [ ] **Step 2: 레이아웃에 Navbar 추가**

```typescript
// src/app/layout.tsx (기존 파일 수정)
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'moonzip — 수학 문제집 난이도 검색',
  description: '고등 수학 문제집을 난이도·유형별로 찾아보세요',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Navbar 컴포넌트**

```typescript
// src/components/layout/Navbar.tsx
import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="border-b border-zinc-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">moonzip</Link>
        <div className="flex gap-4 text-sm text-zinc-500">
          <Link href="/my" className="hover:text-black">내 리뷰</Link>
          <Link href="/auth" className="hover:text-black">로그인</Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: dev 서버 실행 & 확인**

```bash
npm run dev
```

브라우저에서 `localhost:3000` 접속 → 시리즈 목록 & 검색 필터 동작 확인

- [ ] **Step 5: 커밋**

```bash
git init  # 아직 git 없으면
git add src/ book-list/scripts/import_to_supabase.py supabase/ .env.local.example
git commit -m "feat: 검색 페이지 & Supabase 연동"
```

---

## Chunk 4: 시리즈 상세 페이지

### Task 9: DB 쿼리 함수 — books & reviews

**Files:**
- Create: `src/lib/db/books.ts`
- Create: `src/lib/db/reviews.ts`

- [ ] **Step 1: books 쿼리**

```typescript
// src/lib/db/books.ts
import { createClient } from '@/lib/supabase/server'
import { Book } from '@/lib/supabase/types'

export async function getBooksBySeries(seriesId: string): Promise<Book[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('series_id', seriesId)
    .order('subject')
  if (error) throw error
  return data || []
}
```

- [ ] **Step 2: reviews 쿼리**

```typescript
// src/lib/db/reviews.ts
import { createClient } from '@/lib/supabase/server'
import { Review } from '@/lib/supabase/types'

export async function getReviewsBySeries(seriesId: string): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:users(id, role, email)')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Review[]
}

export async function getMyReview(seriesId: string, userId: string): Promise<Review | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .single()
  return data || null
}

export async function getMyReviews(userId: string): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, series(id, name, types)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Review[]
}
```

---

### Task 10: 시리즈 상세 컴포넌트 & 페이지

**Files:**
- Create: `src/components/series/BookTable.tsx`
- Create: `src/components/series/ReviewCard.tsx`
- Create: `src/components/series/ReviewList.tsx`
- Create: `src/app/series/[id]/page.tsx`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/components/series
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/app/series/placeholder
rmdir /c/Users/dlgod/Desktop/code/project/moonzip/src/app/series/placeholder
```

- [ ] **Step 2: 문제집 목록 테이블**

```typescript
// src/components/series/BookTable.tsx
import { Book } from '@/lib/supabase/types'

export function BookTable({ books }: { books: Book[] }) {
  if (!books.length) return <p className="text-zinc-400 text-sm">등록된 문제집이 없습니다.</p>

  return (
    <div className="space-y-2">
      {books.map(book => (
        <div key={book.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
          <div>
            <span className="text-xs text-zinc-400 mr-2">{book.subject}</span>
            <span className="text-sm">{book.title}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {book.price && (
              <span className="text-sm text-zinc-500">{book.price.toLocaleString()}원</span>
            )}
            {book.link && (
              <a
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 border border-zinc-300 rounded hover:bg-zinc-50"
              >
                교보문고 ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 리뷰 카드**

```typescript
// src/components/series/ReviewCard.tsx
import { Review } from '@/lib/supabase/types'

export function ReviewCard({ review }: { review: Review }) {
  const role = review.user?.role ?? '익명'
  const meta = [review.exam_type, review.grade].filter(Boolean).join(' · ')

  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-zinc-600">{role}</span>
        <span className="text-xs text-zinc-400">난이도 {review.difficulty}</span>
        {meta && <span className="text-xs text-zinc-400">{meta} 추천</span>}
      </div>
      <p className="text-sm text-zinc-800">{review.content}</p>
    </div>
  )
}
```

- [ ] **Step 4: 리뷰 목록 (역할 필터 포함)**

```typescript
// src/components/series/ReviewList.tsx
'use client'
import { useState } from 'react'
import { Review, UserRole } from '@/lib/supabase/types'
import { ReviewCard } from './ReviewCard'

const ROLE_FILTERS: (UserRole | '전체')[] = ['전체', '강사', '학생', '학부모']

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [filter, setFilter] = useState<UserRole | '전체'>('전체')

  const filtered = filter === '전체'
    ? reviews
    : reviews.filter(r => r.user?.role === filter)

  const counts = {
    강사: reviews.filter(r => r.user?.role === '강사').length,
    학생: reviews.filter(r => r.user?.role === '학생').length,
    학부모: reviews.filter(r => r.user?.role === '학부모').length,
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {ROLE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === f ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
            }`}
          >
            {f}
            {f !== '전체' && ` ${counts[f as UserRole]}`}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <p className="text-zinc-400 text-sm py-4">아직 리뷰가 없어요. 첫 번째가 되세요!</p>
        : filtered.map(r => <ReviewCard key={r.id} review={r} />)
      }
    </div>
  )
}
```

- [ ] **Step 5: 시리즈 상세 페이지**

```typescript
// src/app/series/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getSeriesById } from '@/lib/db/series'
import { getBooksBySeries } from '@/lib/db/books'
import { getReviewsBySeries } from '@/lib/db/reviews'
import { BookTable } from '@/components/series/BookTable'
import { ReviewList } from '@/components/series/ReviewList'

interface Props { params: Promise<{ id: string }> }

export default async function SeriesPage({ params }: Props) {
  const { id } = await params
  const [series, books, reviews] = await Promise.all([
    getSeriesById(id),
    getBooksBySeries(id),
    getReviewsBySeries(id),
  ])
  if (!series) notFound()

  const difficulties = reviews.map(r => r.difficulty)
  const avg = difficulties.length > 0
    ? (difficulties.reduce((a, b) => a + b, 0) / difficulties.length).toFixed(1)
    : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{series.name}</h1>
            <div className="flex gap-1 mt-1">
              {series.types.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600">{t}</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{avg ?? '5.0'}</div>
            <div className="text-xs text-zinc-400">
              {reviews.length > 0 ? `${reviews.length}명 투표` : '아직 투표 없음'}
            </div>
          </div>
        </div>
      </div>

      {/* 문제집 목록 */}
      <section>
        <h2 className="font-semibold mb-3">📚 문제집 목록</h2>
        <BookTable books={books} />
      </section>

      {/* 리뷰 */}
      <section>
        <h2 className="font-semibold mb-3">
          💬 리뷰
          <span className="text-zinc-400 font-normal text-sm ml-2">
            강사 {reviews.filter(r => r.user?.role === '강사').length} ·
            학생 {reviews.filter(r => r.user?.role === '학생').length} ·
            학부모 {reviews.filter(r => r.user?.role === '학부모').length}
          </span>
        </h2>
        <ReviewList reviews={reviews} />
        <button className="mt-4 w-full py-2.5 border border-zinc-300 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
          리뷰 작성하기 →
        </button>
      </section>
    </main>
  )
}
```

- [ ] **Step 6: dev 서버에서 시리즈 상세 페이지 확인**

  `localhost:3000/series/[series-id]` 접속해서 문제집 목록 + 리뷰 섹션 확인

- [ ] **Step 7: 커밋**

```bash
git add src/
git commit -m "feat: 시리즈 상세 페이지"
```

---

## Chunk 5: 인증 (회원가입 / 로그인)

### Task 11: Auth 페이지

**Files:**
- Create: `src/app/auth/page.tsx`
- Create: `src/app/api/auth/callback/route.ts`

- [ ] **Step 1: auth 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/app/auth
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/app/api/auth/callback
```

- [ ] **Step 2: Supabase Auth Email 설정**

  Supabase 대시보드 → Authentication → Providers → Email 활성화
  - Confirm email: OFF (개발 단계에서는 이메일 인증 없이)
  - Site URL: `http://localhost:3000` (개발), 배포 후 `https://moonzip.kr`로 변경

- [ ] **Step 3: Auth 콜백 라우트**

```typescript
// src/app/api/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(origin)
}
```

- [ ] **Step 4: Auth 페이지 (로그인 + 회원가입 탭)**

```typescript
// src/app/auth/page.tsx
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

      {/* 탭 */}
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
```

- [ ] **Step 5: Navbar에 로그인 상태 반영**

```typescript
// src/components/layout/Navbar.tsx (수정)
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
```

- [ ] **Step 5: LogoutButton 클라이언트 컴포넌트**

```typescript
// src/components/layout/LogoutButton.tsx
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
```

- [ ] **Step 6: 회원가입 → 로그인 → 로그아웃 플로우 직접 테스트**

- [ ] **Step 7: 커밋**

```bash
git add src/
git commit -m "feat: 회원가입/로그인 (강사·학생·학부모 역할)"
```

---

## Chunk 6: 리뷰 기능

### Task 12: 리뷰 API Route

**Files:**
- Create: `src/app/api/reviews/route.ts`

- [ ] **Step 1: reviews API 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/app/api/reviews
```

- [ ] **Step 2: 리뷰 API 작성**

```typescript
// src/app/api/reviews/route.ts
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
```

---

### Task 13: 리뷰 모달 컴포넌트

**Files:**
- Create: `src/components/series/ReviewModal.tsx`

- [ ] **Step 1: 리뷰 모달 작성**

```typescript
// src/components/series/ReviewModal.tsx
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

        {/* 난이도 선택 */}
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

        {/* 리뷰 텍스트 */}
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

        {/* 추천 대상 (선택) */}
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
```

---

### Task 14: 시리즈 상세 페이지에 리뷰 기능 연결

**Files:**
- Create: `src/components/series/ReviewSection.tsx`
- Modify: `src/app/series/[id]/page.tsx`

- [ ] **Step 1: ReviewSection 클라이언트 컴포넌트**

```typescript
// src/components/series/ReviewSection.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Review, User } from '@/lib/supabase/types'
import { ReviewList } from './ReviewList'
import { ReviewModal } from './ReviewModal'

interface Props {
  seriesId: string
  seriesName: string
  reviews: Review[]
  currentUser: User | null
  myReview: Review | null
}

export function ReviewSection({ seriesId, seriesName, reviews, currentUser, myReview }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleDelete = async () => {
    if (!myReview || !confirm('리뷰를 삭제할까요?')) return
    await fetch(`/api/reviews?id=${myReview.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <ReviewList reviews={reviews} />

      <div className="mt-4">
        {currentUser ? (
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)}
              className="flex-1 py-2.5 border border-zinc-300 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
              {myReview ? '내 리뷰 수정 →' : '리뷰 작성하기 →'}
            </button>
            {myReview && (
              <button onClick={handleDelete}
                className="px-4 py-2.5 border border-red-200 text-red-400 rounded-xl text-sm hover:bg-red-50">
                삭제
              </button>
            )}
          </div>
        ) : (
          <a href="/auth" className="block text-center py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50">
            로그인하고 리뷰 작성하기 →
          </a>
        )}
      </div>

      {showModal && (
        <ReviewModal
          seriesId={seriesId}
          seriesName={seriesName}
          existing={myReview}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 시리즈 상세 페이지 수정 — ReviewSection 연결**

`src/app/series/[id]/page.tsx`의 리뷰 섹션을 아래로 교체:

```typescript
// series/[id]/page.tsx 상단에 추가할 import
import { createClient } from '@/lib/supabase/server'
import { getMyReview } from '@/lib/db/reviews'
import { ReviewSection } from '@/components/series/ReviewSection'

// page 함수 내 데이터 fetch 부분에 추가:
const supabase = await createClient()
const { data: { user: authUser } } = await supabase.auth.getUser()

let currentUser = null
let myReview = null
if (authUser) {
  const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  currentUser = data
  myReview = await getMyReview(id, authUser.id)
}

// 기존 리뷰 섹션 <section> 안의 <ReviewList> + <button> 을 아래로 교체:
<ReviewSection
  seriesId={id}
  seriesName={series.name}
  reviews={reviews}
  currentUser={currentUser}
  myReview={myReview}
/>
```

- [ ] **Step 3: 리뷰 작성 → 수정 → 삭제 플로우 직접 테스트**

- [ ] **Step 4: 커밋**

```bash
git add src/
git commit -m "feat: 리뷰 작성/수정/삭제 + 난이도 투표"
```

---

## Chunk 7: 마이페이지

### Task 15: 마이페이지

**Files:**
- Create: `src/components/my/MyReviewList.tsx`
- Create: `src/app/my/page.tsx`

- [ ] **Step 1: my 디렉토리 생성**

```bash
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/components/my
mkdir -p /c/Users/dlgod/Desktop/code/project/moonzip/src/app/my
```

- [ ] **Step 2: MyReviewList 컴포넌트**

```typescript
// src/components/my/MyReviewList.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Review } from '@/lib/supabase/types'
import { ReviewModal } from '@/components/series/ReviewModal'

type SortKey = 'latest' | 'difficulty_asc' | 'difficulty_desc'

export function MyReviewList({ reviews }: { reviews: Review[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<SortKey>('latest')
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  const sorted = [...reviews].sort((a, b) => {
    if (sort === 'latest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sort === 'difficulty_asc') return a.difficulty - b.difficulty
    return b.difficulty - a.difficulty
  })

  const handleDelete = async (id: string) => {
    if (!confirm('리뷰를 삭제할까요?')) return
    await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      {/* 정렬 */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'latest', label: '최신순' },
          { key: 'difficulty_asc', label: '난이도 낮은순' },
          { key: 'difficulty_desc', label: '난이도 높은순' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSort(key)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              sort === key ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-zinc-400 text-sm py-8 text-center">
          아직 작성한 리뷰가 없어요.<br />
          <Link href="/" className="underline">문제집을 찾아보세요 →</Link>
        </p>
      )}

      <div className="space-y-3">
        {sorted.map(r => (
          <div key={r.id} className="p-4 border border-zinc-200 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/series/${r.series_id}`} className="font-medium hover:underline">
                  {(r as any).series?.name ?? '시리즈'}
                </Link>
                <div className="flex gap-2 mt-1 text-xs text-zinc-400">
                  <span>난이도 {r.difficulty}</span>
                  {r.exam_type && <span>{r.exam_type}</span>}
                  {r.grade && <span>{r.grade} 추천</span>}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditingReview(r)} className="text-zinc-400 hover:text-black">수정</button>
                <button onClick={() => handleDelete(r.id)} className="text-red-300 hover:text-red-500">삭제</button>
              </div>
            </div>
            <p className="text-sm mt-2 text-zinc-700">{r.content}</p>
          </div>
        ))}
      </div>

      {editingReview && (
        <ReviewModal
          seriesId={editingReview.series_id}
          seriesName={(editingReview as any).series?.name ?? '시리즈'}
          existing={editingReview}
          onClose={() => setEditingReview(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 마이페이지**

```typescript
// src/app/my/page.tsx
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
```

- [ ] **Step 4: 마이페이지 전체 플로우 확인**

  - 로그인 상태에서 `/my` 접속
  - 리뷰 목록 표시, 정렬 버튼 동작 확인
  - 미로그인 시 `/auth`로 리다이렉트 확인

- [ ] **Step 5: 커밋**

```bash
git add src/
git commit -m "feat: 마이페이지 (내 리뷰 목록 + 정렬)"
```

---

## Chunk 8: 배포

### Task 16: Vercel 배포

- [ ] **Step 1: GitHub 레포 생성 & push**

```bash
cd /c/Users/dlgod/Desktop/code/project/moonzip
git remote add origin https://github.com/<username>/moonzip.git
git push -u origin main
```

- [ ] **Step 2: Vercel 배포**

  1. vercel.com 접속 → Import Project → GitHub 레포 선택
  2. Environment Variables에 아래 2개 추가:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     > `SUPABASE_SERVICE_ROLE_KEY`는 Python import 스크립트 전용 — Vercel에 추가 불필요
  3. Deploy

- [ ] **Step 3: Supabase Auth Site URL 수정**

  Supabase 대시보드 → Authentication → URL Configuration
  - Site URL: `https://moonzip.kr` (또는 Vercel 제공 URL)
  - Redirect URLs에 `https://moonzip.kr/**` 추가

- [ ] **Step 4: 가비아 도메인 연결**

  1. Vercel 대시보드 → Domains → `moonzip.kr` 추가
  2. Vercel이 제공하는 DNS 레코드를 가비아 DNS 관리 페이지에 입력
  3. 전파 완료(최대 24시간) 후 `moonzip.kr` 접속 확인

- [ ] **Step 5: 전체 플로우 최종 확인**

  - 메인 검색 & 필터
  - 시리즈 상세 + 문제집 목록
  - 회원가입 → 리뷰 작성 → 마이페이지
  - 모바일 화면에서도 동작 확인

- [ ] **Step 6: 시드 데이터 입력**

  운영자 계정으로 로그인 후 수력충전(3), 쎈(6), 블랙라벨(8) 리뷰 직접 작성
  → 슬라이더 마커 실시간 반영 확인
