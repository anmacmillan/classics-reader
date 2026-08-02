# Koine Collection and Syntax Contrast Design

## Purpose

Make the library hierarchy reflect the shared source of the four canonical
Gospels, and keep automatic syntax highlighting legible in both themes.

## Catalogue hierarchy

Matthew, Mark, Luke, and John will each retain their existing author, title,
date, chapters, and reading progress. Their import manifests will gain the
shared collection label `Koine New Testament`.

The top-level catalogue will group books by collection when that metadata is
present and by author otherwise. It will therefore show one `Koine New
Testament` card for the four Gospels. Opening the card will show four work
cards—one Gospel per author—and opening a Gospel will continue to show its
chapter overview. Navigation labels and summaries will describe the selected
collection without changing the existing author-based experience for other
books.

The grouping will be data-driven rather than keyed to particular Gospel IDs,
so another collection can use the same mechanism later without interface
changes.

## Syntax highlighting

Agreement groups will continue to use deterministic pastel colours, but the
rendered colour will be theme-aware. Dark mode will use low-opacity coloured
washes that preserve the existing pale source text; light mode will retain
light pastel washes suitable for dark text. Syntax role underlines and lookup
behaviour will remain unchanged.

## Data flow

The import script will copy optional collection metadata from each manifest
into `generated/imported-books.js`. Catalogue rendering will derive a stable
group key and display label from each book's collection or author. Selecting a
group filters books by that same key.

Syntax rendering will assign a deterministic palette index instead of an
opaque light colour. CSS variables for that index will provide the appropriate
background in each theme.

## Testing

Automated tests will verify that:

- the four Gospel manifests share the `Koine New Testament` collection;
- generated Gospel records preserve that collection metadata;
- catalogue grouping yields one collection containing all four Gospels while
  ordinary authors remain grouped as before;
- dark-theme syntax colours are translucent/dark-compatible rather than the
  current near-white backgrounds;
- existing project checks continue to pass.

Manual browser verification will check the top-level collection card, the four
Gospel work cards, back navigation, Homer Odyssey I in dark mode, and syntax
highlighting in light mode.
