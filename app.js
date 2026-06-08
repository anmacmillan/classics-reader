/* ─── App ──────────────────────────────────────────────────────────────── */

const state = {
  books: [],
  currentBookIndex: 0,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  totalPages: 1,
};

const GIST_FILE = "slovo_progress.json";
let scrollSyncTimer;

const STORAGE_KEYS = {
  PROGRESS: "classics_book_progress",
  GIST_ID: "slovo_gist_id",
  GIST_FILE: "slovo_progress.json"
};

document.addEventListener("DOMContentLoaded", async () => {
  state.books = [...BOOKS];
  loadProgressFromStorage();
  renderLibrary();

  // Back button
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showLibrary();
    });
  }

  // Chapter selector
  const chSelect = document.getElementById("chapter-select");
  if (chSelect) {
    chSelect.addEventListener("change", (e) => {
      state.currentChapterIndex = parseInt(e.target.value);
      state.currentPageIndex = 0;
      renderChapter();
    });
  }

  // Setup word hover/tap lookup
  setupWordHover();

  const readerPane = document.querySelector(".reader-pane");
  if (readerPane) {
    readerPane.addEventListener("scroll", syncPageFromScroll, { passive: true });
  }

  // Load from Gist
  await loadProgressFromGist();

  // Resize handler
  window.addEventListener("resize", () => {
    if (document.querySelector(".reader-pane") && document.getElementById("splash-screen").hasAttribute("hidden")) {
      // Only recalc if reader is visible
      recalcPages();
    }
  });
});

/* ─── Book Progress Persistence ─────────────────────────────────────────── */

function loadProgressFromStorage() {
  state.books.forEach((book, idx) => {
    const saved = localStorage.getItem(`book_${idx}_progress`);
    if (saved !== null) {
      book.chaptersRead = parseInt(saved);
    } else {
      book.chaptersRead = 0;
    }
  });
}

function saveProgressToStorage() {
  const book = state.books[state.currentBookIndex];
  const pct = Math.round(((state.currentChapterIndex + 1) / book.chapters.length) * 100);
  localStorage.setItem(`book_${state.currentBookIndex}_progress`, state.currentChapterIndex);
  return pct;
}

/* ─── Library / Splash ───────────────────────────────────────────────────── */

function showLibrary() {
  const splash = document.getElementById("splash-screen");
  const workspace = document.getElementById("app-workspace");
  if (splash) splash.removeAttribute("hidden");
  if (workspace) workspace.setAttribute("hidden", "");

  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.style.display = "none";

  // Save progress before returning to library
  if (state.currentBookIndex >= 0 && state.currentBookIndex < state.books.length) {
    saveProgressToStorage();
  }
  
  renderLibrary();
}

function renderLibrary() {
  const grid = document.getElementById("book-grid");
  if (!grid) return;
  grid.innerHTML = "";

  state.books.forEach((book, idx) => {
    const card = document.createElement("div");
    card.className = "book-card";

    const totalCh = book.chapters.length;
    const completedCh = book.chaptersRead || 0;
    const pct = Math.round((completedCh / totalCh) * 100);

    const langIcon = book.lang === "latin" ? "\u{1F4DC}" : "\u{1F525}";
    const langLabel = book.lang === "latin" ? "Latijn" : "Grieks";

    card.innerHTML = `
      <div class="book-icon">${langIcon}</div>
      <h3>${book.title}</h3>
      <div class="book-meta">
        <span>${book.author}</span>
        <span>· ${book.year < 0 ? Math.abs(book.year) + " v.Chr." : book.year}</span>
        <span>· ${totalCh} hoofdstuk${totalCh !== 1 ? "ken" : ""}</span>
      </div>
      <div class="book-progress">
        <div class="progress-track">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
        <span class="progress-text">${pct}%</span>
      </div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">
        ${langLabel}
      </div>
    `;

    card.addEventListener("click", () => {
      selectBook(idx);
    });

    grid.appendChild(card);
  });
}

