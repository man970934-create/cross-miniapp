pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

/* 👇 УКАЖИ ЗДЕСЬ СТРАНИЦЫ НАЧАЛА ГЛАВ */
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

    /* 🔥 АВТОСОХРАНЕНИЕ */
    localStorage.setItem("savedPage", num);
  });
}

pdfjsLib.getDocument("book.pdf").promise.then(function (pdf) {
  pdfDoc = pdf;
  totalPages = pdf.numPages;

  const savedPage = localStorage.getItem("savedPage");
  currentPage = savedPage ? parseInt(savedPage) : 1;

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

function goToChapter(chapterNumber) {
  const page = chapterStartPages[chapterNumber];
  currentPage = page;
  renderPage(currentPage);
}

/* ТЕМА */
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});