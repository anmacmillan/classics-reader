/* ─── App ──────────────────────────────────────────────────────────────── */

const state = {
  books: [],
  currentBookIndex: 0,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  totalPages: 1,
  libraryAuthor: null,
};

const GIST_FILE = "slovo_progress.json";
let scrollSyncTimer;
let focusHeaderTimer;
let tooltipHideTimer;
let activeVocabularyCandidate;
let oldEnglishLookupCache = {};
try {
  oldEnglishLookupCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.OLD_ENGLISH_CACHE) || "{}") || {};
} catch {
  oldEnglishLookupCache = {};
}

const STORAGE_KEYS = {
  PROGRESS: "classics_book_progress",
  GIST_ID: "slovo_gist_id",
  GIST_FILE: "slovo_progress.json",
  VOCABULARY: "classics_personal_vocabulary",
  THEME: "classics_theme",
  OLD_ENGLISH_CACHE: "classics_old_english_toe_cache"
};

document.addEventListener("DOMContentLoaded", async () => {
  state.books = BOOKS.map((book) => ({
    ...book,
    chapters: book.chapters.filter((chapter) => !chapter.isPreview),
  }));
  loadProgressFromStorage();
  loadVocabularyFromStorage();
  setupTheme();
  renderLibrary();
  setupFocusHeader();
  setupVocabulary();

  // Back button
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (document.getElementById("app-workspace").hasAttribute("hidden") && state.libraryAuthor) {
        state.libraryAuthor = null;
        renderLibrary();
      } else {
        showLibrary(state.books[state.currentBookIndex]?.author);
      }
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

/* ─── Theme ─────────────────────────────────────────────────────────────── */

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getThemeSetting() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
}

function applyTheme(setting) {
  const theme = setting === "auto" ? systemTheme() : setting;
  document.documentElement.setAttribute("data-theme", theme);
  const button = document.getElementById("theme-btn");
  if (button) {
    button.textContent = setting === "auto"
      ? `Auto · ${theme === "light" ? "Light" : "Dark"}`
      : setting.charAt(0).toUpperCase() + setting.slice(1);
  }
}

function setupTheme() {
  applyTheme(getThemeSetting());

  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  media?.addEventListener?.("change", () => {
    if (getThemeSetting() === "auto") applyTheme("auto");
  });

  document.getElementById("theme-btn")?.addEventListener("click", () => {
    const next = ({ dark: "light", light: "auto", auto: "dark" })[getThemeSetting()] || "dark";
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    applyTheme(next);
  });
}

/* ─── Context Header / Focus Mode ───────────────────────────────────────── */

function updateHeaderContext() {
  const primary = document.getElementById("header-primary");
  const secondary = document.getElementById("header-secondary");
  if (!primary || !secondary) return;

  if (!document.body.classList.contains("reader-mode")) {
    primary.textContent = state.libraryAuthor || "Library";
    secondary.textContent = state.libraryAuthor ? authorSummary(state.libraryAuthor) : "Latin · Greek";
    return;
  }

  const book = state.books[state.currentBookIndex];
  const chapter = book?.chapters[state.currentChapterIndex];
  primary.textContent = `${book.author} · ${workDisplayTitle(book)}`;
  secondary.textContent = chapter?.title || `Section ${state.currentChapterIndex + 1}`;
}

function showFocusHeader(scheduleFade = true) {
  const header = document.querySelector(".app-header");
  if (!header) return;
  header.classList.remove("focus-hidden");
  clearTimeout(focusHeaderTimer);
  if (scheduleFade && document.body.classList.contains("reader-mode")) {
    focusHeaderTimer = setTimeout(() => header.classList.add("focus-hidden"), 5000);
  }
}

function setupFocusHeader() {
  const reveal = () => showFocusHeader();
  document.addEventListener("pointermove", reveal, { passive: true });
  document.addEventListener("touchstart", reveal, { passive: true });
  document.addEventListener("keydown", reveal);
  document.querySelector(".reader-pane")?.addEventListener("scroll", reveal, { passive: true });
  document.querySelector(".app-header")?.addEventListener("mouseenter", () => {
    clearTimeout(focusHeaderTimer);
  });
  document.querySelector(".app-header")?.addEventListener("mouseleave", reveal);
}

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

function showLibrary(author = null) {
  state.libraryAuthor = author;
  const splash = document.getElementById("splash-screen");
  const workspace = document.getElementById("app-workspace");
  if (splash) splash.removeAttribute("hidden");
  if (workspace) workspace.setAttribute("hidden", "");
  document.body.classList.remove("reader-mode");
  showFocusHeader(false);

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

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.style.display = state.libraryAuthor ? "block" : "none";
    backBtn.textContent = "← Authors";
  }
  updateHeaderContext();

  if (!state.libraryAuthor) {
    renderAuthorLibrary(grid);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "catalogue-heading";
  heading.innerHTML = `<h1>${state.libraryAuthor}</h1><p>${authorSummary(state.libraryAuthor)}</p>`;
  grid.appendChild(heading);

  state.books.forEach((book, idx) => {
    if (book.author !== state.libraryAuthor) return;
    const card = document.createElement("div");
    card.className = "book-card";

    const totalCh = book.chapters.length;
    const completedCh = book.chaptersRead || 0;
    const pct = Math.round((completedCh / totalCh) * 100);

    const langIcon = book.lang === "latin" ? "\u{1F4DC}" : book.lang === "greek" ? "\u{1F525}" : "\u{1F4D6}";
    const langLabel = book.lang === "latin" ? "Latijn" : book.lang === "greek" ? "Grieks" : "Oudengels";

    const displayTitle = workDisplayTitle(book);
    const shortTitle = book.shortTitle ? `<p class="book-short-title">${book.shortTitle}</p>` : "";

    card.innerHTML = `
      <div class="book-icon">${langIcon}</div>
      <h3>${displayTitle}</h3>
      ${shortTitle}
      <div class="book-meta">
        <span>${book.year < 0 ? Math.abs(book.year) + " v.Chr." : book.year}</span>
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

function renderAuthorLibrary(grid) {
  const authors = [...new Set(state.books.map((book) => book.author))];
  authors.forEach((author) => {
    const works = state.books.filter((book) => book.author === author);
    const card = document.createElement("div");
    card.className = "book-card author-card";
    const languages = [...new Set(works.map((book) => book.lang === "latin" ? "Latijn" : book.lang === "greek" ? "Grieks" : "Oudengels"))];
    const sections = works.reduce((total, book) => total + book.chapters.length, 0);

    card.innerHTML = `
      <div class="book-icon">${works[0].lang === "latin" ? "\u{1F4DC}" : works[0].lang === "greek" ? "\u{1F525}" : "\u{1F4D6}"}</div>
      <h3>${author}</h3>
      <p class="author-work-count">${works.length} ${works.length === 1 ? "text" : "texts"}</p>
      <div class="book-meta"><span>${languages.join(" · ")}</span><span>· ${sections} sections</span></div>
    `;
    card.addEventListener("click", () => {
      state.libraryAuthor = author;
      renderLibrary();
    });
    grid.appendChild(card);
  });
}

function workDisplayTitle(book) {
  const separators = [" — ", " - "];
  for (const separator of separators) {
    if (book.title.includes(separator)) return book.title.split(separator).slice(1).join(separator);
  }
  return book.title;
}

function authorSummary(author) {
  const works = state.books.filter((book) => book.author === author);
  const languages = [...new Set(works.map((book) => book.lang === "latin" ? "Latin" : book.lang === "greek" ? "Greek" : "Old English"))];
  return `${works.length} ${works.length === 1 ? "text" : "texts"} · ${languages.join(" · ")}`;
}

function selectBook(idx, chapterIndex) {
  const book = state.books[idx];
  const defaultChapterIndex = Number.isInteger(book.defaultChapterIndex)
    ? book.defaultChapterIndex
    : Math.max(0, book.chapters.length - 1);

  state.currentBookIndex = idx;
  state.currentChapterIndex = Number.isInteger(chapterIndex) && book.chapters[chapterIndex]
    ? chapterIndex
    : defaultChapterIndex;
  state.currentPageIndex = 0;

  const splash = document.getElementById("splash-screen");
  const workspace = document.getElementById("app-workspace");
  if (splash) splash.setAttribute("hidden", "");
  if (workspace) workspace.removeAttribute("hidden");
  document.body.classList.add("reader-mode");

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.style.display = "block";
    backBtn.textContent = `← ${book.author}`;
  }

  // Populate chapter selector
  const chSelect = document.getElementById("chapter-select");
  if (chSelect) {
    chSelect.innerHTML = "";
    book.chapters.forEach((ch, ci) => {
      const opt = document.createElement("option");
      opt.value = ci;
      opt.textContent = ch.title || `Hoofdstuk ${ci + 1}`;
      chSelect.appendChild(opt);
    });
    chSelect.value = state.currentChapterIndex;
  }

  renderChapter();
  updateHeaderContext();
  showFocusHeader();

  // Sync to Gist
  syncProgressToGist().catch(err => console.log("Gist sync skipped:", err.message));
}

/* ─── Chapter Renderer ──────────────────────────────────────────────────── */

function renderChapter() {
  const book = state.books[state.currentBookIndex];
  const ch = book.chapters[state.currentChapterIndex];
  const content = document.getElementById("reader-content");
  if (!content) return;
  updateHeaderContext();
  showFocusHeader();
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
    const currentLineNumber = startLine + lineIdx;
    const speaker = ch.speakers?.find(({ start, end }) =>
      currentLineNumber >= start && currentLineNumber <= end
    );
    const previousSpeaker = ch.speakers?.find(({ start, end }) =>
      currentLineNumber - 1 >= start && currentLineNumber - 1 <= end
    );

    if (speaker && speaker.name !== previousSpeaker?.name) {
      const speakerLabel = document.createElement("div");
      speakerLabel.className = "speaker-label";
      speakerLabel.textContent = speaker.name;
      row.appendChild(speakerLabel);
    }

    const lineNumber = document.createElement("span");
    lineNumber.className = "line-number";
    lineNumber.textContent = currentLineNumber;
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
    .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "");
}

function getDictionaryEntry(rawWord, lang) {
  const original = String(rawWord || "")
    .toLowerCase()
    .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "");
  const normalised = normaliseLookupKey(rawWord);
  if (lang !== "greek" && lang !== "latin" && lang !== "old_english") return null;
  const dict = lang === "greek"
    ? GREEK_DICT
    : lang === "latin"
      ? LATIN_DICT
      : OLD_ENGLISH_DICT;
  return dict[original] || dict[normalised] || null;
}

function saveOldEnglishLookupCache() {
  localStorage.setItem(STORAGE_KEYS.OLD_ENGLISH_CACHE, JSON.stringify(oldEnglishLookupCache));
}

async function lookupOldEnglishTOE(rawWord) {
  const key = normaliseLookupKey(rawWord);
  if (!key) return null;
  if (oldEnglishLookupCache[key]) return oldEnglishLookupCache[key];

  const url = `https://oldenglishthesaurus.arts.gla.ac.uk/category-selection?word=${encodeURIComponent(rawWord)}`;
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/<h4 class="catList">Word results:<\/h4>([\s\S]*?)<div id="jump">/i) ||
                html.match(/<h4 class="catList">Word results:<\/h4>([\s\S]*?)<div id="footer">/i);
  if (!match) return null;
  const block = match[1];
  const item = block.match(/<p class="cat(?:Odd|Even)">[\s\S]*?<span class="small">([^<]+)<\/span>[\s\S]*?<b>([^<]+)<\/b>/i);
  if (!item) return null;
  const category = item[1].replace(/\s+/g, " ").trim();
  const label = item[2].replace(/\s+/g, " ").trim();
  const entry = {
    lemma: rawWord,
    def: `${category}: ${label}`,
    grammar: "TOE",
  };
  oldEnglishLookupCache[key] = entry;
  saveOldEnglishLookupCache();
  return entry;
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
    const safeLemma = htmlEscape(entry.lemma || entry.def);
    const safeEn = htmlEscape(entry.en || entry.def);
    const safeNl = htmlEscape(entry.nl || "");
    const safeGrammar = htmlEscape(entry.grammar);
    return `${before}<span class="dict-word" data-word="${safeWord}" data-lang="${lang}" data-lemma="${safeLemma}" data-en="${safeEn}" data-nl="${safeNl}" data-grammar="${safeGrammar}">${safeWord}</span>${after}`;
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
    const lemma = wordSpan.getAttribute("data-lemma");
    const en = wordSpan.getAttribute("data-en");
    const nl = wordSpan.getAttribute("data-nl");
    const grammar = wordSpan.getAttribute("data-grammar");
    const lang = wordSpan.getAttribute("data-lang");
    activeVocabularyCandidate = vocabularyEntryFor(rawWord, lemma || rawWord, en, nl, grammar, lang);
    showTooltip(
      wordSpan,
      rawWord,
      lemma || rawWord,
      en,
      nl,
      grammar || "Grammatica onbekend",
      activeVocabularyCandidate
    );

    if (!en && lang === "old_english") {
      lookupOldEnglishTOE(rawWord).then((entry) => {
        if (!entry) return;
        if (wordSpan.getAttribute("data-word") !== rawWord) return;
        wordSpan.setAttribute("data-lemma", entry.lemma || rawWord);
        wordSpan.setAttribute("data-en", entry.def || "");
        wordSpan.setAttribute("data-grammar", entry.grammar || "TOE");
        if (wordSpan.classList.contains("selected-word")) {
          activeVocabularyCandidate = vocabularyEntryFor(
            rawWord,
            entry.lemma || rawWord,
            entry.def || "",
            "",
            entry.grammar || "TOE",
            lang
          );
          showTooltip(
            wordSpan,
            rawWord,
            entry.lemma || rawWord,
            entry.def || "",
            "",
            entry.grammar || "TOE",
            activeVocabularyCandidate
          );
        }
      }).catch(() => {});
    }
  };

  document.addEventListener("mouseover", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (!wordSpan) return;
    activateWord(wordSpan);
  });

  document.addEventListener("mouseout", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (!wordSpan) return;
    if (e.relatedTarget?.closest?.("#word-tooltip")) return;
    wordSpan.classList.remove("selected-word");
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(hideTooltip, 180);
  });

  document.addEventListener("click", (e) => {
    const wordSpan = e.target.closest(".dict-word");
    if (wordSpan) {
      activateWord(wordSpan);
      return;
    }
    if (e.target.closest("#word-tooltip")) return;

    document.querySelectorAll(".dict-word.selected-word").forEach((selected) => {
      selected.classList.remove("selected-word");
    });
    hideTooltip();
  });

  document.getElementById("word-tooltip")?.addEventListener("mouseenter", () => clearTimeout(tooltipHideTimer));
  document.getElementById("word-tooltip")?.addEventListener("mouseleave", hideTooltip);
}

