/* ─── App ──────────────────────────────────────────────────────────────── */

const state = {
  books: [],
  currentBookIndex: 0,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  totalPages: 1,
};

function userKey(k) { return k; }

document.addEventListener("DOMContentLoaded", () => {
  showLibrary();
});

function showLibrary() {
  state.books = [...BOOKS];
  const el = document.getElementById("splash-screen");
  if (!el) return;
  el.innerHTML = `<div class="book-grid">
    ${state.books.map((b, i) => `<div class="book-card" onclick="selectBook(${i})">
      <h3>${b.title}</h3>
      <p>${b.author} · ${b.lang === "latin" ? "Latijn" : "Grieks"}</p>
    </div>`).join("")}
  </div>`;
}

function selectBook(i) {
  state.currentBookIndex = i;
  state.currentChapterIndex = 0;
  state.currentPageIndex = 0;
  const el = document.getElementById("splash-screen");
  el.innerHTML = "";
  renderChapter();
}

function renderChapter() {
  const book = state.books[state.currentBookIndex];
  const ch = book.chapters[0];
  const el = document.getElementById("splash-screen");
  el.innerHTML = `
    <div class="page-controls">
      <button onclick="prevPage()">←</button>
      <span id="page-indicator">1 / ${state.totalPages}</span>
      <button onclick="nextPage()">→</button>
    </div>
    <div class="reader-pane">
      ${ch.lines.map((l, j) => `
        <div class="chunk-row">
          <h3>${l}</h3>
          <p>${ch.translation[j]}</p>
        </div>
      `).join("")}
    </div>
  `;
  recalcPages();
}

function recalcPages() {
  const pane = document.querySelector(".reader-pane");
  if (!pane) return;
  state.totalPages = Math.max(1, Math.ceil(pane.scrollHeight / pane.clientHeight));
  document.getElementById("page-indicator").textContent = `1 / ${state.totalPages}`;
}

function prevPage() {
  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    translatePane();
  }
}

function nextPage() {
  if (state.currentPageIndex < state.totalPages - 1) {
    state.currentPageIndex++;
    translatePane();
  }
}

function translatePane() {
  const pane = document.querySelector(".reader-pane");
  if (!pane) return;
  pane.style.transform = `translateY(-${state.currentPageIndex * pane.clientHeight}px)`;
  document.getElementById("page-indicator").textContent = `${state.currentPageIndex + 1} / ${state.totalPages}`;
}