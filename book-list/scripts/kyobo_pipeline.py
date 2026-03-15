"""
교보문고 DB 유지보수 파이프라인

일일 실행:
  python kyobo_pipeline.py

주간 실행 (판매현황 전체 갱신):
  python kyobo_pipeline.py --refresh
"""

import sys
import os
import importlib.util
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR    = os.path.join(SCRIPTS_DIR, '..', 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

def load(script):
    path = os.path.join(SCRIPTS_DIR, script)
    spec = importlib.util.spec_from_file_location(script, path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def section(title):
    print(f"\n{'='*50}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {title}")
    print(f"{'='*50}")

def main():
    refresh = '--refresh' in sys.argv
    start   = datetime.now()
    log     = []

    def log_line(s=''):
        print(s)
        log.append(s)

    log_line(f"파이프라인 시작: {start.strftime('%Y-%m-%d %H:%M:%S')}")
    log_line(f"모드: {'주간 (전체 판매현황 갱신 포함)' if refresh else '일일'}")

    # ================================================================
    # 1단계: diff
    # ================================================================
    section("1단계: 신규 ID 추출 (kyobo_diff)")
    diff_result = load('kyobo_diff.py').main()
    if diff_result is None:
        diff_result = {'raw_total': 0, 'db_total': 0, 'added': 0}

    # ================================================================
    # 2단계: 증분 스크래핑
    # ================================================================
    section("2단계: 신규 항목 스크래핑 (kyobo_scraper_incremental)")
    if diff_result['added'] == 0:
        print("신규 항목 없음 → 스크래핑 스킵")
        scrape_result = {'total': 0, 'errors': [], '절판': [], 'matched': [], 'unmatched': []}
    else:
        scrape_result = load('kyobo_scraper_incremental.py').main()

    # ================================================================
    # 3단계: rematch
    # ================================================================
    section("3단계: 시리즈/유형 재매칭 (kyobo_rematch)")
    rematch_result = load('kyobo_rematch.py').main()

    # ================================================================
    # 4단계: refresh (주간)
    # ================================================================
    if refresh:
        section("4단계: 전체 판매현황 갱신 (kyobo_refresh)")
        load('kyobo_refresh.py').main()

    # ================================================================
    # 마지막: filter
    # ================================================================
    section(f"{'5' if refresh else '4'}단계: 필터링 (kyobo_filter)")
    filter_result = load('kyobo_filter.py').main()

    # ================================================================
    # 로그 작성
    # ================================================================
    end     = datetime.now()
    elapsed = str(end - start).split('.')[0]

    lines = []
    lines.append('=' * 60)
    lines.append(f'📋 종합 요약 ({start.strftime("%Y-%m-%d %H:%M:%S")})')
    lines.append('=' * 60)
    lines.append('')
    lines.append(f'신규 문제집 {scrape_result["total"]}개 추가')
    lines.append(f'  - 시리즈 매칭됨: {len(scrape_result["matched"])}개')
    if scrape_result['matched']:
        for title, series in scrape_result['matched']:
            lines.append(f'      · {title}  →  {series}')
    lines.append(f'  - 시리즈 없음 (검토 필요): {len(scrape_result["unmatched"])}개')
    if scrape_result['unmatched']:
        for t in scrape_result['unmatched']:
            lines.append(f'      · {t}')
    lines.append(f'  - 처음부터 절판: {len(scrape_result["절판"])}개')
    if scrape_result['절판']:
        for t in scrape_result['절판']:
            lines.append(f'      · {t}')
    lines.append('')
    lines.append('=' * 60)
    lines.append('📁 파일별 상세')
    lines.append('=' * 60)
    lines.append('')
    lines.append('[1단계 kyobo_diff]')
    lines.append(f'  raw 전체: {diff_result["raw_total"]}개 / 기존 DB: {diff_result["db_total"]}개 / 신규: {diff_result["added"]}개')
    lines.append('')
    lines.append('[2단계 kyobo_scraper_incremental]')
    lines.append(f'  스크래핑: {scrape_result["total"]}개 / 오류: {len(scrape_result["errors"])}개')
    if scrape_result['errors']:
        for e in scrape_result['errors']:
            lines.append(f'    · {e}')
    lines.append('')
    lines.append('[3단계 kyobo_rematch]')
    lines.append(f'  시리즈: {rematch_result["before_series"]}개 → {rematch_result["after_series"]}개 (+{rematch_result["after_series"] - rematch_result["before_series"]}개)')
    lines.append(f'  유형:   {rematch_result["before_type"]}개 → {rematch_result["after_type"]}개 (+{rematch_result["after_type"] - rematch_result["before_type"]}개)')
    lines.append('')
    lines.append(f'[{"4단계 kyobo_refresh" if refresh else ""}]')
    if refresh:
        lines.append('  전체 판매현황 갱신 완료')
        lines.append('')
    lines.append(f'[{"5" if refresh else "4"}단계 kyobo_filter]')
    lines.append(f'  절판 제외: {filter_result["절판"]}개')
    lines.append(f'  구판 제외: {filter_result["구판"]}개')
    lines.append(f'  시리즈없음 제외: {filter_result["시리즈없음"]}개')
    if filter_result['시리즈없음_목록']:
        for t in filter_result['시리즈없음_목록'][:20]:
            lines.append(f'    · {t}')
        if len(filter_result['시리즈없음_목록']) > 20:
            lines.append(f'    ... 외 {len(filter_result["시리즈없음_목록"]) - 20}개')
    lines.append(f'  중복 제거: {filter_result["중복"]}개')
    lines.append(f'  최종 DB: {filter_result["최종"]}개')
    lines.append('')
    lines.append(f'총 소요시간: {elapsed}')
    lines.append('=' * 60)

    # 로그 파일 저장
    log_path = os.path.join(LOGS_DIR, f'{start.strftime("%Y-%m-%d_%H-%M-%S")}.txt')
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print('\n')
    print('\n'.join(lines))
    print(f'\n로그 저장 → {log_path}')

if __name__ == '__main__':
    main()