'use strict';

// ---------- Конфигурация частей книги ----------
// Часть 1: 7 обычных глав + "Дополнительная глава" (chapter8.txt)
// Часть 2: 8 обычных глав (главы 8–15 по сквозной нумерации) + "Дополнительная глава" (chapter9.txt)
const PARTS_CONFIG = {
    1: {
        chaptersCount: 8,
        bonusChapter: 8,                   // Номер файла, который называется "Дополнительная глава"
        firstChapterDisplayNumber: 1,      // С какого номера показываем главы пользователю
        filePrefix: ''                     // Файлы: chapters/chapter1.txt, chapter2.txt, ...
    },
    2: {
        chaptersCount: 9,
        bonusChapter: 9,
        firstChapterDisplayNumber: 8,      // Часть 2 начинается с "Главы 8" (продолжение нумерации)
        filePrefix: 'part2_'                // Файлы: chapters/part2_chapter1.txt, part2_chapter2.txt, ...
    }
};

const MAX_CHARS_PER_PAGE = 2000;

// ---------- Текущее состояние ----------
let currentPart = 1;
let currentChapter = 1;
let currentPage = 1;
let totalPages = 1;
let pages = [];
let chapterTexts = {};   // ключ: `${part}-${chapter}`
let illustrations = {};  // { "1": {...}, "2": {...} }

const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const chapterSelect = document.getElementById('chapterSelect');
const pageContainer = document.getElementById('pageContainer');
const pageContent = document.getElementById('pageContent');
const pageIndicator = document.getElementById('pageIndicator');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
const showHeaderBtn = document.getElementById('showHeaderBtn');
const fontDecrease = document.getElementById('fontDecrease');
const fontIncrease = document.getElementById('fontIncrease');
const saveProgressBtn = document.getElementById('saveProgressBtn');
const partButtons = document.querySelectorAll('.part-btn');

let currentFontSize = 16;

// ---------- Хелперы для текущей части ----------
function getPartConfig(part = currentPart) {
    return PARTS_CONFIG[part] || PARTS_CONFIG[1];
}

function getChaptersCount(part = currentPart) {
    return getPartConfig(part).chaptersCount;
}

// ---------- Безопасная аналитика ----------
function safeTrack(eventName, extra = {}) {
    try {
        if (typeof window.trackEvent === 'function') {
            window.trackEvent(eventName, extra);
        }
    } catch (e) {
        console.warn('trackEvent error:', e);
    }
}

// ---------- Загрузка иллюстраций ----------
async function loadIllustrations() {
    try {
        const response = await fetch(`illustrations.json?v=${Date.now()}`);
        const data = await response.json();
        // Поддержка как нового формата ({ "1": {...}, "2": {...} }),
        // так и старого формата (плоский объект — считаем его частью 1).
        if (data && typeof data === 'object' && (data['1'] || data['2'])) {
            illustrations = data;
        } else {
            illustrations = { 1: data || {}, 2: {} };
        }
    } catch (e) {
        console.error("Ошибка загрузки illustrations.json", e);
        illustrations = { 1: {}, 2: {} };
    }
}

