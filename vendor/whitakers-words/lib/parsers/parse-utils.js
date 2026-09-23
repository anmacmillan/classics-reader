// ---------------------------------------------------------------------------
// Parser utilities — small combinator functions for structured field extraction.
// ---------------------------------------------------------------------------
/**
 * Fixed-width field reader for DICTLINE.GEN format.
 * Reads fields sequentially by column position.
 */
export class FixedReader {
    line;
    pos = 0;
    constructor(line) {
        this.line = line;
    }
    /** Read a fixed-width field, trimming trailing spaces. */
    field(width) {
        const v = this.line.slice(this.pos, this.pos + width).trimEnd();
        this.pos += width;
        return v;
    }
    /** Skip N characters. */
    skip(n = 1) {
        this.pos += n;
        return this;
    }
    /** Read remaining characters, trimmed. */
    rest() {
        return this.line.slice(this.pos).trimEnd();
    }
    /** Current position. */
    get offset() {
        return this.pos;
    }
}
/**
 * Token-based reader for space-delimited formats (INFLECTS.LAT, ADDONS.LAT, UNIQUES.LAT).
 * Reads tokens sequentially with type-safe accessors.
 */
export class TokenReader {
    tokens;
    pos;
    constructor(tokens, start = 0) {
        this.tokens = tokens;
        this.pos = start;
    }
    /** Read next token as string, defaulting to "X" if past end. */
    str() {
        return this.tokens[this.pos++] ?? "X";
    }
    /** Read next token as integer, defaulting to 0 if past end or NaN. */
    int() {
        const n = Number.parseInt(this.str(), 10);
        return Number.isNaN(n) ? 0 : n;
    }
    /** Read a declension/conjugation record (which, var) from the next 2 tokens. */
    decn() {
        return { which: this.int(), var: this.int() };
    }
    /** Peek at the next token without advancing. */
    peek() {
        return this.tokens[this.pos] ?? "";
    }
    /** Number of remaining tokens. */
    get remaining() {
        return this.tokens.length - this.pos;
    }
    /** Current position in the token array. */
    get offset() {
        return this.pos;
    }
}
