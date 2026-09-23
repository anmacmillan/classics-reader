import { TokenReader } from "./parse-utils.js";
import { parsePofs } from "./pofs-map.js";
// ---------------------------------------------------------------------------
// INFLECTS.LAT parser
//
// Lines are space-delimited with POS-specific fields. Comments start with --.
// ---------------------------------------------------------------------------
function isComment(line) {
    const trimmed = line.trimStart();
    return trimmed.startsWith("--") || trimmed.length === 0;
}
function tokenize(line) {
    const commentIdx = line.indexOf("--");
    const effective = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    return effective.split(/\s+/).filter((t) => t.length > 0);
}
/** Parse KEY + SIZE + optional ENDING from token stream. */
function parseEnding(r) {
    const stemKey = r.int();
    const size = r.int();
    let suf = "";
    if (size > 0 && r.remaining > 0) {
        const candidate = r.peek();
        // Age/Freq tokens are single uppercase letters — endings are lowercase
        if (candidate.length > 1 || (candidate >= "a" && candidate <= "z")) {
            suf = r.str();
        }
    }
    return { stemKey, ending: { size, suf } };
}
function parseInflectionLine(tokens) {
    if (tokens.length < 3)
        return null;
    const pofs = parsePofs(tokens[0] ?? "X");
    const r = new TokenReader(tokens, 1);
    let qual;
    let stemKey;
    let ending;
    switch (pofs) {
        case "N": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "N", noun: { decl, cs, number, gender } };
            break;
        }
        case "PRON": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "PRON", pron: { decl, cs, number, gender } };
            break;
        }
        case "PACK": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "PACK", pack: { decl, cs, number, gender } };
            break;
        }
        case "ADJ": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const comparison = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = {
                pofs: "ADJ",
                adj: { decl, cs, number, gender, comparison },
            };
            break;
        }
        case "NUM": {
            const decl = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const sort = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "NUM", num: { decl, cs, number, gender, sort } };
            break;
        }
        case "ADV": {
            const comparison = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "ADV", adv: { comparison } };
            break;
        }
        case "V": {
            const con = r.decn();
            const tense = r.str();
            const voice = r.str();
            const mood = r.str();
            const person = r.int();
            const number = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = {
                pofs: "V",
                verb: { con, tenseVoiceMood: { tense, voice, mood }, person, number },
            };
            break;
        }
        case "VPAR": {
            const con = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            const tense = r.str();
            const voice = r.str();
            const mood = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = {
                pofs: "VPAR",
                vpar: {
                    con,
                    cs,
                    number,
                    gender,
                    tenseVoiceMood: { tense, voice, mood },
                },
            };
            break;
        }
        case "SUPINE": {
            const con = r.decn();
            const cs = r.str();
            const number = r.str();
            const gender = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "SUPINE", supine: { con, cs, number, gender } };
            break;
        }
        case "PREP": {
            const cs = r.str();
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "PREP", prep: { cs } };
            break;
        }
        case "CONJ": {
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "CONJ" };
            break;
        }
        case "INTERJ": {
            ({ stemKey, ending } = parseEnding(r));
            qual = { pofs: "INTERJ" };
            break;
        }
        default:
            return null;
    }
    const age = r.str();
    const freq = r.str();
    return { qual, key: stemKey, ending, age, freq };
}
export function parseInflectsFile(content) {
    const lines = content.split("\n");
    const records = [];
    for (const line of lines) {
        if (isComment(line))
            continue;
        const tokens = tokenize(line);
        if (tokens.length === 0)
            continue;
        const record = parseInflectionLine(tokens);
        if (record) {
            records.push(record);
        }
    }
    return records;
}
