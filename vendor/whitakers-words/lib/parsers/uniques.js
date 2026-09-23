import { TokenReader } from "./parse-utils.js";
import { parsePofs } from "./pofs-map.js";
function tokenize(line) {
    return line
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
}
/**
 * Parse the quality/kind/translation line of a unique entry.
 * Returns [QualityRecord, PartEntry, TranslationRecord fields, kindData].
 */
function parseQualityLine(line) {
    const tokens = tokenize(line);
    const pofs = parsePofs(tokens[0] ?? "X");
    const r = new TokenReader(tokens, 1);
    // Translation values are always the last 5 tokens
    const len = tokens.length;
    const age = (tokens[len - 5] ?? "X");
    const area = (tokens[len - 4] ?? "X");
    const geo = (tokens[len - 3] ?? "X");
    const freq = (tokens[len - 2] ?? "X");
    const source = (tokens[len - 1] ?? "X");
    switch (pofs) {
        case "N": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const kind = r.str();
            return {
                qual: { pofs: "N", noun: { decl, cs, number, gender } },
                part: { pofs: "N", n: { decl, gender, kind } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "PRON": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const kind = r.str();
            return {
                qual: { pofs: "PRON", pron: { decl, cs, number, gender } },
                part: { pofs: "PRON", pron: { decl, kind } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "PACK": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const kind = r.str();
            return {
                qual: { pofs: "PACK", pack: { decl, cs, number, gender } },
                part: { pofs: "PACK", pack: { decl, kind } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "ADJ": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const comparison = r.str();
            return {
                qual: { pofs: "ADJ", adj: { decl, cs, number, gender, comparison } },
                part: { pofs: "ADJ", adj: { decl, co: comparison } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "NUM": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const sort = r.str();
            const numValue = r.int();
            return {
                qual: { pofs: "NUM", num: { decl, cs, number, gender, sort } },
                part: { pofs: "NUM", num: { decl, sort, value: Number.isNaN(numValue) ? 0 : numValue } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "ADV": {
            const comparison = r.str();
            return {
                qual: { pofs: "ADV", adv: { comparison } },
                part: { pofs: "ADV", adv: { co: comparison } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        case "V": {
            const con = r.decn();
            const tense = r.str();
            const voice = r.str();
            const mood = r.str();
            const person = r.int();
            const number = r.str();
            const kind = r.str();
            return {
                qual: { pofs: "V", verb: { con, tenseVoiceMood: { tense, voice, mood }, person, number } },
                part: { pofs: "V", v: { con, kind } },
                age,
                area,
                geo,
                freq,
                source,
            };
        }
        default:
            return {
                qual: { pofs: "X" },
                part: { pofs: "X" },
                age: "X",
                area: "X",
                geo: "X",
                freq: "X",
                source: "X",
            };
    }
}
export function parseUniquesFile(content) {
    const lines = content.split("\n");
    const entries = [];
    let i = 0;
    while (i + 2 < lines.length) {
        const stemLine = (lines[i] ?? "").trim();
        const qualLine = (lines[i + 1] ?? "").trim();
        const meanLine = (lines[i + 2] ?? "").trim();
        i += 3;
        if (stemLine.length === 0 || qualLine.length === 0)
            continue;
        const { qual, part, age, area, geo, freq, source } = parseQualityLine(qualLine);
        const de = {
            stems: [stemLine, "", "", ""],
            part,
            tran: { age, area, geo, freq, source },
            mean: meanLine,
        };
        entries.push({ word: stemLine, qual, de });
    }
    return entries;
}
