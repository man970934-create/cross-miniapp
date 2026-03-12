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

const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
const showHeaderBtn = document.getElementById('showHeaderBtn');
const fontDecrease = document.getElementById('fontDecrease');
const fontIncrease = document.getElementById('fontIncrease');

let currentFontSize = 16;
let readingSessionId = null;
let readingStartTime = null;
let heartbeatInterval = null;

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function sendWebAppData(data) {
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.sendData(JSON.stringify(data));
    } else {
        console.log('WebApp not available, data:', data);
    }
}

function startReadingSession() {
    if (readingSessionId) return;
    readingSessionId = generateSessionId();
    readingStartTime = Date.now();
    sendWebAppData({ action: 'start_reading', session_id: readingSessionId });
    heartbeatInterval = setInterval(() => {
        if (readingSessionId) {
            const duration = Math.floor((Date.now() - readingStartTime) / 1000);
            sendWebAppData({ action: 'heartbeat', session_id: readingSessionId, duration });
        }
    }, 30000);
}

function endReadingSession() {
    if (readingSessionId && readingStartTime) {
        const duration = Math.floor((Date.now() - readingStartTime) / 1000);
        sendWebAppData({ action: 'end_reading', session_id: readingSessionId, duration });
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        readingSessionId = null;
        readingStartTime = null;
    }
}

function sendChapterChange(chapter) {
    sendWebAppData({ action: 'chapter_changed', chapter });
}

window.addEventListener('load', startReadingSession);
window.addEventListener('beforeunload', endReadingSession);

async function loadChapterFromFile(chapterNumber) {
    if (chapterTexts[chapterNumber]) return chapterTexts[chapterNumber];

    try {
        const response = await fetch(`chapters/chapter${chapterNumber}.txt`);
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

function initChapterSelect() {
    for (let i = 1; i <= CHAPTERS_COUNT; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Глава ${i}`;
        chapterSelect.appendChild(option);
    }
}

async function loadChapter(chapter) {

    const paragraphs = await loadChapterFromFile(chapter);

    pages = splitIntoPages(paragraphs, MAX_CHARS_PER_PAGE);

    totalPages = pages.length;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    renderPage();

    updateNavButtons();

    saveSettings();
}

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

    if (currentPageText.trim().length > 0) {

        pages.push(currentPageText.trim());
    }

    return pages;
}

function renderPage() {

    if (!pages.length) {

        pageContent.innerHTML = '<p class="paragraph">Пустая глава</p>';

        pageIndicator.textContent = `0 / 0`;

        return;
    }

    const pageText = pages[currentPage - 1] || '';

    const paragraphs = pageText.split('\n\n').filter(p => p.trim().length > 0);

    let html = '';

    // добавляем картинку если глава >=2 и это первая страница
    if (currentChapter >= 2 && currentPage === 1) {
        html += `<img src="images/chapter${currentChapter}.png" style="width:100%;max-width:420px;display:block;margin:0 auto 20px auto;">`;
    }

    paragraphs.forEach(p => {

        html += `<p class="paragraph">${p}</p>`;
    });

    pageContent.innerHTML = html;

    pageIndicator.textContent = `${currentPage} / ${totalPages}`;

    pageContainer.scrollTop = 0;
}

function updateNavButtons() {

    prevBtn.disabled = currentPage <= 1;

    nextBtn.disabled = currentPage >= totalPages;
}

function nextPage() {

    if (currentPage < totalPages) {

        currentPage++;

        renderPage();

        updateNavButtons();

        saveSettings();
    }
}

function prevPage() {

    if (currentPage > 1) {

        currentPage--;

        renderPage();

        updateNavButtons();

        saveSettings();
    }
}

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

chapterSelect.addEventListener('change', async (e) => {

    const newChapter = parseInt(e.target.value);

    if (newChapter !== currentChapter) {

        currentChapter = newChapter;

        currentPage = 1;

        await loadChapter(currentChapter);

        sendChapterChange(newChapter);
    }
});

prevBtn.addEventListener('click', prevPage);

nextBtn.addEventListener('click', nextPage);

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

function saveSettings() {

    localStorage.setItem('kross_theme', body.classList.contains('theme-dark') ? 'dark' : 'light');

    localStorage.setItem('kross_chapter', currentChapter);

    localStorage.setItem('kross_page', currentPage);

    localStorage.setItem('kross_font_size', currentFontSize);
}

function loadSettings() {

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

    const savedFontSize = localStorage.getItem('kross_font_size');

    if (savedFontSize) {

        currentFontSize = parseInt(savedFontSize);

        document.body.style.fontSize = currentFontSize + 'px';
    }
}

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

    sendChapterChange(currentChapter);
})();
