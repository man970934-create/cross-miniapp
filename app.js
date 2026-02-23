const CHAPTERS_COUNT = 7;
const MAX_CHARS_PER_PAGE = 2000;

let currentChapter = 1;
let currentPage = 1;
let totalPages = 1;
let pages = [];
let chapterTexts = {};

const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const chapterSelect = document.getElementById('chapterSelect');
const pageContainer = document.getElementById('pageContainer');
const pageContent = document.getElementById('pageContent');
const pageIndicator = document.getElementById('pageIndicator');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');

// Новые элементы
const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
const showHeaderBtn = document.getElementById('showHeaderBtn');
const fontDecrease = document.getElementById('fontDecrease');
const fontIncrease = document.getElementById('fontIncrease');

// Текущий размер шрифта (базовый для body)
let currentFontSize = 16; // по умолчанию

async function loadChapterFromFile(chapterNumber) {
    /* ... без изменений ... */
}

function initChapterSelect() {
    /* ... без изменений ... */
}

async function loadChapter(chapter) {
    /* ... без изменений ... */
}

function splitIntoPages(paragraphs, maxChars) {
    /* ... без изменений ... */
}

function renderPage() {
    /* ... без изменений ... */
}

function updateNavButtons() {
    /* ... без изменений ... */
}

function nextPage() {
    /* ... без изменений ... */
}

function prevPage() {
    /* ... без изменений ... */
}

// Тач-события без изменений
pageContainer.addEventListener('touchstart', (e) => { /* ... */ }, { passive: true });
pageContainer.addEventListener('touchend', (e) => { /* ... */ }, { passive: true });

// Переключение темы
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
    saveSettings();
});

// Выбор главы
chapterSelect.addEventListener('change', async (e) => {
    const newChapter = parseInt(e.target.value);
    if (newChapter !== currentChapter) {
        currentChapter = newChapter;
        currentPage = 1;
        await loadChapter(currentChapter);
    }
});

// Навигация по страницам
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

// === Новые функции ===

// Изменение размера шрифта
function changeFontSize(delta) {
    let newSize = currentFontSize + delta;
    if (newSize < 12) newSize = 12;
    if (newSize > 24) newSize = 24;
    if (newSize !== currentFontSize) {
        currentFontSize = newSize;
        document.body.style.fontSize = currentFontSize + 'px';
        saveSettings();
    }
}

fontDecrease.addEventListener('click', () => changeFontSize(-2));
fontIncrease.addEventListener('click', () => changeFontSize(2));

// Скрытие/показ верхней панели
function hideHeader() {
    body.classList.add('header-hidden');
    toggleHeaderBtn.style.display = 'none'; // кнопка внутри header скроется вместе с ним, но на всякий случай
    showHeaderBtn.style.display = 'block';
    saveSettings();
}

function showHeader() {
    body.classList.remove('header-hidden');
    toggleHeaderBtn.style.display = 'inline-block'; // вернётся вместе с header
    showHeaderBtn.style.display = 'none';
    saveSettings();
}

toggleHeaderBtn.addEventListener('click', hideHeader);
showHeaderBtn.addEventListener('click', showHeader);

// Сохранение всех настроек
function saveSettings() {
    localStorage.setItem('kross_theme', body.classList.contains('theme-dark') ? 'dark' : 'light');
    localStorage.setItem('kross_chapter', currentChapter);
    localStorage.setItem('kross_page', currentPage);
    localStorage.setItem('kross_font_size', currentFontSize);
    localStorage.setItem('kross_header_hidden', body.classList.contains('header-hidden') ? 'yes' : 'no');
}

// Загрузка всех настроек
function loadSettings() {
    // Тема
    const savedTheme = localStorage.getItem('kross_theme');
    if (savedTheme === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        themeToggle.textContent = '☀️ Дневная';
    } else {
        body.classList.add('theme-light');
        body.classList.remove('theme-dark');
        themeToggle.textContent = '🌙 Ночная';
    }

    // Глава и страница
    const savedChapter = localStorage.getItem('kross_chapter');
    if (savedChapter) {
        const chapter = parseInt(savedChapter);
        if (chapter >= 1 && chapter <= CHAPTERS_COUNT) {
            currentChapter = chapter;
            chapterSelect.value = chapter;
        }
    }
    const savedPage = localStorage.getItem('kross_page');
    if (savedPage) {
        currentPage = parseInt(savedPage);
    } else {
        currentPage = 1;
    }

    // Размер шрифта
    const savedFontSize = localStorage.getItem('kross_font_size');
    if (savedFontSize) {
        currentFontSize = parseInt(savedFontSize);
        document.body.style.fontSize = currentFontSize + 'px';
    }

    // Состояние шапки
    const headerHidden = localStorage.getItem('kross_header_hidden') === 'yes';
    if (headerHidden) {
        hideHeader(); // устанавливает класс и кнопки
    } else {
        showHeader(); // гарантирует правильное состояние
    }
}

// Инициализация
(async function init() {
    initChapterSelect();
    loadSettings();
    await loadChapter(currentChapter);
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
        renderPage();
        updateNavButtons();
        saveSettings();
    }
})();
