pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const wrapper = document.getElementById("canvasWrapper");

/* 👇 УКАЖИ НАЧАЛО ГЛАВ */
const chapterStartPages = {
  1: 1,
  2: 16,
  3: 31,
  4: 46,
  5: 61,
  6: 76,
  7: 91
};

function renderPage(num) {

  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateX(20px)";

  setTimeout(() => {

    pdfDoc.getPage(num).then(function (page) {

      const viewport = page.getViewport({ scale: 1.4 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({
        canvasContext: ctx,
        viewport: viewport,
      });

      document.getElementById("pageInfo").innerText =
        `Страница ${num} из ${totalPages}`;

      localStorage.setItem("savedPage", num);

      updateCurrentChapter(num);

      wrapper.style.opacity = "1";
      wrapper.style.transform = "translateX(0)";
    });

  }, 150);
}

function updateCurrentChapter(page) {
  let active = 1;

  for (let chapter in chapterStartPages) {
    if (page >= chapterStartPages[chapter]) {
      active = chapter;
    }
  }

  document.querySelectorAll(".chapter-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(`.chapter-btn:nth-child(${active})`)
    ?.classList.add("active");
}

pdfjsLib.getDocument("book.pdf").promise.then(function (pdf) {
  pdfDoc = pdf;
  totalPages = pdf.numPages;

  const saved = localStorage.getItem("savedPage");
  currentPage = saved ? parseInt(saved) : 1;

  renderPage(currentPage);
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
  }
});

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
});

function goToChapter(chapter) {
  currentPage = chapterStartPages[chapter];
  renderPage(currentPage);
}

/* ТЕМА */
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});