// ---------- Загрузка текста главы ----------
async function loadChapterFromFile(part, chapterNumber) {
    const cacheKey = `${part}-${chapterNumber}`;
    if (chapterTexts[cacheKey]) return chapterTexts[cacheKey];
    try {
        const cfg = getPartConfig(part);
        const response = await fetch(`chapters/${cfg.filePrefix}chapter${chapterNumber}.txt?v=${Date.now()}`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const text = await response.text();
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        chapterTexts[cacheKey] = paragraphs;
        return paragraphs;
    } catch (e) {
        console.error(e);
        return [`[Не удалось загрузить главу ${chapterNumber} (часть ${part})]`];
    }
}

// ---------- Инициализация селекта глав ----------
function initChapterSelect() {
    const cfg = getPartConfig();
    chapterSelect.innerHTML = '';
    for (let i = 1; i <= cfg.chaptersCount; i++) {
        const option = document.createElement('option');
        option.value = i;
        if (i === cfg.bonusChapter) {
            option.textContent = 'Дополнительная глава';
        } else {
            // Учитываем сквозную нумерацию (для части 2 главы начинаются с "Глава 8")
            const displayNumber = cfg.firstChapterDisplayNumber + (i - 1);
            option.textContent = `Глава ${displayNumber}`;
        }
        chapterSelect.appendChild(option);
    }
    chapterSelect.value = currentChapter;
}

// ---------- Разбивка на страницы с кэшем ----------
let pagesCache = {}; // ключ: `${part}-${chapter}`

function splitIntoPages(paragraphs, maxChars) {
    const pages = [];
    let currentPageText = '';
    for (let para of paragraphs) {
        if ((currentPageText.length + para.length) > maxChars && currentPageText.length > 0) {
            pages.push(currentPageText.trim());
            currentPageText = para + '\n\n';
        } else {
            if (currentPageText.length > 0) currentPageText += '\n\n';
            currentPageText += para;
        }
    }
    if (currentPageText.trim().length > 0) pages.push(currentPageText.trim());
    return pages;
}

async function loadChapter(chapter) {
    const cacheKey = `${currentPart}-${chapter}`;
    if (pagesCache[cacheKey]) {
        pages = pagesCache[cacheKey];
    } else {
        const paragraphs = await loadChapterFromFile(currentPart, chapter);
        pages = splitIntoPages(paragraphs, MAX_CHARS_PER_PAGE);
        pagesCache[cacheKey] = pages;
    }
    totalPages = pages.length;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    renderPage();
    updateNavButtons();
}

// ---------- Экранирование HTML ----------
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderPage() {
    const chaptersCount = getChaptersCount();
    const isFinalPage = (currentChapter === chaptersCount && currentPage === totalPages + 1);
    if (isFinalPage) {
        pageContent.innerHTML = '<p class="paragraph">Конец книги</p>';
        pageIndicator.textContent = `${currentPage} / ${totalPages + 1}`;
        return;
    }
    if (!pages.length) {
        pageContent.innerHTML = '<p class="paragraph">Пустая глава</p>';
        pageIndicator.textContent = `0 / 0`;
        return;
    }
    const pageText = pages[currentPage - 1] || '';
    const paragraphs = pageText.split('\n\n').filter(p => p.trim().length > 0);
    let html = '';
    const partIllustrations = illustrations[currentPart] || {};
    if (currentPage === 1 && partIllustrations[currentChapter]) {
        html += `<img src="images/${partIllustrations[currentChapter]}?v=${Date.now()}" style="width:100%;max-width:420px;display:block;margin:0 auto 20px auto;">`;
    }
    paragraphs.forEach(p => {
        html += `<p class="paragraph">${escapeHtml(p)}</p>`;
    });
    pageContent.innerHTML = html;
    pageIndicator.textContent = `${currentPage} / ${totalPages + 1}`;
    pageContainer.scrollTop = 0;
}

function updateNavButtons() {
    const chaptersCount = getChaptersCount();
    const lastPage = (currentChapter === chaptersCount) ? totalPages + 1 : totalPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= lastPage;
}

function nextPage() {
    const chaptersCount = getChaptersCount();
    const lastPage = (currentChapter === chaptersCount) ? totalPages + 1 : totalPages;
    if (currentPage < lastPage) {
        currentPage++;
        renderPage();
        updateNavButtons();
        saveProgressToLocal();

        safeTrack('next_page', {
            part: currentPart,
            chapter: currentChapter,
            page: currentPage
        });
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
        updateNavButtons();
        saveProgressToLocal();

        safeTrack('prev_page', {
            part: currentPart,
            chapter: currentChapter,
            page: currentPage
        });
    }
}

// ---------- Сохранение прогресса (раздельно по частям) ----------
// Формат прогресса:
// {
//   currentPart: 1 | 2,
//   parts: { 1: { chapter, page }, 2: { chapter, page } },
//   theme: 'light' | 'dark',
//   fontSize: number
// }
let progressState = {
    currentPart: 1,
    parts: {
        1: { chapter: 1, page: 1 },
        2: { chapter: 1, page: 1 }
    },
    theme: 'light',
    fontSize: 16
};

function syncProgressStateFromCurrent() {
    progressState.currentPart = currentPart;
    progressState.parts[currentPart] = {
        chapter: currentChapter,
        page: currentPage
    };
    progressState.theme = body.classList.contains('theme-light') ? 'light' : 'dark';
    progressState.fontSize = currentFontSize;
}

function saveProgressToLocal() {
    syncProgressStateFromCurrent();
    const json = JSON.stringify(progressState);
    localStorage.setItem('kross_progress', json);
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.setItem('kross_progress', json, (ok) => {
            if (!ok) console.warn('CloudStorage save failed');
        });
    }
    showTempMessage('Прогресс сохранён');
}

