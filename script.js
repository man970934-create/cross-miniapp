// Состояние
let currentChapter = 0;
let currentPage = 0;
let pages = [];
let totalPages = 0;
let isFirstSwipe = true; // для подсказки

// Элементы
const currentPageEl = document.getElementById('currentPage');
const nextPageEl = document.getElementById('nextPage');
const pageIndicator = document.getElementById('pageIndicator');
const chapterPanel = document.getElementById('chapterPanel');
const menuToggle = document.getElementById('menuToggle');
const themeToggle = document.getElementById('themeToggle');
const authorInfo = document.getElementById('authorInfo');
const toggleDesc = document.getElementById('toggleDesc');
const swipeHint = document.getElementById('swipeHint');

let touchStartY = 0;
let isSwiping = false;

// --- Загрузка/сохранение (аналогично предыдущему, добавим состояние свёрнутости) ---
function loadSaved() {
    const saved = localStorage.getItem('kross_reader');
    if (saved) {
        try {
            const { chapter, page, theme, descCollapsed } = JSON.parse(saved);
            if (chapter >= 0 && chapter < chapters.length) {
                currentChapter = chapter;
                currentPage = page;
            }
            if (theme === 'brown') {
                document.body.classList.remove('theme-beige');
                document.body.classList.add('theme-brown');
                themeToggle.textContent = '☀️';
            }
            if (descCollapsed) {
                authorInfo.classList.add('collapsed');
                toggleDesc.textContent = '▼';
            } else {
                authorInfo.classList.remove('collapsed');
                toggleDesc.textContent = '▲';
            }
        } catch (e) {}
    }
}

function saveProgress() {
    const theme = document.body.classList.contains('theme-brown') ? 'brown' : 'beige';
    const descCollapsed = authorInfo.classList.contains('collapsed');
    localStorage.setItem('kross_reader', JSON.stringify({
        chapter: currentChapter,
        page: currentPage,
        theme: theme,
        descCollapsed: descCollapsed
    }));
}

// --- Разбиение на страницы (адаптивное) ---
function splitIntoPages(text) {
    // используем временный div как раньше, но учитываем высоту контейнера страницы
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${currentPageEl.clientWidth}px;
        padding: 20px;
        font-size: 1rem;
        line-height: 1.8;
        font-family: Georgia, serif;
    `;
    document.body.appendChild(tempDiv);
    const paragraphs = text.split(/\n\s*\n/);
    const pages = [];
    let currentText = '';
    let currentHeight = 0;
    const maxHeight = currentPageEl.clientHeight;

    paragraphs.forEach(para => {
        const clean = para.replace(/\s+/g, ' ').trim();
        if (!clean) return;
        const p = document.createElement('p');
        p.textContent = clean;
        tempDiv.appendChild(p);
        const h = p.offsetHeight;
        tempDiv.removeChild(p);

        if (currentHeight + h > maxHeight && currentText !== '') {
            pages.push(currentText);
            currentText = clean + '\n\n';
            currentHeight = h;
        } else {
            currentText += clean + '\n\n';
            currentHeight += h;
        }
    });
    if (currentText) pages.push(currentText);
    document.body.removeChild(tempDiv);
    return pages;
}

// --- Отрисовка страницы ---
function renderPage() {
    if (!pages.length) {
        currentPageEl.innerHTML = '<p>Загрузка...</p>';
        pageIndicator.textContent = '0 / 0';
        return;
    }
    const pageText = pages[currentPage];
    const paragraphs = pageText.split('\n\n').filter(p => p.trim());
    currentPageEl.innerHTML = paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    pageIndicator.textContent = `${currentPage+1} / ${totalPages}`;
    saveProgress();

    // Скрываем подсказку после первого свайпа
    if (isFirstSwipe) {
        swipeHint.classList.add('hint-hidden');
        isFirstSwipe = false;
    }
}

// --- Загрузка главы ---
function loadChapter(index) {
    if (index === currentChapter && pages.length) {
        renderPage();
        return;
    }
    currentChapter = index;
    currentPage = 0;
    const fullText = chapters[index].text;
    setTimeout(() => {
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        renderPage();
        // Обновить активную кнопку главы
        document.querySelectorAll('.chapter-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }, 50);
}

// --- Обработка вертикального свайпа ---
currentPageEl.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
}, { passive: true });

currentPageEl.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    e.preventDefault(); // предотвращаем стандартный скролл страницы во время свайпа
}, { passive: false });

currentPageEl.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const diff = e.changedTouches[0].clientY - touchStartY;
    const threshold = 40;

    if (Math.abs(diff) > threshold) {
        if (diff < 0 && currentPage < totalPages - 1) {
            // свайп вверх -> следующая
            animatePageTransition('up');
            currentPage++;
            setTimeout(() => renderPage(), 150); // даём время на анимацию
        } else if (diff > 0 && currentPage > 0) {
            // свайп вниз -> предыдущая
            animatePageTransition('down');
            currentPage--;
            setTimeout(() => renderPage(), 150);
        }
    }
    isSwiping = false;
}, { passive: true });

function animatePageTransition(direction) {
    const offset = direction === 'up' ? '-100%' : '100%';
    currentPageEl.style.transition = 'transform 0.2s ease';
    currentPageEl.style.transform = `translateY(${offset})`;
    setTimeout(() => {
        currentPageEl.style.transition = '';
        currentPageEl.style.transform = '';
    }, 200);
}

// --- Кнопка меню (показать/скрыть главы) ---
menuToggle.addEventListener('click', () => {
    chapterPanel.classList.toggle('visible');
});

// --- Кнопки глав ---
document.querySelectorAll('.chapter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.chapter);
        loadChapter(idx);
        chapterPanel.classList.remove('visible'); // скрыть панель после выбора
    });
});

// --- Сворачивание описания ---
toggleDesc.addEventListener('click', () => {
    authorInfo.classList.toggle('collapsed');
    toggleDesc.textContent = authorInfo.classList.contains('collapsed') ? '▼' : '▲';
    saveProgress();
    // Пересчитать страницы, так как изменилась доступная высота
    if (chapters[currentChapter]) {
        const fullText = chapters[currentChapter].text;
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        renderPage();
    }
});

// --- Переключение темы ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-beige');
    document.body.classList.toggle('theme-brown');
    themeToggle.textContent = document.body.classList.contains('theme-brown') ? '☀️' : '🌙';
    saveProgress();
    // Пересчитать страницы (шрифт мог измениться)
    if (chapters[currentChapter]) {
        const fullText = chapters[currentChapter].text;
        pages = splitIntoPages(fullText);
        totalPages = pages.length;
        currentPage = Math.min(currentPage, totalPages - 1);
        renderPage();
    }
});

// --- Инициализация ---
loadSaved();
loadChapter(currentChapter);
