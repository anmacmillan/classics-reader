const ReaderPagination = (() => {
  "use strict";

  const MODE_KEY = "classics_reader_mode_v1";
  const TABLET_TOUCH_QUERY = "(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)";
  const INTERACTIVE_SELECTOR = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[role='button']",
    "[contenteditable]",
    ".dict-word",
    ".reader-word",
    ".word-tooltip",
    ".reader-tooltip",
    ".vocabulary-panel",
    "[data-reader-word]",
    "[data-reader-tooltip]",
    "#word-tooltip",
  ].join(", ");

  function isMode(value) {
    return value === "paged" || value === "continuous";
  }

  function savedMode(storage) {
    try {
      const value = storage && typeof storage.getItem === "function" ? storage.getItem(MODE_KEY) : null;
      return isMode(value) ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function effectiveMode({ tabletTouch, savedMode: preference } = {}) {
    if (!tabletTouch) return "continuous";
    return isMode(preference) ? preference : "paged";
  }

  function persistMode(storage, mode) {
    if (!isMode(mode)) throw new RangeError(`unknown reader mode: ${mode}`);
    try {
      if (!storage || typeof storage.setItem !== "function") return false;
      storage.setItem(MODE_KEY, mode);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function packBlocks(blocks, pageHeight, measure) {
    if (!Array.isArray(blocks)) throw new RangeError("blocks must be an array");
    if (!Number.isFinite(pageHeight) || pageHeight <= 0) throw new RangeError("page height must be positive");
    if (typeof measure !== "function") throw new RangeError("measure must be a function");

    const pages = [];
    let page = [];
    let usedHeight = 0;

    for (const block of blocks) {
      const height = Number(measure(block));
      if (!Number.isFinite(height) || height < 0) {
        throw new RangeError("block height must be non-negative");
      }

      if (page.length > 0 && usedHeight + height > pageHeight) {
        pages.push(page);
        page = [];
        usedHeight = 0;
      }

      page.push(block);
      usedHeight += height;

      if (height > pageHeight) {
        pages.push(page);
        page = [];
        usedHeight = 0;
      }
    }

    if (page.length > 0 || pages.length === 0) pages.push(page);
    return pages;
  }

  function pageIndexForLine(pages, lineIndex) {
    if (!Array.isArray(pages) || !Number.isInteger(lineIndex) || lineIndex < 0) return 0;

    const pageIndex = pages.findIndex((page) => Array.isArray(page) && page.some((block) => (
      Number(block && block.dataset && block.dataset.lineIndex) === lineIndex
    )));
    return pageIndex >= 0 ? pageIndex : 0;
  }

  function pageTurnDirection(clientX, left, width) {
    if (!Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return 0;
    const position = (clientX - left) / width;
    if (position < 0.28) return -1;
    if (position > 0.72) return 1;
    return 0;
  }

  function isInteractiveTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    try {
      return Boolean(target.closest(INTERACTIVE_SELECTOR));
    } catch (_error) {
      return false;
    }
  }

  function navigationDecision({ direction, pageIndex, totalPages, chapterIndex, chapterCount } = {}) {
    if (direction !== -1 && direction !== 1) return { type: "none" };
    if (!Number.isInteger(totalPages) || totalPages <= 0) return { type: "none" };
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= totalPages) return { type: "none" };
    if (!Number.isInteger(chapterCount) || chapterCount <= 0) return { type: "none" };
    if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapterCount) return { type: "none" };

    const targetPage = pageIndex + direction;
    if (targetPage >= 0 && targetPage < totalPages) {
      return { type: "page", pageIndex: targetPage };
    }

    const targetChapter = chapterIndex + direction;
    if (targetChapter < 0 || targetChapter >= chapterCount) return { type: "none" };
    return {
      type: "chapter",
      chapterIndex: targetChapter,
      edge: direction > 0 ? "first" : "last",
    };
  }

  return Object.freeze({
    MODE_KEY,
    TABLET_TOUCH_QUERY,
    savedMode,
    effectiveMode,
    persistMode,
    packBlocks,
    pageIndexForLine,
    pageTurnDirection,
    isInteractiveTarget,
    navigationDecision,
  });
})();

globalThis.ReaderPagination = ReaderPagination;
