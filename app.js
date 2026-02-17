pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* ── CONFIG ──────────────────────────────────── */
const CHAPTER_STARTS = {
  1:  1,
  2:  16,
  3:  31,
  4:  46,
  5:  61,
  6:  76,
  7:  91,
};
const RENDER_SCALE = 1.8; // higher = crisper on mobile retina

/* ── STATE ───────────────────────────────────── */
let pdfDoc     = null;
let totalPages = 0;
let currentPage = 1;
let rendering  = false;

/* ── DOM REFS ────────────────────────────────── */
const scrollContainer = document.getElementById("scrollContainer");
const pagesInner      = document.getElementById("pagesInner");
const pageInfo        = document.getElementById("pageInfo");
const prevBtn         = document.getElementById("prevPage");
const nextBtn         = document.getElementById("nextPage");

/* ── THEME ───────────────────────────────────── */
const savedTheme = localStorage.getItem("theme") || "dark";
document.body.className = savedTheme;
updateThemeIcon();

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  document.body.classList.toggle("dark",  !isDark);
  document.body.classList.toggle("light",  isDark);
  localStorage.setItem("theme", isDark ? "light" : "dark");
  updateThemeIcon();
});

function updateThemeIcon() {
  const btn = document.getElementById("themeToggle");
  btn.textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
}

/* ── LOAD PDF ────────────────────────────────── */
pdfjsLib.getDocument("book.pdf").promise.then(pdf => {
  pdfDoc     = pdf;
  totalPages = pdf.numPages;

  const saved = parseInt(localStorage.getItem("savedPage"), 10);
  currentPage = (saved && saved >= 1 && saved <= totalPages) ? saved : 1;

  renderPage(currentPage);
}).catch(err => {
  pagesInner.innerHTML = `<p style="color:#c87;padding:20px">Ошибка загрузки PDF: ${err.message}</p>`;
});

/* ── RENDER A SINGLE PAGE ────────────────────── */
function renderPage(num) {
  if (!pdfDoc || rendering) return;
  rendering = true;

  // Skeleton placeholder
  pagesInner.innerHTML = "";
  const skeleton = document.createElement("div");
  skeleton.className = "page-skeleton";
  pagesInner.appendChild(skeleton);

  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      const wrapper = document.createElement("div");
      wrapper.className = "page-wrapper";
      wrapper.id = `page-${num}`;
      wrapper.appendChild(canvas);

      pagesInner.innerHTML = "";
      pagesInner.appendChild(wrapper);

      scrollContainer.scrollTop = 0;

      currentPage = num;
      localStorage.setItem("savedPage", num);
      updateUI();
      rendering = false;
    });
  });
}

/* ── UPDATE UI ───────────────────────────────── */
function updateUI() {
  pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  updateActiveChapter(currentPage);
}

function updateActiveChapter(page) {
  let active = 1;
  for (const ch in CHAPTER_STARTS) {
    if (page >= CHAPTER_STARTS[ch]) active = parseInt(ch);
  }
  document.querySelectorAll(".chapter-btn").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.chapter) === active);
  });
}

/* ── BUTTONS ─────────────────────────────────── */
nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) renderPage(currentPage + 1);
});
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) renderPage(currentPage - 1);
});

/* ── CHAPTER JUMP ────────────────────────────── */
function goToChapter(ch) {
  if (CHAPTER_STARTS[ch]) renderPage(CHAPTER_STARTS[ch]);
}

/* ── SWIPE NAVIGATION ────────────────────────── */
// Vertical swipe on the scroll container:
// swipe UP   = next page  (feels natural like turning a page down)
// swipe DOWN = prev page
let touchStartY = 0;
let touchStartX = 0;

scrollContainer.addEventListener("touchstart", e => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

scrollContainer.addEventListener("touchend", e => {
  const dy = touchStartY - e.changedTouches[0].clientY;
  const dx = Math.abs(touchStartX - e.changedTouches[0].clientX);

  // Only trigger if swipe is more vertical than horizontal
  if (Math.abs(dy) > 60 && Math.abs(dy) > dx * 1.5) {
    if (dy > 0 && currentPage < totalPages) {
      renderPage(currentPage + 1); // swipe up → next
    } else if (dy < 0 && currentPage > 1) {
      renderPage(currentPage - 1); // swipe down → prev
    }
  }
}, { passive: true });

/* ── KEYBOARD (desktop) ──────────────────────── */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    if (currentPage < totalPages) renderPage(currentPage + 1);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    if (currentPage > 1) renderPage(currentPage - 1);
  }
});
