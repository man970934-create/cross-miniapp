// данные из chapters.js
const chaptersData = chapters; // предполагается, что chapters объявлен в chapters.js

let currentChap = 0;
let currentPage = 0;
let pages = [];
let totalPages = 0;
let hintShown = false;

const reader = document.getElementById('reader');
const pageNum = document.getElementById('pageNum');
const hint = document.getElementById('hint');
const themeBtn = document.getElementById('themeBtn');
const toggleDesc = document.getElementById('toggleDesc');
const desc = document.getElementById('desc');
const chapBtns = document.querySelectorAll('.chap');

// загрузка сохранённого
function loadState() {
    const saved = localStorage.getItem('kross');
    if (saved) {
        try {
            const { chap, page, theme, descCollapsed, hintHidden } = JSON.parse(saved);
            currentChap = chap || 0;
            currentPage = page || 0;
            if (theme === 'brown') {
                document.body.classList.remove('theme-beige');
                document.body.classList.add('theme-brown');
                themeBtn.textContent = '☀️';
            }
            if (descCollapsed) {
                desc.classList.add('collapsed');
                toggleDesc.textContent = '▼';
            }
            if (hintHidden) {
                hint.classList.add('hidden');
                hintShown = true;
            }
        } catch (e) {}
    }
}

// сохранение
function saveState() {
    const theme = document.body.classList.contains('theme-brown') ? 'brown' : 'beige';
    const descCollapsed = desc.classList.contains('collapsed');
    const hintHidden = hint.classList.contains('hidden');
    localStorage.setItem('kross', JSON.stringify({
        chap: currentChap,
        page: currentPage,
        theme: theme,
        descCollapsed: descCollapsed,
        hintHidden: hintHidden
    }));
}

// разбиение текста на страницы
function splitPages(text) {
    const temp = document.createElement('div');
    temp.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${reader.clientWidth}px;
        padding: ${getComputedStyle(reader).padding};
        font-size: 1rem;
        line-height: 1.8;
        font-family: Georgia, serif;
    `;
    document.body.appendChild(temp);

    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
    const pages = [];
    let current = '';
    let currentHeight = 0;
    const maxHeight = reader.clientHeight;

    paragraphs.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        temp.appendChild(p);
        const h = p.offsetHeight;
        temp.removeChild(p);

        if (currentHeight + h > maxHeight && current) {
            pages.push(current);
            current = para + '\n\n';
            currentHeight = h;
        } else {
            current += para + '\n\n';
            currentHeight += h;
        }
    });
    if (current) pages.push(current);

    document.body.removeChild(temp);
    return pages;
}

// отобразить текущую страницу
function renderPage() {
    if (!pages.length) return;
    const html = pages[currentPage].split('\n\n').map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
    reader.innerHTML = html;
    pageNum.textContent = `${currentPage+1} / ${totalPages}`;
    saveState();
}

// загрузить главу
function loadChapter(index) {
    if (index === currentChap && pages.length) {
        renderPage();
        return;
    }
    currentChap = index;
    currentPage = 0;
    const fullText = chaptersData[index].text;
    // небольшая задержка, чтобы reader уже имел размеры
    setTimeout(() => {
        pages = splitPages(fullText);
        totalPages = pages.length;
        renderPage();
        // подсветка кнопки
        chapBtns.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }, 20);
}

// свайп
let touchStart = null;
reader.addEventListener('touchstart', (e) => {
    touchStart = e.touches[0].clientY;
});
reader.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const diff = e.changedTouches[0].clientY - touchStart;
    const threshold = 40;
    if (Math.abs(diff) > threshold) {
        if (diff < 0 && currentPage < totalPages - 1) {
            // вверх
            currentPage++;
            renderPage();
        } else if (diff > 0 && currentPage > 0) {
            // вниз
            currentPage--;
            renderPage();
        }
    }
    touchStart = null;

    // скрыть подсказку при первом свайпе
    if (!hintShown) {
        hint.classList.add('hidden');
        hintShown = true;
        saveState();
    }
});

// клик по кнопкам глав
chapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.chap);
        loadChapter(idx);
        if (!hintShown) {
            hint.classList.add('hidden');
            hintShown = true;
            saveState();
        }
    });
});

// переключение темы
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-beige');
    document.body.classList.toggle('theme-brown');
    themeBtn.textContent = document.body.classList.contains('theme-brown') ? '☀️' : '🌙';
    saveState();
    // пересчитать страницы (из-за возможного изменения шрифта)
    if (chaptersData[currentChap]) {
        const fullText = chaptersData[currentChap].text;
        pages = splitPages(fullText);
        totalPages = pages.length;
        renderPage();
    }
});

// сворачивание описания
toggleDesc.addEventListener('click', () => {
    desc.classList.toggle('collapsed');
    toggleDesc.textContent = desc.classList.contains('collapsed') ? '▼' : '▲';
    saveState();
    // пересчитать страницы, так как изменилась высота reader
    if (chaptersData[currentChap]) {
        const fullText = chaptersData[currentChap].text;
        pages = splitPages(fullText);
        totalPages = pages.length;
        renderPage();
    }
});

// ресайз окна
window.addEventListener('resize', () => {
    if (chaptersData[currentChap]) {
        const fullText = chaptersData[currentChap].text;
        pages = splitPages(fullText);
        totalPages = pages.length;
        renderPage();
    }
});

// старт
loadState();
loadChapter(currentChap);
