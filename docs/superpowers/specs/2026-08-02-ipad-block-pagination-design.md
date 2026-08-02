# iPad Block Pagination Design

## Purpose

Add an optional Kindle-style reading mode for iPad-sized touchscreens while
preserving the existing continuous vertical reader. Paged mode should feel
natural under touch and must keep each source line together with its parallel
translations.

## Device and preference behaviour

A tablet-touch device is detected by capability and viewport rather than by
user-agent: an available coarse pointer and a viewport from 768 through 1366
CSS pixels wide. On such devices, the first-use default is `paged`. Desktop
and phone layouts default to `continuous`.

The reader header exposes a `Paged / Continuous` control only on qualifying
tablet-touch layouts. The choice is stored in local storage on that device; it
is deliberately excluded from Gist sync so an iPad preference cannot change a
desktop reader.

If the viewport ceases to qualify—for example, during browser emulation—the
reader uses continuous layout without erasing the saved tablet preference.

## Page composition

The chapter renderer continues to build its semantic content as it does now.
In paged mode, a dedicated paginator then groups the rendered top-level blocks
into `.reader-page` containers sized to the available reader viewport.

The paginator treats these as indivisible blocks:

- chapter title and source credit;
- any translation notice;
- each `.chunk-row`, including source text, syntax spans, and every parallel
  translation;
- the chapter-completion footer.

It appends blocks to the current page until the next block would exceed the
usable height, then starts a new page. A single block taller than one page is
placed alone and allowed to scroll internally rather than being clipped or
discarded. The original reading order and interactive word elements are
preserved by moving the existing DOM nodes, not recreating their contents.

Page 1 begins with a chapter banner containing the work title, chapter title,
and `chapter N of M`. This banner supplies a clear transition when advancing
automatically from the preceding chapter without adding an empty title page.

Continuous mode retains the present single-column DOM and vertical scrolling.
Switching modes restores the same source-line anchor.

## Navigation

In paged mode, a pointer-up on the reader pane advances when it lands in the
rightmost 28% and goes back in the leftmost 28%. The centre 44% has no page-turn
action. Page-turn handling ignores events whose target is or is inside an
interactive element, including dictionary words, links, buttons, selects,
tooltips, and vocabulary controls; word lookup therefore takes priority even
inside a side zone.

The existing Previous/Next controls remain and operate on the same page state.
Keyboard Left/Right arrows use that same navigation path when focus is not
inside a form control.

Advancing from the last page automatically opens the next chapter and shows
its banner on page 1. Going back from page 1 opens the preceding chapter at its
last page. At the beginning of the first chapter, Back does nothing. At the end
of the final chapter, the existing completion footer remains visible and no
automatic wrap occurs.

Continuous mode retains its current scrolling behaviour and controls.

## Position and reflow

Reading position is represented semantically as the current book ID, chapter
index, and source-line anchor. The numeric page index remains a derived value.
Before a mode switch or repagination, the reader records the first source line
on the current page; after composition, it selects the page containing that
line.

Pagination runs after document fonts are ready and after chapter rendering.
A debounced resize/orientation handler recomposes pages. If no source row has
yet appeared, the chapter heading is the fallback anchor. Existing stable book
and chapter progress fields remain compatible.

## Failure handling

If the available page height cannot be measured, or page composition throws,
the reader falls back to continuous mode for the current render and logs a
concise diagnostic. It does not overwrite the user's saved preference.

Repeated repagination first unwraps existing `.reader-page` containers to
recover one canonical sequence of content blocks, preventing nested pages or
duplicated content.

## Accessibility

Touch zones are an enhancement on the reader pane, not invisible overlay
elements, so they cannot cover dictionary words or controls. Existing visible
Previous/Next buttons remain available. The mode control has a programmatic
label and exposed pressed/selected state. Reduced-motion preferences disable
animated page transitions.

## Testing and verification

Automated tests will cover:

- tablet-touch qualification and device-local default selection;
- persisted mode selection without Gist propagation;
- block packing, including an oversized block and stable DOM order;
- preservation of source-line anchors across reflow and mode switches;
- left/right zone thresholds and exclusion of interactive targets;
- cross-chapter forward and backward navigation boundaries;
- automatic next-chapter transition and final-chapter stopping behaviour;
- safe fallback when usable page height is unavailable;
- cache-version updates for changed static assets;
- the existing catalogue, progress, and syntax regression suites.

Manual iPad-sized browser verification will cover portrait and landscape,
rotation while mid-chapter, word lookup in both side zones, theme switching,
chapter transitions, completion controls, and switching repeatedly between
paged and continuous layouts without losing position.
