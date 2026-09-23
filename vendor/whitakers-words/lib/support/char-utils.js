const PUNCTUATION = new Set([" ", ",", "-", ";", ":", ".", "(", "[", "{", "<", ")", "]", "}", ">"]);
export function isPunctuation(c) {
    return PUNCTUATION.has(c);
}
export function isAlphaEtc(c) {
    return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "-" || c === ".";
}
export function vToUAndJToI(c) {
    switch (c) {
        case "V":
            return "U";
        case "v":
            return "u";
        case "J":
            return "I";
        case "j":
            return "i";
        default:
            return c;
    }
}
export function vToUAndJToIString(s) {
    let result = "";
    for (const c of s) {
        result += vToUAndJToI(c);
    }
    return result;
}
