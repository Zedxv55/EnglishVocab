#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Translate English word list -> Thai via Google translate unofficial endpoint.
Incremental checkpoint: translations.jsonl (one JSON per line).
Restart-safe: skips words already translated.
"""
import json, os, re, random, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

WORDLIST = "data/wordlist.txt"
OUT = "data/translations.jsonl"
MAX_WORDS = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
WORKERS = 6

# ---------- load & clean word list ----------
raw = [l.strip() for l in open(WORDLIST, encoding="utf-8") if l.strip()]
seen, words = set(), []
for w in raw:
    w = w.lower()
    if not re.fullmatch(r"[a-z][a-z'\-]*", w):
        continue
    if w in seen:
        continue
    seen.add(w)
    words.append(w)
words = words[:MAX_WORDS]
print(f"words to translate: {len(words)}")

# ---------- load checkpoints ----------
done = {}
if os.path.exists(OUT):
    for line in open(OUT, encoding="utf-8"):
        try:
            j = json.loads(line)
            done[j["w"]] = j["th"]
        except Exception:
            pass
print(f"already done: {len(done)}")

pending = [w for w in words if w not in done]
print(f"pending: {len(pending)}")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

def translate_one(w, attempt=0):
    url = ("https://translate.googleapis.com/translate_a/single?client=gtx"
           "&sl=en&tl=th&dt=t&q=" + urllib.parse.quote(w))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
        seg = data[0][0][0] if data and data[0] else ""
        if not seg or seg.strip().lower() == w:
            alt = data[5] if len(data) > 5 and data[5] else None
            if alt:
                seg = alt[0][1][0] if alt[0][1] else seg
        return w, (seg or "").strip()
    except Exception as e:
        if attempt < 4:
            time.sleep(min(2 ** attempt, 8) + random.uniform(0.3, 1.5))
            return translate_one(w, attempt + 1)
        return w, ""

f = open(OUT, "a", encoding="utf-8")
ok = fail = 0
t0 = time.time()
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futs = {ex.submit(translate_one, w): w for w in pending}
    done_count = len(done)
    for i, fut in enumerate(as_completed(futs), 1):
        w, th = fut.result()
        if th:
            ok += 1
        else:
            fail += 1
        f.write(json.dumps({"w": w, "th": th}, ensure_ascii=False) + "\n")
        f.flush()
        if i % 100 == 0:
            el = time.time() - t0
            print(f"[{i}/{len(pending)}] ok={ok} fail={fail} elapsed={el:.0f}s "
                  f"rate={i/el:.1f}/s", flush=True)
f.close()
print(f"DONE ok={ok} fail={fail} total_seconds={time.time()-t0:.0f}")