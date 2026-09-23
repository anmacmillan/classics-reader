function endingKey(size, lastChar) {
    return `${size}:${lastChar}`;
}
export function buildInflectionIndex(records) {
    const blank = [];
    const byEnding = new Map();
    for (const rec of records) {
        if (rec.ending.size === 0) {
            blank.push(rec);
        }
        else {
            const suf = rec.ending.suf;
            const lastChar = suf.charAt(suf.length - 1);
            const key = endingKey(rec.ending.size, lastChar);
            let bucket = byEnding.get(key);
            if (!bucket) {
                bucket = [];
                byEnding.set(key, bucket);
            }
            bucket.push(rec);
        }
    }
    return { blank, byEnding };
}
/**
 * Look up inflections that could match a given ending.
 * Returns all inflection records whose ending size and last character match.
 * The caller must still verify the full ending string matches.
 */
export function lookupInflections(index, endingSize, lastChar) {
    if (endingSize === 0)
        return index.blank;
    return index.byEnding.get(endingKey(endingSize, lastChar)) ?? [];
}
