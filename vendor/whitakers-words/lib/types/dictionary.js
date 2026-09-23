// ---------------------------------------------------------------------------
// Null / default constants
// ---------------------------------------------------------------------------
export const NULL_STEMS = ["", "", "", ""];
export const NULL_PART_ENTRY = { pofs: "X" };
export const NULL_TRANSLATION = {
    age: "X",
    area: "X",
    geo: "X",
    freq: "X",
    source: "X",
};
export const NULL_DICTIONARY_ENTRY = {
    stems: NULL_STEMS,
    part: NULL_PART_ENTRY,
    tran: NULL_TRANSLATION,
    mean: "",
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STEM_COUNTS = {
    X: 0,
    N: 2,
    PRON: 2,
    PACK: 2,
    ADJ: 4,
    NUM: 4,
    ADV: 3,
    V: 4,
    VPAR: 0,
    SUPINE: 0,
    PREP: 1,
    CONJ: 1,
    INTERJ: 1,
    TACKON: 0,
    PREFIX: 1,
    SUFFIX: 1,
};
export function numberOfStems(pofs) {
    return STEM_COUNTS[pofs];
}
