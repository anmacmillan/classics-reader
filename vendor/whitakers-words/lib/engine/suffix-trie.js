function createNode() {
    return { children: new Map(), suffixes: [] };
}
/** Build a reversed-character trie from all suffix fix values. */
export function buildSuffixTrie(suffixes) {
    const root = createNode();
    for (const suffix of suffixes) {
        const fix = suffix.fix.toLowerCase();
        let node = root;
        // Insert reversed: walk from last char to first
        for (let i = fix.length - 1; i >= 0; i--) {
            const ch = fix.charAt(i);
            let child = node.children.get(ch);
            if (!child) {
                child = createNode();
                node.children.set(ch, child);
            }
            node = child;
        }
        // This node marks the end of a complete suffix
        node.suffixes.push(suffix);
    }
    return root;
}
/**
 * Find all suffixes that match the end of a stem by walking the trie
 * backwards from the last character of the stem.
 *
 * Returns all matches with the stripped stem (stem with suffix removed).
 */
export function findMatchingSuffixes(trie, stem) {
    const matches = [];
    let node = trie;
    for (let i = stem.length - 1; i >= 0; i--) {
        const ch = stem.charAt(i);
        const child = node.children.get(ch);
        if (!child)
            break; // no further matches possible
        node = child;
        // If this node has complete suffixes, the characters from stem[i..end]
        // match a suffix. The stripped stem is stem[0..i).
        if (node.suffixes.length > 0) {
            const strippedStem = stem.slice(0, i);
            if (strippedStem.length > 0) {
                for (const suffix of node.suffixes) {
                    matches.push({ suffix, strippedStem });
                }
            }
        }
    }
    return matches;
}
