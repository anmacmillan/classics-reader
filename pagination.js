(function (root) {
  "use strict";

  const TABLET_QUERY = "(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)";
  const MODE_KEY = "classics_reader_mode_v1";
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
  ].join(", ");

  function isMode(value) {
    return value === "paged" || value === "continuous";
  }

  function getPersistedMode(storage) {
    try {
      const value = storage && storage.getItem(MODE_KEY);
      return isMode(value) ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function getEffectiveMode({ persistedMode, tabletCapable } = {}) {
    if (isMode(persistedMode)) return persistedMode;
    return tabletCapable ? "paged" : "continuous";
  }

  function validBlockIndexes(blockHeights) {
    if (!Array.isArray(blockHeights)) return [];
    return blockHeights.reduce((indexes, height, index) => {
      if (Number.isFinite(height) && height >= 0) indexes.push(index);
      return indexes;
    }, []);
  }

  function packBlocks(blockHeights, pageHeight) {
    const indexes = validBlockIndexes(blockHeights);
    if (indexes.length === 0) return [];
    if (!Number.isFinite(pageHeight) || pageHeight <= 0) return [indexes];

    const pages = [];
    let page = [];
    let usedHeight = 0;

    for (const index of indexes) {
      const height = blockHeights[index];

      if (height > pageHeight) {
        if (page.length > 0) pages.push(page);
        pages.push([index]);
        page = [];
        usedHeight = 0;
      } else if (page.length > 0 && usedHeight + height > pageHeight) {
        pages.push(page);
        page = [index];
        usedHeight = height;
      } else {
        page.push(index);
        usedHeight += height;
      }
    }

    if (page.length > 0) pages.push(page);
    return pages;
  }

  function pageForLineIndex(pages, lineIndex) {
    if (!Array.isArray(pages) || !Number.isFinite(lineIndex)) return 0;

    let first = null;
    let last = null;
    let nearestPage = 0;
    let nearestDistance = Infinity;

    pages.forEach((page, pageIndex) => {
      if (!Array.isArray(page)) return;
      page.forEach((value) => {
        if (!Number.isFinite(value)) return;
        if (value === lineIndex) {
          nearestPage = pageIndex;
          nearestDistance = 0;
        }
        if (first === null || value < first) first = value;
        if (last === null || value > last) last = value;
        const distance = Math.abs(value - lineIndex);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = pageIndex;
        }
      });
    });

    if (first === null || last === null) return 0;
    if (lineIndex < first) return 0;
    if (lineIndex > last) return pages.length - 1;
    return nearestPage;
  }

  function tapDirection(clientX, viewportWidth, edgeRatio = 0.28) {
    if (!Number.isFinite(clientX) || !Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0;
    const ratio = Number.isFinite(edgeRatio) ? Math.min(Math.max(edgeRatio, 0), 0.5) : 0.28;
    const position = clientX / viewportWidth;
    if (position < ratio) return -1;
    if (position > 1 - ratio) return 1;
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

  function navigationDecision({ direction, pageIndex, totalPages, chapterIndex, totalChapters } = {}) {
    if (direction !== -1 && direction !== 1) return "none";
    if (!Number.isInteger(pageIndex) || !Number.isInteger(totalPages) || totalPages <= 0) return "none";
    if (!Number.isInteger(chapterIndex) || !Number.isInteger(totalChapters) || totalChapters <= 0) return "none";

    if (direction === -1) {
      if (pageIndex > 0) return "previous-page";
      return chapterIndex > 0 ? "previous-chapter" : "none";
    }

    if (pageIndex < totalPages - 1) return "next-page";
    return chapterIndex < totalChapters - 1 ? "next-chapter" : "none";
  }

  root.ClassicsPagination = {
    TABLET_QUERY,
    MODE_KEY,
    getPersistedMode,
    getEffectiveMode,
    packBlocks,
    pageForLineIndex,
    tapDirection,
    isInteractiveTarget,
    navigationDecision,
  };
})(globalThis);
