// ---------------------------------------------------------------------------
// Null / default constants
// ---------------------------------------------------------------------------
export const NULL_ENDING = { size: 0, suf: "" };
export const NULL_QUALITY = { pofs: "X" };
export const NULL_INFLECTION = {
    qual: NULL_QUALITY,
    key: 0,
    ending: NULL_ENDING,
    age: "X",
    freq: "X",
};
// ---------------------------------------------------------------------------
// Exhaustiveness helper
// ---------------------------------------------------------------------------
export function assertNever(x) {
    throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}
