'use strict';

const CHAPTERS_COUNT = 8;
const MAX_CHARS_PER_PAGE = 2000;

let currentChapter = 1;
let currentPage = 1;
let totalPages = 1;
let pages = [];
let chapterTexts = {};
let illustrations = {};

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

let currentFontSize = 16;

// ---------- Загрузка иллюстраций ----------
async function loadIllustrations() {
    try {
        const response = await fetch(`illustrations.json?v=${Date.now()}`);
        illustrations = await response.json();
    } catch (e) {
        console.error("Ошибка загрузки illustrations.json", e);
    }
}

// ---------- Загрузка текста главы ----------
async function loadChapterFromFile(chapterNumber) {
    if (chapterTexts[chapterNumber]) return chapterTexts[chapterNumber];
    try {
        const response = await fetch(`chapters/chapter${chapterNumber}.txt?v=${Date.now()}`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const text = await response.text();
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        chapterTexts[chapterNumber] = paragraphs;
        return paragraphs;
    } catch (e) {
        console.error(e);
        return [`[Не удалось загрузить главу ${chapterNumber}]`];
    }
}

// ---------- Инициализация селекта глав (8-я глава – "Дополнительная глава") ----------
function initChapterSelect() {
    chapterSelect.innerHTML = '';
    for (let i = 1; i <= CHAPTERS_COUNT; i++) {
        const option = document.createElement('option');
        option.value = i;
        if (i === 8) {
            option.textContent = 'Дополнительная глава';
        } else {
            option.textContent = `Глава ${i}`;
        }
        chapterSelect.appendChild(option);
    }
    chapterSelect.value = currentChapter;
}

// ---------- Разбивка на страницы с кэшем ----------
let pagesCache = {};

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
    if (pagesCache[chapter]) {
        pages = pagesCache[chapter];
    } else {
        const paragraphs = await loadChapterFromFile(chapter);
        pages = splitIntoPages(paragraphs, MAX_CHARS_PER_PAGE);
        pagesCache[chapter] = pages;
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
    const isFinalPage = (currentChapter === CHAPTERS_COUNT && currentPage === totalPages + 1);
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
    if (currentPage === 1 && illustrations[currentChapter]) {
        html += `<img src="images/${illustrations[currentChapter]}?v=${Date.now()}" style="width:100%;max-width:420px;display:block;margin:0 auto 20px auto;">`;
    }
    paragraphs.forEach(p => {
        html += `<p class="paragraph">${escapeHtml(p)}</p>`;
    });
    pageContent.innerHTML = html;
    pageIndicator.textContent = `${currentPage} / ${totalPages + 1}`;
    pageContainer.scrollTop = 0;
}

function updateNavButtons() {
    const lastPage = (currentChapter === CHAPTERS_COUNT) ? totalPages + 1 : totalPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= lastPage;
}

function nextPage() {
    const lastPage = (currentChapter === CHAPTERS_COUNT) ? totalPages + 1 : totalPages;
    if (currentPage < lastPage) {
        currentPage++;
        renderPage();
        updateNavButtons();
        saveProgressToLocal();

        if (window.trackEvent) {
            window.trackEvent("next_page", {
                chapter: currentChapter,
                page: currentPage
            });
        }
    }
}

// ---------- Сохранение прогресса ----------
function saveProgressToLocal() {
    const progress = {
        currentChapter,
        currentPage,
        theme: body.classList.contains('theme-light') ? 'light' : 'dark',
        fontSize: currentFontSize
    };
    localStorage.setItem('kross_progress', JSON.stringify(progress));
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.setItem('kross_progress', JSON.stringify(progress), (ok) => {
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
        }
    }
}

function applyProgress(progress) {
    if (progress.currentChapter && progress.currentChapter >= 1 && progress.currentChapter <= CHAPTERS_COUNT) {
        currentChapter = progress.currentChapter;
        chapterSelect.value = currentChapter;
    }
    if (progress.currentPage && progress.currentPage > 0) currentPage = progress.currentPage;
    if (progress.theme === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        themeToggle.textContent = '☀️ Дневная';
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        themeToggle.textContent = '🌙 Ночная';
    }
    if (progress.fontSize && progress.fontSize >= 12 && progress.fontSize <= 24) {
        currentFontSize = progress.fontSize;
        document.body.style.fontSize = currentFontSize + 'px';
    }
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
    tg.BackButton.onClick(() => {
        if (tg.close) tg.close();
    });
}

// ---------- Инициализация ----------
(async function init() {
    initChapterSelect();
    await loadIllustrations();
    loadProgressFromStorage();
})();
