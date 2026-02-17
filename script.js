// Состояние приложения
let currentChapter = 0;          // индекс главы (0-6)
let currentPage = 0;             // индекс страницы в текущей главе
let pages = [];                  // массив фрагментов текста для текущей главы
let totalPages = 0;

// Элементы DOM
const pageContent = document.getElementById('pageContent');
const pageIndicator = document.getElementById('pageIndicator');
const chapterButtons = document.querySelectorAll('.chapter-buttons button');
const themeToggle = document.getElementById('themeToggle');

// --- Загрузка сохранённых данных ---
function loadSaved() {
    const saved = localStorage.getItem('kross_reader');
    if (saved) {
        try {
            const { chapter, page, theme } = JSON.parse(saved);
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
        } catch (e) {
            console.warn('Ошибка загрузки сохранения', e);
        }
    }
}

// --- Сохранение текущей позиции ---
function saveProgress() {
    const theme = document.body.classList.contains('theme-brown') ? 'brown' : 'beige';
    localStorage.setItem('kross_reader', JSON.stringify({
        chapter: currentChapter,
        page: currentPage,
        theme: theme
    }));
}

// --- Динамическое разбиение текста на страницы по реальной высоте контейнера ---
function splitIntoPages(text) {
    // Создаём временный контейнер для измерения
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${pageContent.clientWidth}px;
        font-size: ${getComputedStyle(pageContent).fontSize};
        line-height: ${getComputedStyle(pageContent).lineHeight};
        padding: ${getComputedStyle(pageContent).padding};
        font-family: ${getComputedStyle(pageContent).fontFamily};
        white-space: normal;
        word-wrap: break-word;
    `;
    document.body.appendChild(tempDiv);

    // Разбиваем текст на абзацы (по двойному переводу строки)
    const paragraphs = text.split(/\n\s*\n/);
    const pages = [];
    let currentPageText = '';
    let currentPageHeight = 0;
    const maxHeight = pageContent.clientHeight;

    paragraphs.forEach(para => {
        // Очищаем параграф от лишних пробелов и добавляем обрамление
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        if (!cleanPara) return;

        // Создаём элемент параграфа
        const p = document.createElement('p');
        p.textContent = cleanPara;
        tempDiv.appendChild(p);
        const paraHeight = p.offsetHeight;
        tempDiv.removeChild(p);

        // Проверяем, поместится ли параграф на текущей странице
        if (currentPageHeight + paraHeight > maxHeight && currentPageText !== '') {
            // Сохраняем текущую страницу и начинаем новую
            pages.push(currentPageText);
            currentPageText = cleanPara + '\n\n';
            currentPageHeight = paraHeight;
        } else {
            currentPageText += cleanPara + '\n\n';
            currentPageHeight += paraHeight;
        }
    });

    // Добавляем последнюю страницу
    if (currentPageText) {
        pages.push(currentPageText);
    }

    document.body.removeChild(tempDiv);
    return pages;
}

// --- Отобразить текущую страницу ---
function renderPage() {
    if (!pages.length) {
        pageContent.innerHTML = '<p>Загрузка...</p>';
        pageIndicator.textContent = '0 / 0';
        return;
    }

    // Преобразуем текст страницы в HTML с параграфами
    const pageText = pages[currentPage];
    // Разделяем по двойному переводу строки, которые мы добавляли при формировании
    const paragraphs = pageText.split('\n\n').filter(p => p.trim() !== '');
    const html = paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    pageContent.innerHTML = html;

    // Обновляем индикатор
    pageIndicator.textContent = `${currentPage+1} / ${totalPages}`;

    // Сохраняем прогресс
    saveProgress();
}

// --- Загрузить главу по индексу ---
function loadChapter(index) {
    if (index === currentChapter && pages.length > 0) {
        // Уже загружена, просто прокручиваем к сохранённой странице
        renderPage();
        return;
    }

    currentChapter = index;
    const fullText = chapters[index].text;

    // Сброс прокрутки и страницы
    pageContent.scrollTop = 0;

    // Даём время на обновление размеров контейнера
    setTimeout(() => {
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        if (currentPage < 0) currentPage = 0;
        renderPage();

        // Обновляем активную кнопку главы
        chapterButtons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }, 50);
}

// --- Обработка свайпа вверх/вниз ---
let touchStartY = 0;
let touchMoved = false;

pageContent.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
}, { passive: true });

pageContent.addEventListener('touchmove', () => {
    touchMoved = true;
}, { passive: true });

pageContent.addEventListener('touchend', (e) => {
    if (!touchStartY || touchMoved) {
        touchStartY = 0;
        return;
    }

    const diff = e.changedTouches[0].clientY - touchStartY;
    const threshold = 30; // минимальное расстояние для свайпа

    if (Math.abs(diff) > threshold) {
        if (diff < 0 && currentPage < totalPages - 1) {
            // свайп вверх -> следующая страница
            currentPage++;
            pageContent.scrollTop = 0;
            renderPage();
        } else if (diff > 0 && currentPage > 0) {
            // свайп вниз -> предыдущая страница
            currentPage--;
            pageContent.scrollTop = 0;
            renderPage();
        }
    }
    touchStartY = 0;
}, { passive: true });

// --- Кнопки глав ---
chapterButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        loadChapter(idx);
    });
});

// --- Переключение темы ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-beige');
    document.body.classList.toggle('theme-brown');
    themeToggle.textContent = document.body.classList.contains('theme-brown') ? '☀️' : '🌙';
    saveProgress();

    // Пересчитать страницы при изменении темы (размер шрифта мог измениться)
    if (chapters[currentChapter]) {
        const fullText = chapters[currentChapter].text;
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        renderPage();
    }
});

// --- Обработка изменения размера окна (пересчёт страниц) ---
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