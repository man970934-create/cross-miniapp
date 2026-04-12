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

// ---------- Инициализация селекта глав ----------
function initChapterSelect() {
    chapterSelect.innerHTML = '';
    for (let i = 1; i <= CHAPTERS_COUNT; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = (i === 8) ? 'Дополнительная глава' : `Глава ${i}`;
        chapterSelect.appendChild(option);
    }
    chapterSelect.value = currentChapter;
}

// ---------- Разбивка на страницы ----------
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

// ---------- HTML ----------
function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
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

// ---------- НАВИГАЦИЯ + АНАЛИТИКА ----------
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

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
        updateNavButtons();
        saveProgressToLocal();

        if (window.trackEvent) {
            window.trackEvent("prev_page", {
                chapter: currentChapter,
                page: currentPage
            });
        }
    }
}

// ---------- Сохранение ----------
function saveProgressToLocal() {
    const progress = {
        currentChapter,
        currentPage,
        theme: body.classList.contains('theme-light') ? 'light' : 'dark',
        fontSize: currentFontSize
    };

    localStorage.setItem('kross_progress', JSON.stringify(progress));

    if (window.Telegram?.WebApp?.CloudStorage) {
        Telegram.WebApp.CloudStorage.setItem('kross_progress', JSON.stringify(progress), () => {});
    }

    showTempMessage('Прогресс сохранён');
}

// ---------- UI ----------
function showTempMessage(text) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:black; color:white; padding:8px 16px; border-radius:30px;';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
}

// ---------- НОВЫЕ ФУНКЦИИ ДЛЯ КНОПОК ----------

// Переключение темы
function toggleTheme() {
    body.classList.toggle('theme-light');
    const theme = body.classList.contains('theme-light') ? 'light' : 'dark';
    localStorage.setItem('kross_theme', theme);
}

// Применение размера шрифта
function applyFontSize() {
    pageContent.style.fontSize = currentFontSize + 'px';
}

function increaseFont() {
    currentFontSize = Math.min(currentFontSize + 2, 28);
    applyFontSize();
    localStorage.setItem('kross_fontSize', currentFontSize);
}

function decreaseFont() {
    currentFontSize = Math.max(currentFontSize - 2, 12);
    applyFontSize();
    localStorage.setItem('kross_fontSize', currentFontSize);
}

// Управление видимостью заголовка (предполагается наличие элемента с id="header")
function toggleHeaderVisibility() {
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (header.style.display === 'none') ? 'block' : 'none';
    }
}

function showHeader() {
    const header = document.getElementById('header');
    if (header) {
        header.style.display = 'block';
    }
}

// ---------- ОБРАБОТЧИКИ СОБЫТИЙ ----------
function bindEventListeners() {
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
    if (saveProgressBtn) saveProgressBtn.addEventListener('click', saveProgressToLocal);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (fontIncrease) fontIncrease.addEventListener('click', increaseFont);
    if (fontDecrease) fontDecrease.addEventListener('click', decreaseFont);
    if (toggleHeaderBtn) toggleHeaderBtn.addEventListener('click', toggleHeaderVisibility);
    if (showHeaderBtn) showHeaderBtn.addEventListener('click', showHeader);

    if (chapterSelect) {
        chapterSelect.addEventListener('change', async (e) => {
            const newChapter = parseInt(e.target.value);
            if (newChapter !== currentChapter) {
                currentChapter = newChapter;
                currentPage = 1;
                await loadChapter(currentChapter);
                saveProgressToLocal();

                if (window.trackEvent) {
                    window.trackEvent("change_chapter", {
                        chapter: currentChapter,
                        page: currentPage
                    });
                }
            }
        });
    }
}

// Восстановление сохранённых настроек при загрузке
function loadSettingsFromStorage() {
    const savedTheme = localStorage.getItem('kross_theme');
    if (savedTheme === 'light') {
        body.classList.add('theme-light');
    }

    const savedFont = localStorage.getItem('kross_fontSize');
    if (savedFont) {
        currentFontSize = parseInt(savedFont, 10);
        applyFontSize();
    }
}

// ---------- INIT ----------
(async function init() {
    initChapterSelect();
    await loadIllustrations();
    loadSettingsFromStorage();
    bindEventListeners();
    loadChapter(currentChapter);
})();
