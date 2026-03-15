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
