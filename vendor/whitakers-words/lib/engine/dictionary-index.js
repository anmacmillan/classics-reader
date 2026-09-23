/** Normalize a character for indexing: lowercase, v→u, j→i. */
function normalizeChar(c) {
    const lc = c.toLowerCase();
    if (lc === "v")
        return "u";
    if (lc === "j")
        return "i";
    return lc;
}
/** Get the 2-char index key for a stem. */
function stemIndexKey(stem) {
    if (stem.length === 0)
        return "";
    const c1 = normalizeChar(stem.charAt(0));
    if (stem.length === 1)
        return c1;
    return c1 + normalizeChar(stem.charAt(1));
}
export function buildDictionaryIndex(entries) {
    const byStem2 = new Map();
    const blankStems = [];
    for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
        const entry = entries[entryIdx];
        if (!entry)
            continue;
        // Index each stem
        for (let stemSlot = 0; stemSlot < 4; stemSlot++) {
            const stem = entry.stems[stemSlot];
            // Genuinely blank stems (e.g., sum/esse stem2) go into blankStems index.
            // Only include blank stems from V 5 (to_be) entries — these are the only
            // entries where a blank stem is intentional (the entire word is the ending).
            // All other blank stems are just unused slots (set to "zzz" in DICTLINE).
            if (!stem || stem.length === 0) {
                if (entry.part.pofs === "V" && entry.part.v.con.which === 5) {
                    blankStems.push({
                        stem: "",
                        stemKey: (stemSlot + 1),
                        entryIndex: entryIdx,
                    });
                }
                continue;
            }
            const normalized = normalizeStem(stem);
            const key = stemIndexKey(stem);
            if (key.length === 0)
                continue;
            let bucket = byStem2.get(key);
            if (!bucket) {
                bucket = [];
                byStem2.set(key, bucket);
            }
            bucket.push({
                stem: normalized,
                stemKey: (stemSlot + 1),
                entryIndex: entryIdx,
            });
        }
    }
    // Sort each bucket by stem for binary search
    for (const bucket of byStem2.values()) {
        bucket.sort((a, b) => (a.stem < b.stem ? -1 : a.stem > b.stem ? 1 : 0));
    }
    return { byStem2, entries, blankStems };
}
/**
 * Look up all dictionary stems that match a given stem string.
 * Uses u/v and i/j equivalence during comparison.
 */
export function lookupStems(index, stem) {
    if (stem.length === 0)
        return [];
    const key = stemIndexKey(stem);
    const bucket = index.byStem2.get(key);
    if (!bucket)
        return [];
    // Normalize the query stem for comparison
    const normalized = normalizeStem(stem);
    // Binary search for the first match, then scan for all matches
    let lo = 0;
    let hi = bucket.length - 1;
    let found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midStem = bucket[mid];
        if (!midStem)
            break;
        const cmp = compareStem(midStem.stem, normalized);
        if (cmp < 0) {
            lo = mid + 1;
        }
        else if (cmp > 0) {
            hi = mid - 1;
        }
        else {
            found = mid;
            break;
        }
    }
    if (found < 0)
        return [];
    // Scan backwards and forwards to collect all matches
    let start = found;
    while (start > 0 && compareStem(bucket[start - 1]?.stem ?? "", normalized) === 0) {
        start--;
    }
    let end = found;
    while (end < bucket.length - 1 && compareStem(bucket[end + 1]?.stem ?? "", normalized) === 0) {
        end++;
    }
    return bucket.slice(start, end + 1);
}
/** Normalize a full stem: lowercase, v→u, j→i. */
function normalizeStem(s) {
    let result = "";
    for (let i = 0; i < s.length; i++) {
        result += normalizeChar(s.charAt(i));
    }
    return result;
}
/** Compare two already-normalized stems. Returns -1, 0, or 1. */
function compareStem(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return 1;
    return 0;
}
