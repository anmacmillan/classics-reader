/* ─── CLASSICS READER — MANON & MARGOT ──────────────────────────────
   A warm, fire-lit reader for Latin and Ancient Greek.
   ──────────────────────────────────────────────────────────────────── */

const state = {
  user: null,
  books: [],
  currentBookIndex: 0,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  totalPagesCount: 1,
  vocab: {},
  layoutMode: "page",
  highlights: []
};

function userKey(k) { return state.user ? `${state.user}_${k}` : k; }

// ─── Init ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("classics_user");
  if (savedUser) {
    state.user = savedUser;
    showLibrary();
  } else {
    showUserPicker();
  }
});

// ─── User Picker ────────────────────────────────────────────────────────
function showUserPicker() {
  const el = document.getElementById("splash-screen");
  if (!el) return;
  el.innerHTML = `
    <div class="splash-card">
      <div class="logo-fire">🔥</div>
      <h1>Classics Reader</h1>
      <p>Wie leest er vandaag?</p>
      <div class="user-buttons">
        <button class="user-btn" data-u="manon">
          <span class="user-emoji">🎀</span>
          <span>Manon</span>
          <small>3de jaar · Latijn-Grieks</small>
        </button>
        <button class="user-btn" data-u="margot">
          <span class="user-emoji">🌸</span>
          <span>Margot</span>
          <small>3de jaar · Latijn-Grieks</small>
        </button>
      </div>
    </div>
  `;
  el.querySelectorAll(".user-btn").forEach(b => b.addEventListener("click", () => {
    state.user = b.dataset.u;
    localStorage.setItem("classics_user", state.user);
    el.innerHTML = "";
    showLibrary();
  }));
}

// ─── Library ──────────────────────────────────────────────────────────────
function showLibrary() {
  state.books = [...BOOKS];
  const el = document.getElementById("splash-screen");
  if (!el) return;
  el.innerHTML = `<div class="book-grid">
    ${state.books.map((b, i) => `
      <div class="book-card" data-i="${i}">
        <div class="book-icon">${b.lang === "latin" ? "📜" : "🏛️"}</div>
        <h3>${b.title}</h3>
        <p class="book-author">${b.author}</p>
        <p class="book-meta">${b.lang} · ${Math.abs(b.year)} v.Chr.</p>
        <div class="progress-bar" style="width:${getProgress(i)}%"></div>
      </div>
    `).join("")}</div>`;
  el.querySelectorAll(".book-card").forEach(c => c.addEventListener("click", () => {
    const i = parseInt(c.dataset.i);
    state.currentBookIndex = i;
    state.currentChapterIndex = 0;
    state.currentPageIndex = 0;
    el.innerHTML = "";
    renderBook();
  }));
}

function getProgress(i) {
  return parseInt(localStorage.getItem(userKey(`book_${i}`)) || "0");
}

// ─── Render Book ──────────────────────────────────────────────────────────
function renderBook() {
  const book = state.books[state.currentBookIndex];
  const ch = book.chapters[state.currentChapterIndex];
  const container = document.getElementById("reader-pane");
  if (!container) return;
  container.innerHTML = `
    <div class="reader-header">
      <div class="reader-title">${book.title} — ${ch.title}</div>
      <div class="reader-controls">
        <button id="prev-page" class="btn">←</button>
        <span id="page-indicator">Pagina 1 van 1</span>
        <button id="next-page" class="btn">→</button>
      </div>
    </div>
    <div id="chunks-container" class="chunks-container">
      ${ch.lines.map((line, j) => `
        <div class="chunk-row">
          <div class="line-original">${line}</div>
          <div class="line-translation">${ch.translation[j] || ""}</div>
        </div>
      `).join("")}
    </div>
  `;
  recalculatePages();
  document.getElementById("prev-page")?.addEventListener("click", prevPage);
  document.getElementById("next-page")?.addEventListener("click", nextPage);
}

// ─── Page Turn ────────────────────────────────────────────────────────────
function recalculatePages() {
  const container = document.getElementById("chunks-container");
  if (!container) return;
  const pageHeight = container.clientHeight;
  const contentHeight = container.scrollHeight;
  state.totalPagesCount = Math.max(1, Math.ceil(contentHeight / pageHeight));
}

function prevPage() {
  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    updatePagePosition();
  }
}

function nextPage() {
  if (state.currentPageIndex < state.totalPagesCount - 1) {
    state.currentPageIndex++;
    updatePagePosition();
  }
}

function updatePagePosition() {
  const container = document.getElementById("chunks-container");
  if (!container) return;
  const pageHeight = container.clientHeight;
  container.style.transform = `translateY(-${state.currentPageIndex * pageHeight}px)`;
  document.getElementById("page-indicator").textContent = `Pagina ${state.currentPageIndex + 1} van ${state.totalPagesCount}`;
  localStorage.setItem(userKey(`book_${state.currentBookIndex}`), Math.round((state.currentPageIndex / state.totalPagesCount) * 100));
}

// ─── Dictionary lookup ────────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const word = e.target.closest(".line-original")?.textContent?.trim().split(/\s+/).find(w => e.target.closest(".line-original"));
  if (!word) return;
  if (typeof LATIN_DICT !== "undefined") {
    const entry = LATIN_DICT[word.toLowerCase()];
    if (entry) {
      alert(`${word}: ${entry.def} (${entry.grammar})`);
      return;
    }
  }
  alert("Woord niet gevonden in woordenboek");
});