function loadProgressFromStorage() {
    let saved = null;
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.getItem('kross_progress', (err, value) => {
            if (!err && value) {
                try { saved = JSON.parse(value); } catch(e) {}
                if (saved) applyProgress(saved);
                else fallbackLocal();
            } else fallbackLocal();
        });
    } else {
        fallbackLocal();
    }
    function fallbackLocal() {
        const local = localStorage.getItem('kross_progress');
        if (local) {
            try { saved = JSON.parse(local); } catch(e) {}
            if (saved) applyProgress(saved);
            else applyProgress({}); // дефолт
        } else {
            applyProgress({}); // дефолт
        }
    }
}

// Миграция старого формата прогресса -> нового
function migrateProgress(progress) {
    // Старый формат: { currentChapter, currentPage, theme, fontSize }
    if (progress && progress.currentChapter !== undefined && !progress.parts) {
        return {
            currentPart: 1,
            parts: {
                1: {
                    chapter: progress.currentChapter,
                    page: progress.currentPage || 1
                },
                2: { chapter: 1, page: 1 }
            },
            theme: progress.theme || 'light',
            fontSize: progress.fontSize || 16
        };
    }
    return progress;
}

function applyProgress(rawProgress) {
    const progress = migrateProgress(rawProgress) || {};

    // Восстанавливаем глобальный progressState с подстраховкой по дефолтам
    progressState = {
        currentPart: (progress.currentPart === 2 ? 2 : 1),
        parts: {
            1: {
                chapter: (progress.parts && progress.parts[1] && progress.parts[1].chapter) || 1,
                page:    (progress.parts && progress.parts[1] && progress.parts[1].page)    || 1
            },
            2: {
                chapter: (progress.parts && progress.parts[2] && progress.parts[2].chapter) || 1,
                page:    (progress.parts && progress.parts[2] && progress.parts[2].page)    || 1
            }
        },
        theme: progress.theme === 'dark' ? 'dark' : 'light',
        fontSize: (progress.fontSize && progress.fontSize >= 12 && progress.fontSize <= 24) ? progress.fontSize : 16
    };

    // Применяем тему
    if (progressState.theme === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        themeToggle.textContent = '☀️ Дневная';
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        themeToggle.textContent = '🌙 Ночная';
    }

    // Применяем размер шрифта
    currentFontSize = progressState.fontSize;
    document.body.style.fontSize = currentFontSize + 'px';

    // Применяем выбранную часть и позицию в ней
    currentPart = progressState.currentPart;
    const partState = progressState.parts[currentPart];
    const cfg = getPartConfig(currentPart);
    currentChapter = Math.min(Math.max(partState.chapter, 1), cfg.chaptersCount);
    currentPage = Math.max(partState.page, 1);

    updatePartButtonsUI();
    initChapterSelect();
    chapterSelect.value = currentChapter;

    loadChapter(currentChapter).then(() => {
        if (currentPage > totalPages) currentPage = totalPages;
        renderPage();
        updateNavButtons();
    });
}

function showTempMessage(text) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; padding:8px 16px; border-radius:30px; font-size:14px; z-index:1000;';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
}

