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

// ── Сохранение главы ───────────────────────────────────────────────
// Используем Telegram CloudStorage (работает без сервера!)
function saveChapter(num) {
  if (tg?.CloudStorage) {
    tg.CloudStorage.setItem("savedChapter", String(num));
  } else {
    try { localStorage.setItem("savedChapter", num); } catch(e) {}
  }
}

function loadChapter(callback) {
  if (tg?.CloudStorage) {
    tg.CloudStorage.getItem("savedChapter", (err, val) => {
      callback(val ? parseInt(val) : 1);
    });
  } else {
    try { callback(parseInt(localStorage.getItem("savedChapter")) || 1); }
    catch(e) { callback(1); }
  }
}

// ── HTML Chapters ───────────────────────────────────────────────────────────
let currentChapter = 1;
const totalChapters = 7;

const wrapper = document.getElementById("contentWrapper");
const contentDiv = document.getElementById("chapterContent");

function renderChapter(num) {
  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateX(20px)";

  setTimeout(() => {
    fetch(`chapter${num}.html`)
      .then(response => response.text())
      .then(html => {
        // Извлекаем содержимое body из загруженного HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;
        
        contentDiv.innerHTML = bodyContent;
        
        document.getElementById("chapterInfo").innerText = `Глава ${num} / ${totalChapters}`;
        
        saveChapter(num);
        updateCurrentChapter(num);
        
        // Прокручиваем в начало
        wrapper.scrollTop = 0;
        
        wrapper.style.opacity = "1";
        wrapper.style.transform = "translateX(0)";
      })
      .catch(err => {
        console.error("Ошибка загрузки главы:", err);
        contentDiv.innerHTML = "<p style='text-align:center; color:red;'>Ошибка загрузки главы</p>";
        wrapper.style.opacity = "1";
        wrapper.style.transform = "translateX(0)";
      });
  }, 150);
}

function updateCurrentChapter(chapter) {
  document.querySelectorAll(".chapter-btn").forEach((btn, index) => {
    btn.classList.remove("active");
    if (index + 1 === chapter) {
      btn.classList.add("active");
    }
  });
}

// Загружаем сохраненную главу при старте
loadChapter((saved) => {
  currentChapter = saved;
  renderChapter(currentChapter);
});

document.getElementById("nextChapter").addEventListener("click", () => {
  if (currentChapter < totalChapters) {
    currentChapter++;
    renderChapter(currentChapter);
  }
});

document.getElementById("prevChapter").addEventListener("click", () => {
  if (currentChapter > 1) {
    currentChapter--;
    renderChapter(currentChapter);
  }
});

// Свайп для листания глав
let touchStartX = 0;
document.addEventListener("touchstart", e => { 
  touchStartX = e.touches[0].clientX; 
});

document.addEventListener("touchend", e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentChapter < totalChapters) {
      currentChapter++;
      renderChapter(currentChapter);
    }
    if (diff < 0 && currentChapter > 1) {
      currentChapter--;
      renderChapter(currentChapter);
    }
  }
});

function goToChapter(chapter) {
  currentChapter = chapter;
  renderChapter(currentChapter);
}
