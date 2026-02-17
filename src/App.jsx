import React, { useEffect, useMemo, useState } from 'react'
import Reader from './components/Reader.jsx'

const BOOKS = [
  {
    id: 'kross-part1',
    title: 'KROSS',
    subtitle: 'Часть 1',
    src: '/books/kross-part1.epub'
  }
]

export default function App() {
  const [bookId, setBookId] = useState(BOOKS[0].id)
  const book = useMemo(() => BOOKS.find(b => b.id === bookId) ?? BOOKS[0], [bookId])

  useEffect(() => {
    // Telegram WebApp init (безопасно работает и в браузере)
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor?.('#0b0b0f')
      tg.setBackgroundColor?.('#0b0b0f')
    }
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="title">{book.title}</div>
          <div className="subtitle">{book.subtitle}</div>
        </div>
        <div className="picker">
          <label className="label">Книга</label>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="select">
            {BOOKS.map(b => (
              <option key={b.id} value={b.id}>{b.title} — {b.subtitle}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="content">
        <Reader bookId={book.id} epubUrl={book.src} />
      </main>
    </div>
  )
}
