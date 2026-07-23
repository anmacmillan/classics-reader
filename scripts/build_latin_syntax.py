#!/usr/bin/env python3
"""Attach Stanza Latin dependency parses to an imported chapter set.

The generated JSON is deliberately small and presentation-oriented: each
source line contains the word, lemma, Universal Dependencies relation, and
the governing word. It is an automatic study aid, not a replacement for a
reviewed treebank.
"""
from __future__ import annotations
import json
from pathlib import Path
import stanza

ROOT = Path(__file__).resolve().parents[1]

def parse_book(import_id: str, out_name: str) -> None:
    folder = ROOT / "imports" / import_id
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    pipeline = stanza.Pipeline("la", processors="tokenize,pos,lemma,depparse", tokenize_no_ssplit=False, verbose=False)
    syntax = []
    for chapter in manifest["chapters"]:
        lines = (folder / chapter["original"]).read_text(encoding="utf-8").splitlines()
        chapter_lines = []
        for line in lines:
            doc = pipeline(line)
            tokens = []
            for sentence_index, sentence in enumerate(doc.sentences):
                words = sentence.words
                agreement = {}
                for index, word in enumerate(words, 1):
                    if word.head and word.deprel in {"nsubj", "nsubj:pass", "amod", "det", "appos", "nmod"}:
                        group = f"{len(chapter_lines)}:{sentence_index}:{word.head}"
                        agreement[index] = group
                        agreement[word.head] = group
                for word in words:
                    head_word = words[word.head - 1].text if word.head else ""
                    token = {
                        "word": word.text,
                        "lemma": word.lemma or "",
                        "role": word.deprel or "",
                        "head": head_word,
                        "morph": word.feats or "",
                    }
                    if isinstance(word.id, int) and word.id in agreement:
                        token["agreement"] = agreement[word.id]
                    tokens.append(token)
            chapter_lines.append(tokens)
        syntax.append(chapter_lines)
    (folder / "syntax.json").write_text(json.dumps(syntax, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

if __name__ == "__main__":
    parse_book("caesar-de-bello-gallico-curriculum", "caesar-latin-syntax.json")
