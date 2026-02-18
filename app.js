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

let touchStartY = 0;
let touchStartTime = 0;

pageContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
    touchStartTime = Date.now();
}, { passive: true });

pageContainer.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].screenY;
    const diff = touchStartY - touchEndY;
    const timeDiff = Date.now() - touchStartTime;
    if (timeDiff > 300 || Math.abs(diff) < 30) return;
    if (diff > 0) nextPage();
    else prevPage();
}, { passive: true });

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
    }
});

prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

function saveSettings() {
    localStorage.setItem('kross_theme', body.classList.contains('theme-dark') ? 'dark' : 'light');
    localStorage.setItem('kross_chapter', currentChapter);
    localStorage.setItem('kross_page', currentPage);
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
})();
