pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ── Telegram Web App ──────────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand(); // открываем на весь экран
}

// Тема из Telegram (dark / light)
function applyTgTheme() {
  const isDark = tg?.colorScheme === "dark";
  document.body.className = isDark ? "dark" : "light";
}
applyTgTheme();
tg?.onEvent("themeChanged", applyTgTheme);

// ── Сохранение страницы ───────────────────────────────────────────
// Используем Telegram CloudStorage (работает без сервера!)
function savePage(num) {
  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem("savedPage", String(num));
  } else {
    try { localStorage.setItem("savedPage", num); } catch(e) {}
  }
}

function loadPage(callback) {
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem("savedPage", (err, val) => {
      callback(val ? parseInt(val) : 1);
    });
  } else {
    try { callback(parseInt(localStorage.getItem("savedPage")) || 1); }
    catch(e) { callback(1); }
  }
}

// ── PDF ───────────────────────────────────────────────────────────
let pdfDoc      = null;
let currentPage = 1;
let totalPages  = 0;
let renderTask  = null;

const canvas       = document.getElementById("pdfCanvas");
const ctx          = canvas.getContext("2d");
const wrapper      = document.getElementById("canvasWrapper");
const textLayerDiv = document.getElementById("textLayer");

const chapterStartPages = {
  1: 1,
  2: 16,
  3: 31,
  4: 46,
  5: 61,
  6: 76,
  7: 91
};

function getScale() {
  // Масштаб под ширину экрана телефона
  const maxWidth = window.innerWidth - 20;
  return Math.min(1.4, maxWidth / 595); // 595 — стандартная ширина PDF
}

function renderPage(num) {
  wrapper.style.opacity   = "0";
  wrapper.style.transform = "translateX(20px)";

  if (renderTask) { renderTask.cancel(); renderTask = null; }

  setTimeout(() => {
    pdfDoc.getPage(num).then((page) => {
      const scale    = getScale();
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width  = viewport.width;

      textLayerDiv.style.setProperty("--scale-factor", scale);
      textLayerDiv.style.width  = viewport.width  + "px";
      textLayerDiv.style.height = viewport.height + "px";
      textLayerDiv.innerHTML = "";

      renderTask = page.render({ canvasContext: ctx, viewport });

      renderTask.promise.then(() => {
        renderTask = null;
        return page.getTextContent({ includeMarkedContent: true });
      }).then((textContent) => {
        pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: [],
          enhanceTextSelection: true,
        });

        document.getElementById("pageInfo").innerText =
          `${num} / ${totalPages}`;

        savePage(num);
        updateCurrentChapter(num);

        wrapper.style.opacity   = "1";
        wrapper.style.transform = "translateX(0)";

      }).catch((err) => {
        if (err?.name !== "RenderingCancelledException") console.error(err);
      });
    });
  }, 150);
}

function updateCurrentChapter(page) {
  let active = 1;
  for (let ch in chapterStartPages) {
    if (page >= chapterStartPages[ch]) active = ch;
  }
  document.querySelectorAll(".chapter-btn").forEach(btn =>
    btn.classList.remove("active")
  );
  document.querySelector(`.chapter-btn:nth-child(${active})`)
    ?.classList.add("active");
}

pdfjsLib.getDocument("book.pdf").promise.then((pdf) => {
  pdfDoc     = pdf;
  totalPages = pdf.numPages;
  loadPage((saved) => {
    currentPage = saved;
    renderPage(currentPage);
  });
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage < totalPages) renderPage(++currentPage);
});
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) renderPage(--currentPage);
});

// Свайп для листания страниц
let touchStartX = 0;
document.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentPage < totalPages) renderPage(++currentPage);
    if (diff < 0 && currentPage > 1)         renderPage(--currentPage);
  }
});

function goToChapter(chapter) {
  currentPage = chapterStartPages[chapter];
  renderPage(currentPage);
}

// Пересчёт масштаба при повороте экрана
window.addEventListener("resize", () => renderPage(currentPage));