function showTooltip(anchorEl, word, lemma, en, nl, grammar, vocabularyEntry) {
  const tooltip = document.getElementById("word-tooltip");
  const content = document.getElementById("tooltip-content");
  if (!tooltip || !content) return;
  const saved = isVocabularyEntrySaved(vocabularyEntry);

  content.innerHTML = `
    <div class="tooltip-header">
      <h4>${word}</h4>
    </div>
    <div class="tooltip-lemma">${lemma}</div>
    <div class="tooltip-grammar">${grammar}</div>
    <div class="tooltip-definition">
      <div><strong>EN</strong> ${en || "Translation not found"}</div>
      <div><strong>NL</strong> ${nl || "Vertaling niet gevonden"}</div>
    </div>
    <div class="tooltip-actions">
      <button class="btn tooltip-save${saved ? " saved" : ""}" type="button">${saved ? "Saved" : "Save word"}</button>
    </div>
  `;
  content.querySelector(".tooltip-save")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleVocabularyEntry(vocabularyEntry);
    showTooltip(anchorEl, word, lemma, en, nl, grammar, vocabularyEntry);
  });

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
  clearTimeout(tooltipHideTimer);
  const tooltip = document.getElementById("word-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}

/* ─── Personal Vocabulary ───────────────────────────────────────────────── */

function loadVocabularyFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOCABULARY) || "[]");
    state.vocabulary = Array.isArray(saved) ? saved : [];
  } catch {
    state.vocabulary = [];
  }
  updateVocabularyUI();
}

