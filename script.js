// Состояние приложения
let currentChapter = 0;          // индекс главы (0-6)
let currentPage = 0;             // индекс страницы в текущей главе
let pages = [];                  // массив фрагментов текста для текущей главы
let totalPages = 0;

// Элементы DOM
const pagesContainer = document.getElementById('pagesContainer');
const pageIndicator = document.getElementById('pageIndicator');
const hint = document.getElementById('hint');
const chapterButtons = document.querySelectorAll('.chapter-btn');
const themeToggle = document.getElementById('themeToggle');
const toggleDesc = document.getElementById('toggleDesc');
const description = document.querySelector('.description');

// Текущая страница (DOM-элемент)
let currentPageElement = null;

// --- Загрузка сохранённых данных ---
function loadSaved() {
    const saved = localStorage.getItem('kross_reader');
    if (saved) {
        try {
            const { chapter, page, theme, descCollapsed, hintShown } = JSON.parse(saved);
            if (chapter >= 0 && chapter < chapters.length) {
                currentChapter = chapter;
                currentPage = page;
            }
            if (theme === 'brown') {
                document.body.classList.remove('theme-beige');
                document.body.classList.add('theme-brown');
                themeToggle.textContent = '☀️';
            } else {
                document.body.classList.add('theme-beige');
                themeToggle.textContent = '🌙';
            }
            if (descCollapsed) {
                description.classList.add('collapsed');
                toggleDesc.textContent = '▼';
            } else {
                description.classList.remove('collapsed');
                toggleDesc.textContent = '▲';
            }
            if (hintShown) {
                hint.classList.add('hidden');
            }
        } catch (e) {
            console.warn('Ошибка загрузки сохранения', e);
        }
    }
}

// --- Сохранение текущей позиции ---
function saveProgress() {
    const theme = document.body.classList.contains('theme-brown') ? 'brown' : 'beige';
    const descCollapsed = description.classList.contains('collapsed');
    const hintShown = hint.classList.contains('hidden');
    localStorage.setItem('kross_reader', JSON.stringify({
        chapter: currentChapter,
        page: currentPage,
        theme: theme,
        descCollapsed: descCollapsed,
        hintShown: hintShown
    }));
}

