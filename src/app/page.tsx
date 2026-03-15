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