function saveVocabularyToStorage() {
  localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(state.vocabulary));
  updateVocabularyUI();
}

function vocabularyEntryFor(word, lemma, en, nl, grammar, lang) {
  const book = state.books[state.currentBookIndex];
  const chapter = book?.chapters[state.currentChapterIndex];
  return {
    id: `${lang}:${normaliseLookupKey(lemma)}`,
    word,
    lemma,
    en: en || "",
    nl: nl || "",
    grammar: grammar || "",
    lang,
    author: book?.author || "",
    work: book ? workDisplayTitle(book) : "",
    chapter: chapter?.title || "",
    addedAt: new Date().toISOString()
  };
}

function isVocabularyEntrySaved(entry) {
  return Boolean(entry && state.vocabulary?.some((saved) => saved.id === entry.id));
}

function toggleVocabularyEntry(entry) {
  if (!entry) return;
  const existingIndex = state.vocabulary.findIndex((saved) => saved.id === entry.id);
  if (existingIndex >= 0) {
    state.vocabulary.splice(existingIndex, 1);
  } else {
    state.vocabulary.unshift(entry);
  }
  saveVocabularyToStorage();
  syncProgressToGist().catch((err) => console.log("Gist sync skipped:", err.message));
}

function updateVocabularyUI() {
  const count = state.vocabulary?.length || 0;
  const countEl = document.getElementById("vocabulary-count");
  const summary = document.getElementById("vocabulary-summary");
  const list = document.getElementById("vocabulary-list");
  if (countEl) countEl.textContent = count;
  if (summary) summary.textContent = `${count} saved word${count === 1 ? "" : "s"}`;
  if (!list) return;

  if (!count) {
    list.innerHTML = '<p class="vocabulary-empty">Select a word in any text and choose “Save word”.</p>';
    return;
  }

  list.innerHTML = state.vocabulary.map((entry) => `
    <article class="vocabulary-entry">
      <h3>${htmlEscape(entry.lemma || entry.word)} <span>${htmlEscape(entry.lang)}</span></h3>
      <p class="vocabulary-meaning">${htmlEscape(entry.en || entry.nl || "No translation")}</p>
      <p class="vocabulary-context">${htmlEscape([entry.author, entry.work, entry.chapter].filter(Boolean).join(" · "))}</p>
      <button class="btn vocabulary-remove" data-vocabulary-id="${htmlEscape(entry.id)}" aria-label="Remove ${htmlEscape(entry.lemma || entry.word)}">×</button>
    </article>
  `).join("");
}

