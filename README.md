# KROSS — Telegram Mini App (WebApp)

Мини‑приложение для чтения книги из **EPUB** с сохранением позиции и оглавлением.

## Быстрый старт

```bash
npm i
npm run dev
```

Открой `http://localhost:5173`.

## Сборка

```bash
npm run build
```

Получится статическая сборка в `dist/`.

## Где лежит книга

`public/books/kross-part1.epub`

Заменить/добавить книги можно через `BOOKS` в `src/App.jsx`.

## Telegram Bot → WebApp

1. Залей `dist/` на любой хостинг (HTTPS обязателен).
2. В BotFather:
   - `/setdomain` → укажи домен.
   - `/setmenubutton` → выбери `Web App` → вставь URL на `index.html`.
3. В боте появится кнопка “Open App”.

## Сохранение позиции

- `localStorage` (работает всегда)
- `Telegram.WebApp.CloudStorage` (если доступно в чате)

