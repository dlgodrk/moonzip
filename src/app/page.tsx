import { searchSeries } from '@/lib/db/series'
import { getSliderMarkers } from '@/lib/db/slider-markers'
import { SearchClient } from '@/components/search/SearchClient'

export default async function HomePage() {
  const [series, markers] = await Promise.all([
    searchSeries({}),
    getSliderMarkers(),
  ])

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-1">수학 문제집 찾기</h1>
        <p className="text-zinc-500 text-sm">난이도·유형별로 딱 맞는 문제집을 찾아보세요</p>
      </div>
      <SearchClient initialSeries={series} markers={markers} />
    </main>
  )
}
