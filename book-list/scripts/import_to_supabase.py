"""
교보문고_필터결과.xlsx → Supabase import (requests 버전)
실행: python import_to_supabase.py
"""

import pandas as pd
import requests
import json
import os
import re

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or input("Supabase URL: ")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or input("Service Role Key: ")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

def rest(method, table, data=None, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.request(method, url, headers=HEADERS, json=data, params=params)
    if not r.ok:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return []
    return r.json() if r.text else []

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
FILTER_FILE = os.path.join(BASE_DIR, "../db/교보문고_필터결과.xlsx")

def parse_types(type_str):
    if pd.isna(type_str) or not type_str:
        return []
    return [t.strip() for t in str(type_str).split(',') if t.strip()]

def make_slug(name):
    s = re.sub(r'[가-힣]', '', name)
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s.strip()).lower()
    s = re.sub(r'-+', '-', s).strip('-')
    return s[:80]  # 빈 문자열 반환 가능

def main():
    df = pd.read_excel(FILTER_FILE)
    print(f"전체: {len(df)}개 로드")

    # 1. series insert
    unique_series = df[['시리즈', '유형']].dropna(subset=['시리즈']).drop_duplicates(subset='시리즈')
    series_rows = []
    for _, row in unique_series.iterrows():
        name = str(row['시리즈']).strip()
        series_rows.append({
            'name': name,
            'types': parse_types(row.get('유형', '')),
        })

    print(f"\n시리즈 {len(series_rows)}개 insert 중...")
    rest("POST", "series", series_rows)
    print("완료")

    # series id 맵
    all_series = rest("GET", "series", params={"select": "id,name", "limit": "1000"})
    series_map = {s['name']: s['id'] for s in all_series}
    print(f"시리즈 id 맵: {len(series_map)}개")

    # 2. books insert
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
        if pd.notna(row.get('출시일')):
            try:
                released_at = pd.to_datetime(row['출시일']).strftime('%Y-%m-%d')
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
        rest("POST", "books", batch)
        print(f"  {i+len(batch)}/{len(book_rows)}")

    print(f"\n완료! series: {len(series_rows)}개, books: {len(book_rows)}개")

if __name__ == '__main__':
    main()
