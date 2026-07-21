#!/usr/bin/env python3
"""Build GREEK_DICT entries for a Greek text from a dependency treebank.

This is the pipeline used for the Odyssey 1, Iliad 1, Oedipus Tyrannus and
Symposium imports. It aligns a text (one display line per row) against the
token stream of a treebank in AGDT/GLAUx XML format (word elements with
form/lemma/postag attributes, 9-position Perseus postags) and emits, per
unique clickable form, every attested (lemma, morphology) analysis.

Treebank sources:
  - Hand-verified (poetry): https://github.com/PerseusDL/treebank_data
    (v2.1/Greek/texts/, e.g. tlg0012.tlg001 = Iliad, tlg0011.tlg004 = OT)
  - Automatic, wide coverage (incl. all Plato): GLAUx,
    https://github.com/perseids-publications/glaux-trees (public/xml/,
    e.g. 0059-011.xml = Symposium)

Usage:
  python3 scripts/build_greek_treebank_dictionary.py TEXT.txt TREEBANK.xml OUT_PREFIX

  The text must start where the treebank document starts (or pre-slice the
  XML). Output: OUT_PREFIX_forms.json (form key -> analyses) and
  OUT_PREFIX_lemmas.json (lemma -> pos/examples, the glossing worklist).

  Then supply per-lemma glosses {"lemma": {"en": ..., "nl": ...}} (an LLM
  drafts these well when given the lemmas file) and merge forms + glosses
  into generated/imported-greek-dictionary.js entries of the shape
  {"lemma", "en", "nl", "grammar"} keyed by the lowercased clickable form.

Form keys replicate app.js lookup: the clickable word is the token minus
leading/trailing punctuation, keeping an apostrophe only between letters,
lowercased. Elision apostrophes must be U+2019 in the text; this script
normalises U+02BC / U+1FBD / U+0313-at-token-end to U+2019.
"""
import json
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import OrderedDict

NUMBER = {"s": "sg", "p": "pl", "d": "dual"}
TENSE = {"p": "pres", "i": "imperf", "f": "fut", "a": "aor", "r": "perf", "l": "plup", "t": "futperf"}
MOOD = {"i": "ind", "s": "subj", "o": "opt", "n": "inf", "m": "imperat", "p": "part"}
VOICE = {"a": "act", "p": "pass", "m": "mid", "e": "mp"}
GENDER = {"m": "masc", "f": "fem", "n": "neut", "c": "common"}
CASE = {"n": "nom", "g": "gen", "d": "dat", "a": "acc", "v": "voc"}
PERSON = {"1": "1st", "2": "2nd", "3": "3rd"}
DEGREE = {"c": "comp", "s": "superl"}
POS = {
    "n": "noun", "v": "verb", "a": "adj", "d": "adv", "l": "article",
    "g": "partic", "c": "conj", "r": "prep", "p": "pron", "m": "num",
    "i": "interj", "e": "interj", "b": "partic", "x": "irreg",
}


def parse_postag(postag):
    postag = (postag or "").ljust(9, "-")
    pos, per, num, ten, moo, voi, gen, cas, deg = postag[:9]
    if pos == "u":
        return None
    base = POS.get(pos, pos)
    if pos == "v":
        if moo == "p":
            parts = ["part", NUMBER.get(num), TENSE.get(ten), VOICE.get(voi),
                     GENDER.get(gen), CASE.get(cas)]
        elif moo == "n":
            parts = ["verb", TENSE.get(ten), "inf", VOICE.get(voi)]
        else:
            parts = ["verb", PERSON.get(per), NUMBER.get(num), TENSE.get(ten),
                     MOOD.get(moo), VOICE.get(voi)]
    elif pos in ("n", "a", "l", "p", "m"):
        parts = [base]
        if pos == "p" and per in PERSON:
            parts.append(PERSON[per])
        parts += [NUMBER.get(num), GENDER.get(gen), CASE.get(cas)]
        if deg in DEGREE:
            parts.append(DEGREE[deg])
    else:
        parts = [base]
    return " ".join(p for p in parts if p)


def is_word_char(ch):
    cat = unicodedata.category(ch)
    return cat.startswith("L") or cat.startswith("M")


