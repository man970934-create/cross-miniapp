pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc     = null;
let currentPage  = 1;
let totalPages   = 0;
let renderTask   = null;

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

// Безопасное сохранение страницы (localStorage может быть заблокирован)
function savePage(num) {
  try { localStorage.setItem("savedPage", num); } catch(e) {}
}
function loadPage() {
  try { return parseInt(localStorage.getItem("savedPage")) || 1; } catch(e) { return 1; }
}

function renderPage(num) {
  wrapper.style.opacity   = "0";
  wrapper.style.transform = "translateX(20px)";

  if (renderTask) { renderTask.cancel(); renderTask = null; }

  setTimeout(() => {
    pdfDoc.getPage(num).then((page) => {
      const scale    = 1.4;
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width  = viewport.width;

      // ✅ Исправление: устанавливаем --scale-factor на textLayer
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
          `Страница ${num} из ${totalPages}`;

        savePage(num); // ✅ Безопасный вызов
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
  currentPage = loadPage(); // ✅ Безопасная загрузка
  renderPage(currentPage);
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage < totalPages) renderPage(++currentPage);
});
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) renderPage(--currentPage);
});

function goToChapter(chapter) {
  currentPage = chapterStartPages[chapter];
  renderPage(currentPage);
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  document.body.classList.toggle("light", !isDark);
  document.getElementById("themeToggle").textContent = isDark ? "🌙" : "☀️";
});
