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
    s = re.sub(r'[가-힣]', '', name)
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s.strip()).lower()
    s = re.sub(r'-+', '-', s).strip('-')
    return s[:80] or 'series'

def main():
    df = pd.read_excel(FILTER_FILE)
    print(f"전체: {len(df)}개 로드")

    # 1. series 테이블 insert
    series_map = {}
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