function selectBook(idx) {
  state.currentBookIndex = idx;
  state.currentChapterIndex = 0;
  state.currentPageIndex = 0;

  const splash = document.getElementById("splash-screen");
  const workspace = document.getElementById("app-workspace");
  if (splash) splash.setAttribute("hidden", "");
  if (workspace) workspace.removeAttribute("hidden");

  const backBtn = document.getElementById("back-btn");
  if (backBtn) backBtn.style.display = "block";

  // Populate chapter selector
  const chSelect = document.getElementById("chapter-select");
  if (chSelect) {
    chSelect.innerHTML = "";
    const book = state.books[idx];
    book.chapters.forEach((ch, ci) => {
      const opt = document.createElement("option");
      opt.value = ci;
      opt.textContent = ch.title || `Hoofdstuk ${ci + 1}`;
      chSelect.appendChild(opt);
    });
    chSelect.value = 0; // first chapter
  }

  renderChapter();

  // Sync to Gist
  syncProgressToGist().catch(err => console.log("Gist sync skipped:", err.message));
}

/* ─── Chapter Renderer ──────────────────────────────────────────────────── */

function renderChapter() {
  const book = state.books[state.currentBookIndex];
  const ch = book.chapters[state.currentChapterIndex];
  const content = document.getElementById("reader-content");
  if (!content) return;
  const startLine = Number.isInteger(ch.startLine) ? ch.startLine : 1;
  const translationTracks = [
    { language: "EN", lines: ch.translationEn },
    { language: "NL", lines: ch.translationNl },
  ];

  if (ch.translation) {
    translationTracks.push({
      language: ch.translationLanguage || "NL",
      lines: ch.translation,
    });
  }

  const usableTranslationTracks = translationTracks.filter((track) =>
    ch.lines.some((line, lineIdx) => {
      const translation = track.lines?.[lineIdx];
      return translation && translation.trim() !== line.trim();
    })
  );

  content.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.id = "chunks-inner";
  content.appendChild(wrapper);

  // Title row
  const titleRow = document.createElement("div");
  titleRow.className = "chapter-row-title";
  titleRow.innerHTML = `
    <h2 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 24px;">${ch.title || "Tekst"}</h2>
  `;
  wrapper.appendChild(titleRow);

  if (ch.translationCredit) {
    const credit = document.createElement("p");
    credit.className = "translation-credit";
    credit.append(`${ch.translationCreditLanguage || "Vertaling"}: `);

    if (ch.translationUrl) {
      const link = document.createElement("a");
      link.href = ch.translationUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = ch.translationCredit;
      credit.appendChild(link);
    } else {
      credit.append(ch.translationCredit);
    }

    wrapper.appendChild(credit);
  }

  if (!usableTranslationTracks.length) {
    const notice = document.createElement("p");
    notice.className = "translation-notice";
    notice.textContent = "Vertaling nog niet beschikbaar.";
    wrapper.appendChild(notice);
  }

  // Render parallel lines
  ch.lines.forEach((line, lineIdx) => {
    const row = document.createElement("div");
    row.className = "chunk-row";

    const lineNumber = document.createElement("span");
    lineNumber.className = "line-number";
    lineNumber.textContent = startLine + lineIdx;
    lineNumber.setAttribute("aria-hidden", "true");
    row.appendChild(lineNumber);

    // Original line with interactive word wrapping
    const origEl = document.createElement("div");
    origEl.className = "original-line";
    origEl.innerHTML = renderInteractiveLine(line, book.lang);
    row.appendChild(origEl);

    // Translation lines
    usableTranslationTracks.forEach((track) => {
      const transEl = document.createElement("div");
      transEl.className = `translation-line translation-${track.language.toLowerCase()}`;

      const label = document.createElement("span");
      label.className = "translation-language";
      label.textContent = track.language;
      transEl.appendChild(label);
      transEl.append(track.lines?.[lineIdx] || "");

      row.appendChild(transEl);
    });

    wrapper.appendChild(row);
  });

  // Recalc page dimensions
  setTimeout(recalcPages, 50);
}

/* ─── Page Navigation ──────────────────────────────────────────────────────── */

function recalcPages() {
  const pane = document.querySelector(".reader-pane");
  const content = document.querySelector(".reader-content");
  if (!pane || !content || pane.clientHeight === 0) return;

  state.totalPages = Math.max(1, Math.ceil(content.scrollHeight / pane.clientHeight));
  if (state.currentPageIndex >= state.totalPages) {
    state.currentPageIndex = state.totalPages - 1;
  }

  translatePane();
}

function prevPage() {
  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    translatePane();
    syncProgressToGist().catch(err => console.log("Gist sync skipped:", err.message));
  }
}

