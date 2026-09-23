import { PARTS_OF_SPEECH } from "../types/enums.js";
const VALID_POFS = new Set(PARTS_OF_SPEECH);
export function parsePofs(s) {
    const trimmed = s.trimEnd();
    return VALID_POFS.has(trimmed) ? trimmed : "X";
}
