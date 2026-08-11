# -*- coding: utf-8 -*-
"""Trace syllabification of specific words (debug helper)."""
import json, re

IPA_MAP = {"AA":"ɑ","AE":"æ","AH":"ʌ","AO":"ɔ","AW":"aʊ","AY":"aɪ","B":"b","CH":"tʃ","D":"d",
 "DH":"ð","EH":"ɛ","ER":"ɜ","EY":"eɪ","F":"f","G":"ɡ","HH":"h","IH":"ɪ","IY":"i","JH":"dʒ",
 "K":"k","L":"l","M":"m","N":"n","NG":"ŋ","OW":"oʊ","OY":"ɔɪ","P":"p","R":"r","S":"s",
 "SH":"ʃ","T":"t","TH":"θ","UH":"ʊ","UW":"u","V":"v","W":"w","Y":"j","Z":"z","ZH":"ʒ"}
PH = {c: IPA_MAP[c] for c in IPA_MAP}

cmu = {}
for line in open("data/cmudict.dict", encoding="utf-8", errors="ignore"):
    line = line.rstrip("\n")
    if not line or line.startswith(";;;"): continue
    parts = line.split(maxsplit=1)
    if len(parts) != 2: continue
    w = parts[0].lower().split("(")[0]
    if w not in cmu: cmu[w] = parts[1].split()

def split_syllables(phones):
    syls, cur = [], None
    for ph in phones:
        code, st = re.match(r"([A-Z]+)([0-2]?)", ph).groups()
        sym = PH.get(code, code)
        if code == "AH" and st == "0": sym = "ə"
        if cur is None: cur = []
        if st and cur:
            syls.append(cur); cur = []
        cur.append(sym)
    if cur: syls.append(cur)
    return syls

for w in ["company","city","water","teacher","happy","money","morning","beautiful","table","apple","family","listen","seven","open","solution","government","education","information","banana"]:
    phones = cmu.get(w)
    if not phones:
        print(w, "NOT IN CMU"); continue
    print(w, phones, "=>", split_syllables(phones))