function nextPage() {
  if (state.currentPageIndex < state.totalPages - 1) {
    state.currentPageIndex++;
    translatePane();
    syncProgressToGist().catch(err => console.log("Gist sync skipped:", err.message));
  }
}

function translatePane() {
  const pane = document.querySelector(".reader-pane");
  if (!pane) return;

  pane.scrollTo({
    top: state.currentPageIndex * pane.clientHeight,
    behavior: "smooth"
  });

  const indicator = document.getElementById("page-indicator");
  if (indicator) {
    indicator.textContent = `${state.currentPageIndex + 1} / ${state.totalPages}`;
  }
}

function syncPageFromScroll() {
  const pane = document.querySelector(".reader-pane");
  if (!pane || pane.clientHeight === 0) return;

  const pageIndex = Math.min(
    state.totalPages - 1,
    Math.max(0, Math.round(pane.scrollTop / pane.clientHeight))
  );

  if (pageIndex === state.currentPageIndex) return;
  state.currentPageIndex = pageIndex;

  const indicator = document.getElementById("page-indicator");
  if (indicator) {
    indicator.textContent = `${state.currentPageIndex + 1} / ${state.totalPages}`;
  }

  clearTimeout(scrollSyncTimer);
  scrollSyncTimer = setTimeout(() => {
    syncProgressToGist().catch(err => console.log("Gist sync skipped:", err.message));
  }, 500);
}

/* ─── Word Lookup Helpers ───────────────────────────────────────────────── */

function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}

function normaliseLookupKey(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/^\W+|\W+$/gu, "");
}

function getDictionaryEntry(rawWord, lang) {
  const original = String(rawWord || "").toLowerCase().replace(/^\W+|\W+$/gu, "");
  const normalised = normaliseLookupKey(rawWord);
  const dict = lang === "greek" ? GREEK_DICT : LATIN_DICT;
  return dict[original] || dict[normalised] || null;
}

function splitIntoWordAndPunctuation(token) {
  const match = String(token).match(/^(\P{L}*)([\p{L}\p{M}]+(?:['\u2019][\p{L}\p{M}]+)?)(\P{L}*)$/u);
  if (!match) {
    return { before: "", word: String(token), after: "" };
  }
  return { before: match[1], word: match[2], after: match[3] };
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInteractiveLine(line, lang) {
  return String(line).split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return part;
    const { before, word, after } = splitIntoWordAndPunctuation(part);
    const entry = getDictionaryEntry(word, lang);
    const safeWord = htmlEscape(word);
    if (!entry) return `${before}${safeWord}${after}`;
    const safeDef = htmlEscape(entry.def);
    const safeGrammar = htmlEscape(entry.grammar);
    return `${before}<span class="dict-word" data-word="${safeWord}" data-def="${safeDef}" data-grammar="${safeGrammar}">${safeWord}</span>${after}`;
  }).join("");
}

/* ─── Word Hover & Tooltip ───────────────────────────────────────────────── */

function setupWordHover() {
  const activateWord = (wordSpan) => {
    document.querySelectorAll(".dict-word.selected-word").forEach((selected) => {
      if (selected !== wordSpan) selected.classList.remove("selected-word");
    });
    wordSpan.classList.add("selected-word");

    const rawWord = wordSpan.getAttribute("data-word");
    const def = wordSpan.getAttribute("data-def");
    const grammar = wordSpan.getAttribute("data-grammar");
    showTooltip(
      wordSpan,
      rawWord,
      def || "Vertaling niet gevonden",
      grammar || "Grammatica onbekend"
    );
  };

  document.addEventListener("mouseover", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (!wordSpan) return;
    activateWord(wordSpan);
  });

  document.addEventListener("mouseout", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (!wordSpan) return;
    wordSpan.classList.remove("selected-word");
    hideTooltip();
  });

  document.addEventListener("click", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (wordSpan) {
      activateWord(wordSpan);
      return;
    }

    document.querySelectorAll(".dict-word.selected-word").forEach((selected) => {
      selected.classList.remove("selected-word");
    });
    hideTooltip();
  });
}

