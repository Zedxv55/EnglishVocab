# -*- coding: utf-8 -*-
src = open("scripts/build_words.py", encoding="utf-8").read()
head = src.split("# ---------------- build")[0]
ns = {}
exec(head, ns)

print("CONS keys:", sorted((hex(ord(k[0])), k) for k in ns["CONS"] if len(k) == 1))
print("render [ɡ,ʌ,v] ->", repr(ns["render_syllable"](["ɡ","ʌ","v"])))
print("render [w,ɔ,t] ->", repr(ns["render_syllable"](["w","ɔ","t"])))
print("render [ə], inherit=p ->", repr(ns["render_syllable"](["ə"], False, "p")))
print("render [ɜ], inherit=t ->", repr(ns["render_syllable"](["ɜ"], True, "t")))