// --- Динамическое разбиение текста на страницы ---
function splitIntoPages(text) {
    const tempDiv = document.createElement('div');
    tempDiv.className = 'page';
    tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${pagesContainer.clientWidth}px;
        padding: 20px 25px 20px 20px;
        font-size: 1rem;
        line-height: 1.8;
        font-family: Georgia, 'Times New Roman', serif;
        white-space: normal;
        word-wrap: break-word;
        left: 0;
        top: 0;
    `;
    document.body.appendChild(tempDiv);

    const paragraphs = text.split(/\n\s*\n/);
    const pages = [];
    let currentPageText = '';
    let currentPageHeight = 0;
    const maxHeight = pagesContainer.clientHeight;

    paragraphs.forEach(para => {
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        if (!cleanPara) return;

        const p = document.createElement('p');
        p.textContent = cleanPara;
        tempDiv.appendChild(p);
        const paraHeight = p.offsetHeight;
        tempDiv.removeChild(p);

        if (currentPageHeight + paraHeight > maxHeight && currentPageText !== '') {
            pages.push(currentPageText);
            currentPageText = cleanPara + '\n\n';
            currentPageHeight = paraHeight;
        } else {
            currentPageText += cleanPara + '\n\n';
            currentPageHeight += paraHeight;
        }
    });

    if (currentPageText) {
        pages.push(currentPageText);
    }

    document.body.removeChild(tempDiv);
    return pages;
}

// --- Создание DOM-элемента страницы ---
function createPageElement(text) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    const html = paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    pageDiv.innerHTML = html;
    return pageDiv;
}

// --- Отображение страницы с вертикальной анимацией ---
function renderPage(direction = 'next') {
    if (!pages.length) {
        pagesContainer.innerHTML = '<div class="page"><p>Загрузка...</p></div>';
        pageIndicator.textContent = '0 / 0';
        return;
    }

    const newPageElement = createPageElement(pages[currentPage]);

    if (!currentPageElement) {
        // Первый запуск
        pagesContainer.innerHTML = '';
        currentPageElement = newPageElement;
        pagesContainer.appendChild(currentPageElement);
    } else {
        const oldPage = currentPageElement;
        const newPage = newPageElement;

        const startTransform = direction === 'next' ? 'translateY(100%)' : 'translateY(-100%)';
        const endTransform = direction === 'next' ? 'translateY(-100%)' : 'translateY(100%)';

        oldPage.style.transition = 'transform 0.3s ease-in-out';
        newPage.style.transition = 'transform 0.3s ease-in-out';
        newPage.style.transform = startTransform;

        pagesContainer.appendChild(newPage);

        requestAnimationFrame(() => {
            oldPage.style.transform = endTransform;
            newPage.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            if (pagesContainer.contains(oldPage)) {
                pagesContainer.removeChild(oldPage);
            }
            oldPage.style.transition = '';
            newPage.style.transition = '';
            currentPageElement = newPage;
        }, 300);
    }

    pageIndicator.textContent = `${currentPage + 1} / ${totalPages}`;
    saveProgress();
}

// --- Загрузить главу ---
function loadChapter(index) {
    if (index === currentChapter && pages.length > 0) {
        // Уже загружена, просто обновляем отображение страницы
        if (currentPageElement) {
            pagesContainer.innerHTML = '';
            currentPageElement = createPageElement(pages[currentPage]);
            pagesContainer.appendChild(currentPageElement);
        } else {
            renderPage();
        }
        return;
    }

    currentChapter = index;
    currentPage = 0;
    const fullText = chapters[index].text;

    pagesContainer.innerHTML = '';
    currentPageElement = null;

    setTimeout(() => {
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        renderPage();

        chapterButtons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }, 50);
}

// --- Обработка вертикального свайпа ---
let touchStartY = 0;
let touchEndY = 0;
let isSwiping = false;

pagesContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
}, { passive: true });

pagesContainer.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchEndY = e.touches[0].clientY;
}, { passive: true });

pagesContainer.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const threshold = 50;
    const diff = touchEndY - touchStartY;

    // Скрываем подсказку при первом свайпе
    if (!hint.classList.contains('hidden')) {
        hint.classList.add('hidden');
        saveProgress();
    }

    if (Math.abs(diff) > threshold) {
        if (diff < 0 && currentPage < totalPages - 1) {
            // свайп вверх -> следующая страница
            currentPage++;
            renderPage('next');
        } else if (diff > 0 && currentPage > 0) {
            // свайп вниз -> предыдущая страница
            currentPage--;
            renderPage('prev');
        }
    }

    isSwiping = false;
    touchStartY = 0;
    touchEndY = 0;
}, { passive: true });

// --- Кнопки глав ---
chapterButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        loadChapter(idx);
        // Скрываем подсказку при любом взаимодействии
        if (!hint.classList.contains('hidden')) {
            hint.classList.add('hidden');
            saveProgress();
        }
    });
});

// --- Переключение темы ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-beige');
    document.body.classList.toggle('theme-brown');
    themeToggle.textContent = document.body.classList.contains('theme-brown') ? '☀️' : '🌙';
    saveProgress();

    // Пересчёт страниц при смене темы
    if (chapters[currentChapter]) {
        const fullText = chapters[currentChapter].text;
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        renderPage();
    }
});

// --- Сворачивание/разворачивание описания ---
toggleDesc.addEventListener('click', () => {
    description.classList.toggle('collapsed');
    toggleDesc.textContent = description.classList.contains('collapsed') ? '▼' : '▲';
    saveProgress();

    // Пересчёт страниц, так как изменилась доступная высота
    if (chapters[currentChapter]) {
        const fullText = chapters[currentChapter].text;
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        renderPage();
    }
});

// --- Обработка изменения размера окна ---
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (chapters[currentChapter]) {
            const fullText = chapters[currentChapter].text;
            pages = splitIntoPages(fullText);
            totalPages = pages.length;
            currentPage = Math.min(currentPage, totalPages - 1);
            renderPage();
        }
    }, 150);
});

// --- Инициализация ---
loadSaved();
loadChapter(currentChapter);