function showTooltip(anchorEl, word, definition, grammar) {
  const tooltip = document.getElementById("word-tooltip");
  const content = document.getElementById("tooltip-content");
  if (!tooltip || !content) return;

  content.innerHTML = `
    <div class="tooltip-header">
      <h4>${word}</h4>
    </div>
    <div class="tooltip-grammar">${grammar}</div>
    <div class="tooltip-definition">${definition}</div>
  `;

  tooltip.classList.remove("hidden");

  // Position
  const rect = anchorEl.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - tooltipRect.height - 10;

  if (top < 10) {
    top = rect.bottom + 10;
  }

  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  const tooltip = document.getElementById("word-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}

/* ─── Gist Sync ──────────────────────────────────────────────────────────── */

async function githubFetch(url, options = {}) {
  const pat = localStorage.getItem("slovo_github_pat");
  const calciferPat = localStorage.getItem("calcifer_github_pat");
  const effectivePat = pat || calciferPat;
  if (!effectivePat) return null;

  const headers = {
    "Authorization": `token ${effectivePat}`,
    "Accept": "application/vnd.github.v3+json",
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

async function syncProgressToGist() {
  const gistId = localStorage.getItem("slovo_gist_id");
  if (!gistId) return;

  let progressData = {};
  try {
    const res = await githubFetch(`https://api.github.com/gists/${gistId}`);
    if (res && res.ok) {
      const gist = await res.json();
      if (gist.files && gist.files[GIST_FILE]) {
        progressData = JSON.parse(gist.files[GIST_FILE].content);
      }
    }
  } catch (e) {
    console.warn("Could not read Gist contents:", e);
  }

  // Update classics progress
  progressData.classics = {
    currentBookIndex: state.currentBookIndex,
    currentChapterIndex: state.currentChapterIndex,
    currentPageIndex: state.currentPageIndex,
    lastUpdated: new Date().toISOString(),
    books: state.books.map((book, idx) => ({
      title: book.title,
      chaptersRead: idx === state.currentBookIndex ? state.currentChapterIndex : (book.chaptersRead || 0),
      chapters: book.chapters.length
    }))
  };

  try {
    const res = await githubFetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Slovo / Classics Reader reading progress",
        files: { [GIST_FILE]: { content: JSON.stringify(progressData, null, 2) } }
      })
    });
    if (res && !res.ok) {
      const errText = await res.text();
      console.warn(`Gist upload failed (${res.status}): ${errText}`);
    }
  } catch (e) {
    console.error("Gist sync failed:", e);
  }
}

async function loadProgressFromGist() {
  let gistId = localStorage.getItem("slovo_gist_id");
  let progressData = null;

  try {
    if (gistId) {
      const res = await githubFetch(`https://api.github.com/gists/${gistId}`);
      if (res && res.ok) {
        const gist = await res.json();
        if (gist.files && gist.files[GIST_FILE]) {
          progressData = JSON.parse(gist.files[GIST_FILE].content);
        }
      }
    } else {
      const res = await githubFetch("https://api.github.com/gists");
      if (res && res.ok) {
        const gists = await res.json();
        const found = gists.find(g => g.files && g.files[GIST_FILE]);
        if (found) {
          localStorage.setItem("slovo_gist_id", found.id);
          progressData = JSON.parse(found.files[GIST_FILE].content);
        }
      }
    }
  } catch (e) {
    console.error("Failed to load progress from Gist:", e);
  }

  if (progressData && progressData.classics) {
    const cl = progressData.classics;
    if (cl.currentBookIndex !== undefined) {
      state.currentBookIndex = cl.currentBookIndex;
      state.currentChapterIndex = cl.currentChapterIndex || 0;
      state.currentPageIndex = cl.currentPageIndex || 0;

      // Restore progress to storage (per-book chaptersRead)
      if (cl.books) {
        cl.books.forEach((gistBook, idx) => {
          if (idx < state.books.length) {
            state.books[idx].chaptersRead = gistBook.chaptersRead || 0;
          }
        });
      }

      // Persist restored chaptersRead to localStorage
      state.books.forEach((book, idx) => {
        localStorage.setItem("book_" + idx + "_progress", book.chaptersRead || 0);
      });

      // Navigate to the restored book
      selectBook(cl.currentBookIndex);

      // Restore page after render
      setTimeout(() => {
        state.currentPageIndex = cl.currentPageIndex || 0;
        translatePane();
      }, 200);
    }
  }
}
