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
