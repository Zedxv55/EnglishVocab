# -*- coding: utf-8 -*-
"""Trace: exec top half of build_words.py, then step through render_word."""
src = open("scripts/build_words.py", encoding="utf-8").read()
head = src.split("# ---------------- build")[0]
ns = {}
exec(head, ns)

cmu = ns["cmu"]
for w in ["family", "company", "apple", "water", "teacher", "solution", "city", "government", "banana"]:
    phones = cmu.get(w)
    syls = ns["split_syllables"](phones)
    red = ns["redistribute"]([list(s) for s in syls])
    print("=" * 60)
    print(w, phones)
    print("  raw     :", syls)
    print("  redist  :", red)
    out, prev_coda = [], None
    for i, s in enumerate(red):
        vpos = [j for j, p in enumerate(s) if p in ns["VOWEL_SYMS"]]
        inherit = None
        if vpos:
            fv = s[vpos[0]]
            if fv in ("ə", "ɜ") and vpos[0] == 0 and prev_coda:
                inherit = prev_coda
        part = ns["render_syllable"](s, i == len(red) - 1, inherit)
        out.append(part)
        c = ns["last_coda"](s)
        prev_coda = c
        print(f"  syl{i} {s} inherit={inherit} -> '{part}'")
    print("  RESULT  :", "".join(out))