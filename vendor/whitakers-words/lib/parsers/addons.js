import { TokenReader } from "./parse-utils.js";
import { parsePofs } from "./pofs-map.js";
// ---------------------------------------------------------------------------
// ADDONS.LAT parser
//
// Format: blocks of 3 lines per entry, interspersed with -- comments.
//   Line 1: TYPE <text> [<connect>]     (TYPE = PREFIX | SUFFIX | TACKON)
//   Line 2: POS-specific entry data
//   Line 3: Meaning
//
// Comments start with --.
// ---------------------------------------------------------------------------
function isComment(line) {
    const trimmed = line.trimStart();
    return trimmed.startsWith("--") || trimmed.length === 0;
}
/** Read non-comment lines from an array, advancing the cursor. */
function nextNonCommentLine(lines, cursor) {
    let i = cursor;
    while (i < lines.length) {
        if (!isComment(lines[i] ?? "")) {
            return [lines[i] ?? "", i + 1];
        }
        i++;
    }
    return null;
}
/** Extract fix text and optional connect character from "PREFIX fix [c]" remainder. */
function extractFix(s) {
    const trimmed = s.trim();
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx < 0) {
        return [trimmed, ""];
    }
    const fix = trimmed.slice(0, spaceIdx);
    const rest = trimmed.slice(spaceIdx).trim();
    return [fix, rest.charAt(0)];
}
/** Tokenize a space-separated line. */
function tokenize(line) {
    return line
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
}
/**
 * Parse a Target_Entry from tokens using a TokenReader.
 * A Target_Entry is a POS-discriminated record, same as PartEntry.
 */
function parseTargetEntry(tokens, offset) {
    const r = new TokenReader(tokens, offset);
    const pofs = parsePofs(r.str());
    switch (pofs) {
        case "N": {
            const decl = r.decn();
            const gender = r.str();
            const kind = r.str();
            return { pofs: "N", n: { decl, gender, kind } };
        }
        case "PRON": {
            const decl = r.decn();
            const kind = r.str();
            return { pofs: "PRON", pron: { decl, kind } };
        }
        case "PACK": {
            const decl = r.decn();
            const kind = r.str();
            return { pofs: "PACK", pack: { decl, kind } };
        }
        case "ADJ": {
            const decl = r.decn();
            const co = r.str();
            return { pofs: "ADJ", adj: { decl, co } };
        }
        case "NUM": {
            const decl = r.decn();
            const sort = r.str();
            const value = r.int();
            return {
                pofs: "NUM",
                num: { decl, sort, value: Number.isNaN(value) ? 0 : value },
            };
        }
        case "ADV": {
            const co = r.str();
            return { pofs: "ADV", adv: { co } };
        }
        case "V": {
            const con = r.decn();
            const kind = r.str();
            return { pofs: "V", v: { con, kind } };
        }
        case "PREP": {
            const obj = r.str();
            return { pofs: "PREP", prep: { obj } };
        }
        default:
            return { pofs: "X" };
    }
}
/**
 * Parse a Suffix_Entry from a line.
 * Format: ROOT_POS ROOT_KEY TARGET_ENTRY TARGET_KEY
 * e.g.: "N 2 ADJ 1 1 POS 0"
 */
function parseSuffixEntry(line) {
    const tokens = tokenize(line);
    const r = new TokenReader(tokens);
    const root = parsePofs(r.str());
    const rootKey = r.int();
    const target = parseTargetEntry(tokens, r.offset);
    const targetKey = Number.parseInt(tokens[tokens.length - 1] ?? "0", 10);
    return { root, rootKey, target, targetKey };
}
function parsePrefixEntry(line) {
    const tokens = tokenize(line);
    const r = new TokenReader(tokens);
    const root = parsePofs(r.str());
    const target = parsePofs(r.str());
    return { root, target };
}
export function parseAddonsFile(content) {
    const lines = content.split("\n");
    const tackons = [];
    const packons = [];
    const tickons = [];
    const prefixes = [];
    const suffixes = [];
    let cursor = 0;
    while (cursor < lines.length) {
        const result = nextNonCommentLine(lines, cursor);
        if (!result)
            break;
        const [line1, nextCursor] = result;
        cursor = nextCursor;
        const trimmed = line1.trim();
        let entryType;
        let remainder;
        if (trimmed.startsWith("TACKON")) {
            entryType = "TACKON";
            remainder = trimmed.slice(6).trim();
        }
        else if (trimmed.startsWith("PREFIX")) {
            entryType = "PREFIX";
            remainder = trimmed.slice(6).trim();
        }
        else if (trimmed.startsWith("SUFFIX")) {
            entryType = "SUFFIX";
            remainder = trimmed.slice(6).trim();
        }
        else {
            continue;
        }
        // Read line 2 (entry data) — may be a comment-skipping read
        const result2 = nextNonCommentLine(lines, cursor);
        if (!result2)
            break;
        const [line2, nextCursor2] = result2;
        cursor = nextCursor2;
        // Read line 3 (meaning)
        const result3 = nextNonCommentLine(lines, cursor);
        if (!result3)
            break;
        const [line3, nextCursor3] = result3;
        cursor = nextCursor3;
        const mean = line3.trim();
        switch (entryType) {
            case "TACKON": {
                const word = remainder;
                const base = parseTargetEntry(tokenize(line2), 0);
                const item = { word, base, mean };
                // Classify as PACKON if base is PACK with decl.which 1 or 2
                // and meaning starts with "PACKON w/"
                if (base.pofs === "PACK" &&
                    "pack" in base &&
                    (base.pack.decl.which === 1 || base.pack.decl.which === 2) &&
                    mean.startsWith("PACKON w/")) {
                    packons.push(item);
                }
                else {
                    tackons.push(item);
                }
                break;
            }
            case "PREFIX": {
                const [fix, connect] = extractFix(remainder);
                const entr = parsePrefixEntry(line2);
                const item = { fix, connect, entr, mean };
                // Classify as TICKON if root POS is PACK
                if (entr.root === "PACK") {
                    tickons.push(item);
                }
                else {
                    prefixes.push(item);
                }
                break;
            }
            case "SUFFIX": {
                const [fix, connect] = extractFix(remainder);
                const entr = parseSuffixEntry(line2);
                suffixes.push({ fix, connect, entr, mean });
                break;
            }
        }
    }
    return { tackons, packons, tickons, prefixes, suffixes };
}