def has_letters(s):
    return any(is_word_char(c) and c != "ʼ" for c in s)


def clean_form(form):
    form = form.replace("ʼ", "’").replace("'", "’").replace("᾽", "’")
    if form and form[-1] in ("̓", "̓"):
        form = form[:-1] + "’"
    return form


def app_key(token):
    chars = list(token)
    start = 0
    while start < len(chars) and not is_word_char(chars[start]):
        start += 1
    end = start
    while end < len(chars) and is_word_char(chars[end]):
        end += 1
    if end < len(chars) and chars[end] in ("'", "’") and end + 1 < len(chars) and is_word_char(chars[end + 1]):
        end += 1
        while end < len(chars) and is_word_char(chars[end]):
            end += 1
    return "".join(chars[start:end]).lower()


def norm_form(s):
    s = s.replace("ʼ", "").replace("’", "").replace("'", "").replace("᾽", "")
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if c.isalpha() and not unicodedata.combining(c))


def load_stream(path):
    stream = []
    for sentence in ET.parse(path).getroot().iter("sentence"):
        for word in sentence.iter("word"):
            if word.get("insertion_id") is not None or word.get("artificial"):
                continue
            form = clean_form(word.get("form") or "")
            postag = word.get("postag") or ""
            if postag.startswith("u") or not has_letters(form):
                continue
            stream.append((form, word.get("lemma") or "", postag))
    return stream


def main(text_path, tb_path, out_prefix):
    lines = [l.rstrip("\n") for l in open(text_path, encoding="utf-8") if l.strip()]
    stream = load_stream(tb_path)
    forms = OrderedDict()
    lemmas = OrderedDict()
    problems = []
    idx = 0
    total = 0

    def record(key, lemma, grammar, token, line_no):
        analyses = forms.setdefault(key, OrderedDict())
        akey = (lemma, grammar)
        analyses[akey] = analyses.get(akey, 0) + 1
        info = lemmas.setdefault(lemma, {"pos": set(), "examples": []})
        info["pos"].add((grammar or "").split(" ")[0])
        if len(info["examples"]) < 2:
            info["examples"].append(f"{token} (line {line_no})")

    for line_no, line in enumerate(lines, 1):
        for token in line.split(" "):
            if not has_letters(token):
                continue
            key = app_key(token)
            if not key:
                continue
            total += 1
            if idx >= len(stream):
                problems.append(f"line {line_no}: ran out of treebank at {token!r}")
                continue
            tb_form, lemma, postag = stream[idx]
            # treebank may split crasis / οὐδέ-type compounds into two tokens
            if (norm_form(tb_form) != norm_form(token) and idx + 1 < len(stream)
                    and norm_form(tb_form + stream[idx + 1][0]) == norm_form(token)):
                record(key, token.strip(",.·;—?"), "merged: " + (parse_postag(postag) or "?"),
                       token, line_no)
                idx += 2
                continue
            if norm_form(tb_form) != norm_form(token):
                resynced = False
                for skip in range(1, 5):
                    if idx + skip < len(stream) and norm_form(stream[idx + skip][0]) == norm_form(token):
                        problems.append(f"line {line_no}: {token!r} vs {tb_form!r}; resynced skip {skip}")
                        idx += skip
                        tb_form, lemma, postag = stream[idx]
                        resynced = True
                        break
                if not resynced:
                    problems.append(f"line {line_no}: UNMATCHED {token!r} vs {tb_form!r}")
                    idx += 1
                    continue
            record(key, lemma, parse_postag(postag), token, line_no)
            idx += 1

    print(f"{out_prefix}: {total} text tokens, consumed {idx}/{len(stream)} treebank tokens, "
          f"{len(forms)} keys, {len(lemmas)} lemmas")
    for p in problems:
        print("  ", p)
    print("Review 'merged:' grammar strings and empty lemmas by hand before publishing.")

    json.dump(
        {k: [{"lemma": l, "grammar": g, "count": c} for (l, g), c in v.items()]
         for k, v in forms.items()},
        open(f"{out_prefix}_forms.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(
        {l: {"pos": sorted(p for p in i["pos"] if p), "examples": i["examples"]}
         for l, i in lemmas.items()},
        open(f"{out_prefix}_lemmas.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
