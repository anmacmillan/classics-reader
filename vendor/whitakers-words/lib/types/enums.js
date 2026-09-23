// All enumeration types as const arrays + derived union types.
// Values match Ada's Enumeration_IO uppercase output format.
// Each enum has an 'X' value meaning "all, none, or unknown".
export const PARTS_OF_SPEECH = [
    "X",
    "N",
    "PRON",
    "PACK",
    "ADJ",
    "NUM",
    "ADV",
    "V",
    "VPAR",
    "SUPINE",
    "PREP",
    "CONJ",
    "INTERJ",
    "TACKON",
    "PREFIX",
    "SUFFIX",
];
export const GENDERS = ["X", "M", "F", "N", "C"];
export const CASES = ["X", "NOM", "VOC", "GEN", "LOC", "DAT", "ABL", "ACC"];
export const NUMBERS = ["X", "S", "P"];
export const COMPARISONS = ["X", "POS", "COMP", "SUPER"];
export const TENSES = ["X", "PRES", "IMPF", "FUT", "PERF", "PLUP", "FUTP"];
export const VOICES = ["X", "ACTIVE", "PASSIVE"];
export const MOODS = ["X", "IND", "SUB", "IMP", "INF", "PPL"];
export const NOUN_KINDS = ["X", "S", "M", "A", "G", "N", "P", "T", "L", "W"];
export const PRONOUN_KINDS = [
    "X",
    "PERS",
    "REL",
    "REFLEX",
    "DEMONS",
    "INTERR",
    "INDEF",
    "ADJECT",
];
export const NUMERAL_SORTS = ["X", "CARD", "ORD", "DIST", "ADVERB"];
export const VERB_KINDS = [
    "X",
    "TO_BE",
    "TO_BEING",
    "GEN",
    "DAT",
    "ABL",
    "TRANS",
    "INTRANS",
    "IMPERS",
    "DEP",
    "SEMIDEP",
    "PERFDEF",
];
export const AGES = ["X", "A", "B", "C", "D", "E", "F", "G", "H"];
export const FREQUENCIES = ["X", "A", "B", "C", "D", "E", "F", "I", "M", "N"];
export const AREAS = ["X", "A", "B", "D", "E", "G", "L", "P", "S", "T", "W", "Y"];
export const GEOS = [
    "X",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "N",
    "P",
    "Q",
    "R",
    "S",
    "U",
];
export const SOURCES = [
    "X",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "Y",
    "Z",
];
export const DICTIONARY_KINDS = [
    "X",
    "ADDONS",
    "XXX",
    "YYY",
    "NNN",
    "RRR",
    "PPP",
    "GENERAL",
    "SPECIAL",
    "LOCAL",
    "UNIQUE",
];
export const MAX_STEM_SIZE = 18;
export const MAX_ENDING_SIZE = 7;
