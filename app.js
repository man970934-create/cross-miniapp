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

async function loadChapterFromFile(chapterNumber) {
    if (chapterTexts[chapterNumber]) return chapterTexts[chapterNumber];

    try {
        const response = await fetch(`chapters/chapter${chapterNumber}.txt?v=2`);
        if (!response.ok) throw new Error('Ошибка загрузки');

        const text = await response.text();

        const paragraphs = text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

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

    const finalPage = (currentChapter === CHAPTERS_COUNT && currentPage === totalPages + 1);

    if (finalPage) {

        pageContent.innerHTML = `
        <img src="images/team.png?v=2"
        style="width:100%;max-width:420px;display:block;margin:0 auto;">
        `;

        pageIndicator.textContent = `${currentPage} / ${totalPages + 1}`;
        return;
    }

    if (!pages.length) {

        pageContent.innerHTML = '<p class="paragraph">Пустая глава</p>';
        pageIndicator.textContent = `0 / 0`;
        return;
    }

    const pageText = pages[currentPage - 1] || '';

    const paragraphs = pageText
        .split('\n\n')
        .filter(p => p.trim().length > 0);

    let html = '';

    if (currentChapter >= 2 && currentPage === 1) {

        html += `
        <img src="images/chapter${currentChapter}.png?v=2"
        style="width:100%;max-width:420px;display:block;margin:0 auto 20px auto;">
        `;
    }

    paragraphs.forEach(p => {
        html += `<p class="paragraph">${p}</p>`;
    });

    pageContent.innerHTML = html;

    pageIndicator.textContent = `${currentPage} / ${totalPages + 1}`;

    pageContainer.scrollTop = 0;
}

function updateNavButtons() {

    const lastPage = (currentChapter === CHAPTERS_COUNT)
        ? totalPages + 1
        : totalPages;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= lastPage;
}

function nextPage() {

    const lastPage = (currentChapter === CHAPTERS_COUNT)
        ? totalPages + 1
        : totalPages;

    if (currentPage < lastPage) {

        currentPage++;
        renderPage();
        updateNavButtons();
    }
}

function prevPage() {

    if (currentPage > 1) {

        currentPage--;
        renderPage();
        updateNavButtons();
    }
}

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
});

function changeFontSize(delta) {

    let newSize = currentFontSize + delta;

    if (newSize < 12) newSize = 12;
    if (newSize > 24) newSize = 24;

    if (newSize !== currentFontSize) {

        currentFontSize = newSize;
        document.body.style.fontSize = currentFontSize + 'px';
    }
}

fontDecrease.addEventListener('click', () => changeFontSize(-2));
fontIncrease.addEventListener('click', () => changeFontSize(2));

(async function init() {

    initChapterSelect();
    await loadChapter(currentChapter);

})();