// ---------- Переключение части книги ----------
function updatePartButtonsUI() {
    partButtons.forEach(btn => {
        const isActive = parseInt(btn.dataset.part, 10) === currentPart;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

async function switchPart(newPart) {
    if (newPart === currentPart) return;
    if (!PARTS_CONFIG[newPart]) return;

    // Сохраняем текущее положение в текущей части перед переключением
    syncProgressStateFromCurrent();

    currentPart = newPart;

    // Восстанавливаем последнюю позицию в выбранной части
    const partState = progressState.parts[currentPart] || { chapter: 1, page: 1 };
    const cfg = getPartConfig(currentPart);
    currentChapter = Math.min(Math.max(partState.chapter, 1), cfg.chaptersCount);
    currentPage = Math.max(partState.page, 1);

    updatePartButtonsUI();
    initChapterSelect();
    chapterSelect.value = currentChapter;

    await loadChapter(currentChapter);
    saveProgressToLocal();

    safeTrack('change_part', {
        part: currentPart,
        chapter: currentChapter,
        page: currentPage
    });
}

partButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.part, 10);
        switchPart(target);
    });
});

// ---------- Скрытие/показ шапки ----------
if (toggleHeaderBtn && showHeaderBtn) {
    toggleHeaderBtn.addEventListener('click', () => {
        document.body.classList.add('header-hidden');
        showHeaderBtn.style.display = 'block';
    });
    showHeaderBtn.addEventListener('click', () => {
        document.body.classList.remove('header-hidden');
        showHeaderBtn.style.display = 'none';
    });
}

// ---------- Смена темы ----------
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('theme-light')) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            themeToggle.textContent = '☀️ Дневная';
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            themeToggle.textContent = '🌙 Ночная';
        }
        saveProgressToLocal();
    });
}

// ---------- Изменение шрифта ----------
function changeFontSize(delta) {
    let newSize = currentFontSize + delta;
    if (newSize < 12) newSize = 12;
    if (newSize > 24) newSize = 24;
    if (newSize !== currentFontSize) {
        currentFontSize = newSize;
        document.body.style.fontSize = currentFontSize + 'px';
        saveProgressToLocal();
    }
}
if (fontDecrease) fontDecrease.addEventListener('click', () => changeFontSize(-2));
if (fontIncrease) fontIncrease.addEventListener('click', () => changeFontSize(2));

// ---------- Кнопка сохранения ----------
if (saveProgressBtn) {
    saveProgressBtn.addEventListener('click', () => saveProgressToLocal());
}

// ---------- Смена главы ----------
if (chapterSelect) {
    chapterSelect.addEventListener('change', async (e) => {
        const newChapter = parseInt(e.target.value);
        if (newChapter !== currentChapter) {
            currentChapter = newChapter;
            currentPage = 1;
            await loadChapter(currentChapter);
            saveProgressToLocal();

            safeTrack('change_chapter', {
                part: currentPart,
                chapter: currentChapter,
                page: currentPage
            });
        }
    });
}

// ---------- Навигация ----------
if (prevBtn) prevBtn.addEventListener('click', prevPage);
if (nextBtn) nextBtn.addEventListener('click', nextPage);

// ---------- Telegram WebApp ----------
const tg = window.Telegram?.WebApp;

if (tg) {
    tg.expand();
    tg.ready();

    // 👉 применяем тему Telegram
    function applyTelegramTheme() {
        const isDark = tg.colorScheme === "dark";

        if (isDark) {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            themeToggle.textContent = '☀️ Дневная';
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            themeToggle.textContent = '🌙 Ночная';
        }
    }

    applyTelegramTheme();

    // 👉 слушаем изменения темы Telegram
    tg.onEvent('themeChanged', applyTelegramTheme);

    tg.BackButton.onClick(() => {
        if (tg.close) tg.close();
    });
}

// ---------- Завершение сессии ----------
window.addEventListener('beforeunload', () => {
    safeTrack('session_end', {
        part: currentPart,
        chapter: currentChapter,
        page: currentPage
    });
});

// ---------- Инициализация ----------
(async function init() {
    initChapterSelect();
    updatePartButtonsUI();
    await loadIllustrations();
    loadProgressFromStorage();
})();
