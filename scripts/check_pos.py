# -*- coding: utf-8 -*-
import json
src = open("data/words.js", encoding="utf-8").read()
vocab = json.loads(src.split("=", 1)[1].rstrip(";"))
want = ["apple","teacher","computer","higher","larger","worker","knowledge",
        "language","better","older","water","runner","beautiful","yesterday",
        "money","pour","stupid","solution","family","company"]
for x in vocab:
    if x["w"] in want:
        print(f"{x['w']:<12} {x['pos']:<6} {x['ipa']:<12} {x['th_ipa']:<14} {x['th']}")