#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge wordlist + translations + cmudict IPA -> data/words.js
Fields: {w, ipa, th_ipa (Thai-script approx reading), pos, th (Thai meaning)}
"""
import json, re, random

MIN_WORDS = 5000

# ---------------- load wordlist (same cleaning as translate.py) ----------------
raw = [l.strip() for l in open("data/wordlist.txt", encoding="utf-8") if l.strip()]
seen, words = set(), []
for w in raw:
    w = w.lower()
    if not re.fullmatch(r"[a-z][a-z'\-]*", w): continue
    if w in seen: continue
    seen.add(w); words.append(w)
words = words[:MIN_WORDS]

# ---------------- translations ----------------
th_map = {}
for line in open("data/translations.jsonl", encoding="utf-8"):
    try:
        j = json.loads(line); th_map[j["w"]] = j["th"]
    except Exception: pass

# ---------------- cmudict ----------------
cmu = {}
for line in open("data/cmudict.dict", encoding="utf-8", errors="ignore"):
    line = line.rstrip("\n")
    if not line or line.startswith(";;;"): continue
    parts = line.split(maxsplit=1)
    if len(parts) != 2: continue
    w = parts[0].lower().split("(")[0]
    if w not in cmu: cmu[w] = parts[1].split()

# ---------------- phoneme constants ----------------
IPA_MAP = {"AA":"ɑ","AE":"æ","AH":"ʌ","AO":"ɔ","AW":"aʊ","AY":"aɪ","B":"b","CH":"tʃ","D":"d",
 "DH":"ð","EH":"ɛ","ER":"ɜ","EY":"eɪ","F":"f","G":"ɡ","HH":"h","IH":"ɪ","IY":"i","JH":"dʒ",
 "K":"k","L":"l","M":"m","N":"n","NG":"ŋ","OW":"oʊ","OY":"ɔɪ","P":"p","R":"r","S":"s",
 "SH":"ʃ","T":"t","TH":"θ","UH":"ʊ","UW":"u","V":"v","W":"w","Y":"j","Z":"z","ZH":"ʒ"}
PH = {code: IPA_MAP[code] for code in IPA_MAP}
VOWEL_SYMS = set("ɑ æ ʌ ɔ aʊ aɪ ɛ eɪ ɪ i oʊ ɔɪ ʊ u ɜ ə".split())
SONORANT = set("l r n m y w")

def arpa_to_ipa(phones):
    return "".join(PH.get(re.sub(r"[0-9]", "", p), "") for p in phones)

# ---------------- Thai rendering ----------------
CONS = {"b":"บ","d":"ด","ɡ":"ก","p":"พ","t":"ท","k":"ค","f":"ฟ","v":"ว","θ":"ธ","ð":"ด",
 "s":"ซ","z":"ซ","ʃ":"ช","ʒ":"ช","h":"ฮ","m":"ม","n":"น","ŋ":"ง","l":"ล","r":"ร","w":"ว",
 "j":"ย","tʃ":"ช","dʒ":"จ"}
FINAL = {"p":"ป","t":"ท","k":"ก","b":"บ","d":"ด","ɡ":"ก","f":"ฟ","v":"ฟ","θ":"ธ","ð":"ด",
 "s":"ส","z":"ส","ʃ":"ช","ʒ":"ช","m":"ม","n":"น","ŋ":"ง","l":"ล","r":"ร","tʃ":"ช","dʒ":"จ"}
UNASP = {"p":"ป","t":"ต","k":"ก"}

def valid_onset(cl):
    if not cl: return False
    if len(cl) == 1: return True
    if len(cl) == 2:
        a, b = cl
        if b in ("l","r") and a in ("p","b","t","d","k","ɡ","f","v","θ","ʃ"): return True
        if b == "w" and a in ("t","k","ɡ","d","s","p"): return True
        if a == "s" and b in ("p","t","k","f","m","n","l","w"): return True
        if a == "ʃ" and b in ("r","l","w"): return True
        return False
    if len(cl) == 3:
        if cl[0] == "s" and cl[1] in ("p","t","k") and cl[2] in ("l","r","w","j"): return True
        return False
    return False

def split_syllables(phones):
    """split at every stress-marked vowel (CMU convention); AH0 -> schwa"""
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

def redistribute(syls):
    """1) leading consonant-only syllable -> next onset
       2) next syllable keeps longest valid onset suffix, rest -> prev coda
       3) if prev has single sonorant coda and next starts with vowel -> move to next onset"""
    # pass 0: merge leading consonant-only into next
    while len(syls) > 1 and not any(p in VOWEL_SYMS for p in syls[0]):
        syls[1] = syls[0] + syls[1]; syls.pop(0)
    # pass 1: trailing consonant-only -> merge into prev coda
    while len(syls) > 1 and not any(p in VOWEL_SYMS for p in syls[-1]):
        syls[-2] = syls[-2] + syls[-1]; syls.pop()
    res = []
    for syl in syls:
        if not syl: continue
        vpos = [j for j, p in enumerate(syl) if p in VOWEL_SYMS]
        if not vpos:
            if res: res[-1].extend(syl)
            else: res.append(syl[:])
            continue
        onset = syl[:vpos[0]]
        tail = syl[vpos[0]:]
        if onset and res:
            prev = res[-1]
            prev_ends_vowel = prev[-1] in VOWEL_SYMS
            if prev_ends_vowel:
                k = 0
                for cand in range(len(onset), 0, -1):
                    if valid_onset(onset[-cand:]):
                        k = cand; break
                if k == 0: k = 1
                if k < len(onset):
                    prev.extend(onset[:-k]); onset = onset[-k:]
        elif not onset and res:
            prev = res[-1]
            # move single prev-coda consonant to this onset (maximal onset),
            # unless this syllable is schwa/r-colored (handled via inheritance)
            if prev and len(prev) >= 2 and prev[-1] not in VOWEL_SYMS:
                if prev[-2] in VOWEL_SYMS:
                    if prev[-1] in SONORANT or tail[0] not in ("ə", "ɜ"):
                        onset = [prev.pop()]
        res.append(onset + tail)
    return res

def render_onset(onset):
    out, i = [], 0
    while i < len(onset):
        p = onset[i]
        if p == "s" and i + 1 < len(onset) and onset[i+1] in ("p","t","k"):
            out.append("ส"); out.append(UNASP[onset[i+1]]); i += 2; continue
        out.append(CONS.get(p, "")); i += 1
    return "".join(out)

def final_cluster(coda):
    out = []
    for i, c in enumerate(coda):
        g = FINAL.get(c, "")
        if not g: continue
        out.append(g + ("์" if i < len(coda) - 1 else ""))
    return "".join(out)

def render_syllable(seq, is_last=False, inherit_onset=None):
    vpos = [j for j, p in enumerate(seq) if p in VOWEL_SYMS]
    if not vpos: return render_onset(seq)
    onset = seq[:vpos[0]]
    if not onset and inherit_onset:
        onset = [inherit_onset]
    vow = "".join(seq[vpos[0]:vpos[-1]+1])
    coda = seq[vpos[-1]+1:]
    o = render_onset(onset)

    # near-diphthong vowel + r coda
    if coda and coda[0] == "r" and vow in ("ɪ","ɛ","ʊ","æ","ɔ","ɑ","ʌ"):
        spec = {"ɪ": ("เ","ีย","ร"), "ɛ": ("แ","","ร"), "ʊ": ("เ","ือ","ร"),
                "æ": ("แ","","ร"), "ɔ": ("","อ","ร"), "ɑ": ("","า","ร"),
                "ʌ": ("เ","ิ","ร")}
        pre, mid, suff = spec[vow]
        rest = final_cluster(coda[1:])
        res = pre + o + mid + suff
        if rest: res += "์" + rest
        return res

    if vow == "ə":
        if coda and coda[0] in ("l","n","r") and len(coda) == 1:
            if o:
                if is_last: return {"l":"เ"+o+"ิล","n":"เ"+o+"ิน","r":"เ"+o+"อร"}[coda[0]]
                return {"l":o+"ิล","n":o+"ิน","r":o+"อร"}[coda[0]]
            return {"l":"เอิล","n":"เอิน","r":"เออร์"}[coda[0]]
        if not coda:
            return ("เ" + o + "อ") if o else "เอ"
        c = final_cluster(coda)
        if o: return "เ" + o + "อ" + c
        return "เอ" + c

    if vow == "ɜ":
        if o:
            if not coda: return ("เ" + o + "อร") if o else "เออร์"
            if coda[0] == "r":
                rest = final_cluster(coda[1:])
                return "เ" + o + "ิ" + "ร" + ("์" + rest if rest else "์")
            return "เ" + o + "ิ" + "ร" + "์" + final_cluster(coda)
        if coda: return "เอิ" + "ร" + "์" + final_cluster(coda)
        return "เออร์"

    if vow == "aɪ":
        if coda: return "ไ" + o + final_cluster(coda)
        return ("ไอ" if not o else "ไ" + o)
    if vow == "aʊ":
        if coda: return "เ" + o + "า" + final_cluster(coda)
        return ("เอา" if not o else "เ" + o + "า")
    if vow == "ɔɪ":
        if coda: return "อ" + o + "ย" + final_cluster(coda)
        return ("ออย" if not o else "อ" + o + "ย")
    if vow == "ɪə":
        if coda: return "เ" + o + "ีย" + final_cluster(coda)
        return ("เอีย" if not o else "เ" + o + "ีย")
    if vow == "ʊə":
        if coda: return "เ" + o + "ือ" + final_cluster(coda)
        return ("เอือ" if not o else "เ" + o + "ือ")

    forms = {"æ": ("แ","แอ", True), "ɛ": ("เ","เอ", True), "eɪ": ("เ","เอ", True),
             "oʊ": ("โ","โอ", True), "ɑ": ("า","อา", False), "ɔ": ("อ","ออ", False),
             "i": ("ี","อี", False), "ɪ": ("ิ","อิ", False), "u": ("ู","อู", False),
             "ʊ": ("ุ","อุ", False), "ʌ": ("ั","อั", False)}
    if vow in forms:
        att, std, prefix = forms[vow]
        if coda:
            c = final_cluster(coda)
            if not o: return std + c
            return (att + o + c) if prefix else (o + att + c)
        if not o: return std
        return (att + o) if prefix else (o + att)
    return o + final_cluster(coda)

def last_coda(seq):
    vpos = [j for j, p in enumerate(seq) if p in VOWEL_SYMS]
    if not vpos: return None
    coda = seq[vpos[-1]+1:]
    return coda[-1] if coda else None

def render_word(phones):
    try:
        syls = split_syllables(phones)
        syls = redistribute(syls)
        out, prev_coda = [], None
        for i, s in enumerate(syls):
            vpos = [j for j, p in enumerate(s) if p in VOWEL_SYMS]
            inherit = None
            if vpos:
                first_v = s[vpos[0]]
                if first_v in ("ə","ɜ") and vpos[0] == 0 and prev_coda:
                    inherit = prev_coda
            is_last = (i == len(syls) - 1)
            out.append(render_syllable(s, is_last, inherit))
            c = last_coda(s)
            if c: prev_coda = c
            else: prev_coda = None
        return "".join(out)
    except Exception:
        return ""

# ---------------- POS classification ----------------
PRON = set("i you he she it we they me him her us them my your his its our their mine yours hers ours theirs who whom whose which what this that these those someone anybody everyone nobody nothing something anything everything myself yourself himself herself itself ourselves themselves each one ones another".split())
PREP = set("about above across after against along among around at before behind below beneath beside between beyond by down during except for from in inside into near of off on onto out outside over past since through throughout till to toward towards under underneath until up upon with within without per via".split())
CONJ = set("and or but so if because although though while whereas unless nor yet whether once since".split())
DET  = set("the a an some any no every each either neither much many few several all both half enough own other such whole another".split())
AUX  = set("is am are was were be been being do does did have has had can could will would shall should may might must need dare".split())
INTERJ = set("oh ah hey hi hello goodbye bye yes no well wow oops hmm huh ha ho yo aha alas ok okay".split())
PROPER = set("harry costa mar fri th pc sexo avatar".split())
ADJ_MISC = set("stupid required related involved expected included limited concerned established complicated excited interested surprised worried tired bored confused disappointed embarrassed married single simple little high low long strong weak warm cool new old big small fast slow hard soft dark bright rich poor young deep tall loud clean safe sweet good bad hot cold wide better best worse worst more most less least large nice fine late true pure white blue huge rare wise cute rude brave alive awake alone aware friendly".split())
ADV_MISC = set("ever never always together however therefore maybe perhaps almost already also sometimes very yet".split())
VERB_MISC = set("consider remember offer answer cover discover recover deliver enter matter order wonder suffer murder occur refer prefer transfer pour alter gather bother".split())
N_Y = set("city country company family party story body baby lady army energy history victory factory memory category delivery quality quantity ability activity community opportunity responsibility society variety university industry economy security authority property century strategy theory apology symphony treaty valley journey money key boy day way navy".split())
ATE_N = set("chocolate date state plate mate rate gate fate hate crate skate slate grate".split())
IVE_N = set("archive motive native captive".split())
AL_N = set("animal hospital capital proposal arrival removal denial trial festival mineral coral".split())
IC_N = set("music topic logic clinic critic classic mechanic magic plastic graphic".split())
EN_N  = set("seven eleven oven chicken heaven children kitchen sudden women golden frozen wooden woolen silken linen token dozen burden garden often".split())
ENT_N = set("student president resident agent client elephant merchant".split())
ANT_N = set("elephant servant merchant giant".split())
URE_N = set("sure".split())
ARY_N = set("dictionary library secretary salary anniversary boundary itinerary vocabulary summary".split())
LE_N  = set("angle table people example article circle battle castle bottle candle middle needle single simple little able apple".split())
NOUN_GE = set("knowledge language village image stage age college courage storage package percentage advantage message marriage luggage garage sponge".split())
ADJ_SFX_EXC = {"al": AL_N, "ic": IC_N, "ive": IVE_N, "ent": ENT_N, "ant": ANT_N, "ary": ARY_N}

def pos_of(w):
    if w in PROPER: return "other"
    if w in PRON: return "pron"
    if w in PREP: return "prep"
    if w in CONJ: return "conj"
    if w in DET: return "det"
    if w in AUX: return "aux"
    if w in INTERJ: return "interj"
    if w in ADJ_MISC: return "adj"
    if w in ADV_MISC: return "adv"
    if w in VERB_MISC: return "verb"
    n = len(w)
    if w.endswith("ly") and n > 4 and (w in ADV_MISC or w[:-2] in seen or w[:-2] + "e" in seen): return "adv"
    if w.endswith("day"): return "noun"
    if re.search(r"(logy|graphy|metry|nomy|phony|pathy|tomy|ism|ity|ness|ment|tion|sion|ance|ence|ship|hood|dom|ist|ure|ture|sure|age|th)$", w):
        return "noun"
    if w.endswith(("ate",)) and n >= 6 and w not in ATE_N: return "verb"
    if w.endswith(("ize","ise","ify","fy")) and n >= 5: return "verb"
    if w.endswith("en") and n >= 5 and w not in EN_N: return "verb"
    if w.endswith("le") and n >= 4:
        if w in LE_N: return "noun"
        return "adj"
    for sfx, exc in ADJ_SFX_EXC.items():
        if w.endswith(sfx) and n >= 5:
            if w in exc: return "noun"
            return "adj"
    if w.endswith(("able","ible","ous","ful","less","ish","like","ward")) and n >= 5: return "adj"
    if w.endswith("y") and n >= 4:
        if w in N_Y: return "noun"
        return "adj"
    if w.endswith(("er","or")) and n >= 4:
        bases = {w[:-2], w[:-1]}
        if len(w) >= 5: bases.add(w[:-3] + w[-3])
        for b in bases:
            if b in seen:
                if pos_of(b) == "adj": return "adj"   # comparative (larger)
                return "noun"                          # agent noun (teacher)
        return "noun"
    if w.endswith("ge") and w in NOUN_GE and n >= 5: return "noun"
    if w.endswith(("ce","se")) and n >= 4: return "noun"
    if w.endswith("e") and n >= 4: return "verb"   # use, make, take, give...
    return "noun"

# ---------------- build ----------------
rows, no_ipa, no_th = [], 0, 0
for w in words:
    th = th_map.get(w, "")
    if not th: no_th += 1
    phones = cmu.get(w)
    ipa = th_ipa = ""
    if phones:
        ipa = arpa_to_ipa(phones)
        th_ipa = render_word(phones)
    else:
        no_ipa += 1
    rows.append({"w": w, "ipa": ipa, "th_ipa": th_ipa, "pos": pos_of(w), "th": th})

js = "window.VOCAB = " + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";"
open("data/words.js", "w", encoding="utf-8").write(js)
print(f"total={len(rows)} th_ok={len(rows)-no_th} no_th={no_th} ipa_ok={len(rows)-no_ipa} no_ipa={no_ipa}")

random.seed(7)
print("\n--- sample ---")
for w in random.sample(rows, 40):
    print(f"{w['w']:<14} {w['ipa']:<13} {w['th_ipa']:<13} {w['pos']:<6} {w['th']}")
print("\n--- known words check ---")
for w in ["apple","banana","about","family","company","country","table","computer","teacher","beautiful","morning","yesterday","understand","solution","information","opportunity","different","development","experience","knowledge","question","language","research","science","history","government","education","money","water","seven","listen","demand","happy","city"]:
    x = next((r for r in rows if r["w"] == w), None)
    if x: print(f"{x['w']:<14} {x['ipa']:<13} {x['th_ipa']:<13} {x['pos']:<6} {x['th']}")