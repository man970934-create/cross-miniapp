// Состояние приложения
let currentChapter = 0;          // индекс главы (0-6)
let currentPage = 0;             // индекс страницы в текущей главе
let pages = [];                  // массив фрагментов текста для текущей главы
let totalPages = 0;

// Элементы DOM
const pagesContainer = document.getElementById('pagesContainer');
const pageIndicator = document.getElementById('pageIndicator');
const chapterButtons = document.querySelectorAll('.chapter-btn');
const themeToggle = document.getElementById('themeToggle');

// Две страницы для анимации (предыдущая и текущая)
let currentPageElement = null;
let nextPageElement = null;

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

    // Разбиваем текст на абзацы (по двойному переводу строки)
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

// --- Создание DOM-элемента страницы из текста ---
function createPageElement(text) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    const html = paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    pageDiv.innerHTML = html;
    return pageDiv;
}

// --- Отображение текущей страницы с анимацией (горизонтальный переход) ---
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
        // Анимированная замена
        const oldPage = currentPageElement;
        const newPage = newPageElement;

        // Определяем направление
        const startTransform = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
        const endTransform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';

        oldPage.style.transition = 'transform 0.3s ease-in-out';
        newPage.style.transition = 'transform 0.3s ease-in-out';
        newPage.style.transform = startTransform;

        pagesContainer.appendChild(newPage);

        // Небольшая задержка для применения начального состояния
        requestAnimationFrame(() => {
            oldPage.style.transform = endTransform;
            newPage.style.transform = 'translateX(0)';
        });

        // После завершения анимации удаляем старую страницу
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

// --- Загрузить главу по индексу ---
function loadChapter(index) {
    if (index === currentChapter && pages.length > 0) {
        // Уже загружена, просто переходим на сохранённую страницу
        // Но нужно обновить отображение страницы
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

    // Очищаем контейнер и сбрасываем currentPageElement
    pagesContainer.innerHTML = '';
    currentPageElement = null;

    // Даём время на обновление размеров контейнера
    setTimeout(() => {
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        renderPage();

        // Обновляем активную кнопку главы
        chapterButtons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }, 50);
}

// --- Обработка горизонтального свайпа ---
let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;

pagesContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
}, { passive: true });

pagesContainer.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchEndX = e.touches[0].clientX;
}, { passive: true });

pagesContainer.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const threshold = 50; // минимальное расстояние для свайпа
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) > threshold) {
        if (diff < 0 && currentPage < totalPages - 1) {
            // свайп влево -> следующая страница
            currentPage++;
            renderPage('next');
        } else if (diff > 0 && currentPage > 0) {
            // свайп вправо -> предыдущая страница
            currentPage--;
            renderPage('prev');
        }
    }

    isSwiping = false;
    touchStartX = 0;
    touchEndX = 0;
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
