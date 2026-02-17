import React, { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'

function safeTg() {
  return window.Telegram?.WebApp
}

function cloudGet(key) {
  const tg = safeTg()
  return new Promise(resolve => {
    if (!tg?.CloudStorage?.getItem) return resolve(null)
    tg.CloudStorage.getItem(key, (err, val) => {
      if (err) return resolve(null)
      resolve(val ?? null)
    })
  })
}

function cloudSet(key, value) {
  const tg = safeTg()
  return new Promise(resolve => {
    if (!tg?.CloudStorage?.setItem) return resolve(false)
    tg.CloudStorage.setItem(key, value, (err) => {
      resolve(!err)
    })
  })
}

export default function Reader({ bookId, epubUrl }) {
  const viewerRef = useRef(null)
  const renditionRef = useRef(null)
  const bookRef = useRef(null)

  const [toc, setToc] = useState([])
  const [location, setLocation] = useState('')
  const [fontSize, setFontSize] = useState(110)
  const [theme, setTheme] = useState('dark')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const storageKey = useMemo(() => `reader:${bookId}:cfi`, [bookId])
  const fontKey = useMemo(() => `reader:${bookId}:font`, [bookId])
  const themeKey = useMemo(() => `reader:${bookId}:theme`, [bookId])

  useEffect(() => {
    let destroyed = false

    async function init() {
      // settings
      const savedFont = localStorage.getItem(fontKey)
      const savedTheme = localStorage.getItem(themeKey)
      if (savedFont) setFontSize(Number(savedFont))
      if (savedTheme) setTheme(savedTheme)

      // restore location from CloudStorage first (Telegram), fallback to localStorage
      const cloudCfi = await cloudGet(storageKey)
      const localCfi = localStorage.getItem(storageKey)
      const startCfi = cloudCfi || localCfi || null

      if (!viewerRef.current) return

      // clean old
      if (renditionRef.current) {
        try { renditionRef.current.destroy() } catch {}
        renditionRef.current = null
      }
      if (bookRef.current) {
        try { bookRef.current.destroy() } catch {}
        bookRef.current = null
      }

      const book = ePub(epubUrl)
      bookRef.current = book

      // toc
      book.loaded.navigation.then(nav => {
        if (destroyed) return
        setToc(nav.toc || [])
      })

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none'
      })
      renditionRef.current = rendition

      // themes
      const applyTheme = (nextTheme, nextFontSize) => {
        const isDark = nextTheme === 'dark'
        rendition.themes.register('app', {
          'body': {
            'background': isDark ? '#0b0b0f' : '#ffffff',
            'color': isDark ? '#e9e9f2' : '#12121a',
            'font-family': 'Georgia, serif',
            'line-height': '1.55'
          },
          'p': { 'margin': '0 0 1em 0' },
          'h1,h2,h3': { 'font-family': 'Georgia, serif' }
        })
        rendition.themes.select('app')
        rendition.themes.fontSize(`${nextFontSize}%`)
      }

      applyTheme(theme, fontSize)

      // display
      await rendition.display(startCfi || undefined)

      // events
      rendition.on('relocated', (loc) => {
        const cfi = loc?.start?.cfi
        if (!cfi) return
        setLocation(cfi)
        localStorage.setItem(storageKey, cfi)
        cloudSet(storageKey, cfi)
      })

      // keyboard (desktop)
      const onKey = (e) => {
        if (e.key === 'ArrowRight') rendition.next()
        if (e.key === 'ArrowLeft') rendition.prev()
      }
      window.addEventListener('keydown', onKey)

      // cleanup
      return () => window.removeEventListener('keydown', onKey)
    }

    const cleanupPromise = init()

    return () => {
      destroyed = true
      Promise.resolve(cleanupPromise).then((cleanup) => cleanup?.())
      try { renditionRef.current?.destroy?.() } catch {}
      try { bookRef.current?.destroy?.() } catch {}
      renditionRef.current = null
      bookRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, epubUrl])

  // apply theme/font changes live
  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    localStorage.setItem(fontKey, String(fontSize))
    localStorage.setItem(themeKey, theme)

    const isDark = theme === 'dark'
    rendition.themes.register('app', {
      'body': {
        'background': isDark ? '#0b0b0f' : '#ffffff',
        'color': isDark ? '#e9e9f2' : '#12121a',
        'font-family': 'Georgia, serif',
        'line-height': '1.55'
      },
      'p': { 'margin': '0 0 1em 0' },
      'h1,h2,h3': { 'font-family': 'Georgia, serif' }
    })
    rendition.themes.select('app')
    rendition.themes.fontSize(`${fontSize}%`)
  }, [fontSize, theme, fontKey, themeKey])

  const goTo = async (href) => {
    const rendition = renditionRef.current
    if (!rendition) return
    await rendition.display(href)
    setIsMenuOpen(false)
  }

  const next = () => renditionRef.current?.next?.()
  const prev = () => renditionRef.current?.prev?.()

  return (
    <div className={`reader ${theme === 'dark' ? 'dark' : 'light'}`}>
      <aside className={`menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menuHeader">
          <div className="menuTitle">Оглавление</div>
          <button className="iconBtn" onClick={() => setIsMenuOpen(false)} aria-label="Закрыть">×</button>
        </div>

        <div className="menuControls">
          <div className="controlRow">
            <span className="controlLabel">Тема</span>
            <div className="segmented">
              <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Тёмная</button>
              <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Светлая</button>
            </div>
          </div>

          <div className="controlRow">
            <span className="controlLabel">Размер</span>
            <input
              type="range"
              min="90"
              max="150"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="toc">
          {toc.length === 0 ? (
            <div className="muted">Загружаю…</div>
          ) : toc.map((item) => (
            <button key={item.id || item.href} className="tocItem" onClick={() => goTo(item.href)}>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="viewerWrap">
        <div className="readerTop">
          <button className="btn" onClick={() => setIsMenuOpen(v => !v)}>☰</button>
          <div className="muted ellipsis">{location ? 'Позиция сохранена' : '—'}</div>
          <div className="spacer" />
          <button className="btn" onClick={prev}>←</button>
          <button className="btn" onClick={next}>→</button>
        </div>

        <div className="viewer" ref={viewerRef} />

        <div className="readerBottom">
          <button className="wideBtn" onClick={prev}>Предыдущая</button>
          <button className="wideBtn" onClick={next}>Следующая</button>
        </div>
      </div>
    </div>
  )
}