function setVocabularyPanel(open) {
  document.getElementById("vocabulary-panel")?.classList.toggle("hidden", !open);
  document.getElementById("vocabulary-backdrop")?.classList.toggle("hidden", !open);
  if (open) {
    hideTooltip();
    showFocusHeader(false);
  }
}

function setupVocabulary() {
  document.getElementById("vocabulary-btn")?.addEventListener("click", () => setVocabularyPanel(true));
  document.getElementById("vocabulary-close")?.addEventListener("click", () => setVocabularyPanel(false));
  document.getElementById("vocabulary-backdrop")?.addEventListener("click", () => setVocabularyPanel(false));
  document.getElementById("vocabulary-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vocabulary-id]");
    if (!button) return;
    state.vocabulary = state.vocabulary.filter((entry) => entry.id !== button.dataset.vocabularyId);
    saveVocabularyToStorage();
    syncProgressToGist().catch((err) => console.log("Gist sync skipped:", err.message));
  });
  document.getElementById("export-vocabulary-csv")?.addEventListener("click", () => exportVocabulary("csv"));
  document.getElementById("export-vocabulary-json")?.addEventListener("click", () => exportVocabulary("json"));
}

function downloadTextFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportVocabulary(format) {
  const entries = state.vocabulary || [];
  if (format === "json") {
    downloadTextFile("classics-vocabulary.json", JSON.stringify(entries, null, 2), "application/json");
    return;
  }

  const fields = ["word", "lemma", "lang", "grammar", "en", "nl", "author", "work", "chapter", "addedAt"];
  const csvCell = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
  const rows = [fields.map(csvCell), ...entries.map((entry) => fields.map((field) => csvCell(entry[field])))];
  downloadTextFile("classics-vocabulary.csv", rows.map((row) => row.join(",")).join("\n"), "text/csv");
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
    vocabulary: state.vocabulary,
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
    if (Array.isArray(cl.vocabulary)) {
      const localEntries = new Map((state.vocabulary || []).map((entry) => [entry.id, entry]));
      cl.vocabulary.forEach((entry) => localEntries.set(entry.id, entry));
      state.vocabulary = [...localEntries.values()];
      saveVocabularyToStorage();
    }
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

      // Older saved sessions point at the short preview (chapter 0).
      // Open the full chapter by default, while preserving later chapters.
      const savedChapterIndex = cl.currentChapterIndex > 0
        ? cl.currentChapterIndex
        : undefined;
      selectBook(cl.currentBookIndex, savedChapterIndex);

      // Restore page after render
      setTimeout(() => {
        state.currentPageIndex = cl.currentPageIndex || 0;
        translatePane();
      }, 200);
    }
  }
}
