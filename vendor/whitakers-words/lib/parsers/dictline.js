import { FixedReader } from "./parse-utils.js";
import { parsePofs } from "./pofs-map.js";
// ---------------------------------------------------------------------------
// Column layout (derived from Ada Default_Width constants)
//
// 4 stems × (18 + 1 space) = 76 chars  (cols 0..75)
// Part_Entry: 23 chars                  (cols 76..98)
//   POS: 6 chars, space, POS-specific: up to 16 chars (Numeral is largest)
// Space separator                       (col 99)
// Translation: 9 chars                  (cols 100..108)
//   Age(1) Space Area(1) Space Geo(1) Space Freq(1) Space Source(1)
// Space separator                       (col 109)
// Meaning: up to 80 chars              (cols 110..189)
// ---------------------------------------------------------------------------
const STEM_WIDTH = 18;
const STEMS_TOTAL = 4 * (STEM_WIDTH + 1); // 76
const POS_WIDTH = 6;
const PART_ENTRY_WIDTH = 23;
function parsePartEntry(s) {
    const pofs = parsePofs(s.slice(0, POS_WIDTH));
    const r = new FixedReader(s.slice(POS_WIDTH + 1));
    switch (pofs) {
        case "N": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const gender = r.field(1);
            r.skip();
            const kind = r.field(1);
            return {
                pofs: "N",
                n: {
                    decl: { which: +which, var: +variant },
                    gender,
                    kind,
                },
            };
        }
        case "PRON": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const kind = r.rest();
            return {
                pofs: "PRON",
                pron: {
                    decl: { which: +which, var: +variant },
                    kind,
                },
            };
        }
        case "PACK": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const kind = r.rest();
            return {
                pofs: "PACK",
                pack: {
                    decl: { which: +which, var: +variant },
                    kind,
                },
            };
        }
        case "ADJ": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const co = r.rest();
            return {
                pofs: "ADJ",
                adj: {
                    decl: { which: +which, var: +variant },
                    co,
                },
            };
        }
        case "ADV": {
            const co = r.rest();
            return { pofs: "ADV", adv: { co } };
        }
        case "V": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const kind = r.rest();
            return {
                pofs: "V",
                v: { con: { which: +which, var: +variant }, kind },
            };
        }
        case "NUM": {
            const which = r.field(1);
            r.skip();
            const variant = r.field(1);
            r.skip();
            const sort = r.field(6);
            r.skip();
            const value = Number.parseInt(r.rest(), 10);
            return {
                pofs: "NUM",
                num: {
                    decl: { which: +which, var: +variant },
                    sort,
                    value: Number.isNaN(value) ? 0 : value,
                },
            };
        }
        case "PREP": {
            const obj = r.rest();
            return { pofs: "PREP", prep: { obj } };
        }
        case "CONJ":
            return { pofs: "CONJ" };
        case "INTERJ":
            return { pofs: "INTERJ" };
        case "VPAR":
            return { pofs: "VPAR" };
        case "SUPINE":
            return { pofs: "SUPINE" };
        case "TACKON":
            return { pofs: "TACKON" };
        case "PREFIX":
            return { pofs: "PREFIX" };
        case "SUFFIX":
            return { pofs: "SUFFIX" };
        case "X":
            return { pofs: "X" };
    }
}
function parseTranslation(r) {
    // "A A A A A" — 5 single-char fields separated by spaces = 9 chars
    const age = r.field(1);
    r.skip();
    const area = r.field(1);
    r.skip();
    const geo = r.field(1);
    r.skip();
    const freq = r.field(1);
    r.skip();
    const source = r.field(1);
    return { age, area, geo, freq, source };
}
export function parseDictLine(line) {
    const r = new FixedReader(line);
    // 4 stems × (18 chars + 1 space separator)
    const s0 = r.field(STEM_WIDTH);
    r.skip();
    const s1 = r.field(STEM_WIDTH);
    r.skip();
    const s2 = r.field(STEM_WIDTH);
    r.skip();
    const s3 = r.field(STEM_WIDTH);
    r.skip();
    const stems = [s0, s1, s2, s3];
    const part = parsePartEntry(line.slice(r.offset, r.offset + PART_ENTRY_WIDTH));
    r.skip(PART_ENTRY_WIDTH + 1); // part + space
    const tran = parseTranslation(r);
    r.skip(); // space
    const mean = r.rest();
    return { stems: stems, part, tran, mean };
}
export function parseDictFile(content) {
    const lines = content.split("\n");
    const entries = [];
    for (const line of lines) {
        if (line.length < STEMS_TOTAL + POS_WIDTH)
            continue;
        entries.push(parseDictLine(line));
    }
    return entries;
}
