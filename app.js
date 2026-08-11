/* ===== คลังคำศัพท์ภาษาอังกฤษ — app.js ===== */
"use strict";

const VOCAB = (window.VOCAB || []).map((x, i) => ({ ...x, _i: i }));
const POS_TH = { noun:"คำนาม", verb:"คำกริยา", adj:"คำคุณศัพท์", adv:"คำกริยาวิเศษณ์",
  prep:"คำบุพบท", pron:"คำสรรพนาม", conj:"คำสันธาน", det:"คำกำหนด", aux:"กริยาช่วย",
  interj:"คำอุทาน", other:"อื่น ๆ" };

const $ = (id) => document.getElementById(id);
const state = {
  q:"", pos:"", letter:"", len:"", sort:"alpha", favs:new Set(JSON.parse(localStorage.getItem("ev_favs")||"[]")),
  onlyFavs:false, page:150, shown:150,
};
const PAGESIZE = 150;
let builderPreset = null;

/* ---------- helpers ---------- */
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2200); }
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function posClass(p){ return p && POS_TH[p] ? p : "other"; }
function posLabel(p){ return POS_TH[p] || "อื่น ๆ"; }
function speak(text, lang){ try{ const u=new SpeechSynthesisUtterance(text); u.lang=lang||"en-US"; u.rate=0.92;
  const vs=speechSynthesis.getVoices(); const v=vs.find(x=>x.lang && x.lang.toLowerCase().startsWith((lang||"en-US").slice(0,2).toLowerCase()) && x.localService);
  if(v) u.voice=v; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){ toast("ไม่สามารถเล่นเสียงได้"); } }

/* ---------- statistics ---------- */
function statbar(){
  const f = filtered();
  $("statbar").textContent = `📚 ทั้งหมด ${VOCAB.length.toLocaleString()} คำ · รายการที่เห็น ${f.length.toLocaleString()} คำ · ⭐ บันทึกแล้ว ${state.favs.size} คำ`;
}

/* ---------- filtering ---------- */
function filtered(){
  const q = state.q.trim().toLowerCase().replace(/\s+/g,"");
  let list = VOCAB.filter(x => {
    if(state.onlyFavs && !state.favs.has(x.w)) return false;
    if(state.pos && x.pos !== state.pos) return false;
    if(state.letter && x.w[0].toUpperCase() !== state.letter) return false;
    if(state.len){ const n=x.w.length; const [a,b]=state.len.split("-").map(Number);
      if(b){ if(!(n>=a&&n<=b)) return false; } else if(n<a) return false; }
    if(q){ const hay = (x.w+x.ipa+x.th_ipa+x.th).toLowerCase().replace(/[^a-z\u0e00-\u0e7f]/g,"");
      if(!hay.includes(q)) return false; }
    return true;
  });
  if(state.sort==="alpha") list.sort((a,b)=>a.w.localeCompare(b.w));
  else if(state.sort==="random") list = [...list].sort(()=>Math.random()-0.5);
  else list.sort((a,b)=>a._i-b._i);
  return list;
}

/* ---------- render ---------- */
function renderLetters(){
  const bar=$("letterbar"); bar.innerHTML="";
  const all=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  all.forEach(L=>{
    const d=document.createElement("div"); d.className="lch"+(state.letter===L?" on":""); d.textContent=L;
    d.onclick=()=>{ state.letter = state.letter===L ? "" : L; renderLetters(); resetList(); };
    bar.appendChild(d);
  });
}

function renderList(append){
  const list = filtered();
  if(!append){ state.shown = PAGESIZE; $("wordlist").innerHTML=""; $("resultinfo").textContent =
    `พบ ${list.length.toLocaleString()} คำ${state.q?` · ค้นหา: "${state.q}"`:""}`; }
  const slice = list.slice(0, state.shown);
  const wrap = $("wordlist"); const frag=document.createDocumentFragment();
  slice.forEach(x=>{
    const row=document.createElement("div"); row.className="wordrow";
    row.innerHTML = `
      <div class="wr-main">
        <span class="wr-word">${esc(x.w)}</span>
        <div class="wr-ipa">${esc(x.ipa||"")}</div>
      </div>
      <span class="pos ${posClass(x.pos)}">${posLabel(x.pos)}</span>
      <div class="wr-thai">${esc(x.th_ipa||"")}</div>
      <div class="wr-meaning">${esc(x.th||"—")}</div>
      <span class="speaker" data-act="spk" title="ฟังเสียง">🔊</span>
      <span class="wr-star ${state.favs.has(x.w)?"on":""}" data-act="fav" title="บันทึก">${state.favs.has(x.w)?"★":"☆"}</span>`;
    row.onclick=(e)=>{ const a=e.target.dataset&&e.target.dataset.act;
      if(a==="spk"){ e.stopPropagation(); speak(x.w); }
      else if(a==="fav"){ e.stopPropagation(); toggleFav(x.w); renderList(true); statbar(); }
      else openModal(x); };
    frag.appendChild(row);
  });
  wrap.appendChild(frag);
  $("btn-more").style.display = list.length > state.shown ? "" : "none";
}
function resetList(){ renderList(false); }
function toggleFav(w){ state.favs.has(w)?state.favs.delete(w):state.favs.add(w); localStorage.setItem("ev_favs", JSON.stringify([...state.favs])); }

/* ---------- modal ---------- */
let modalWord=null;
function openModal(x){
  modalWord=x;
  $("modal-body").innerHTML=`
    <div class="modal-word">${esc(x.w)}</div>
    <div class="modal-ipa">${esc(x.ipa||"")} · <span class="pos ${posClass(x.pos)}">${posLabel(x.pos)}</span></div>
    <div class="modal-thai">${esc(x.th_ipa||"")}</div>
    <div class="modal-meaning">${esc(x.th||"—")}</div>`;
  $("modal").classList.remove("hidden");
}
$("modal-close").onclick=()=>$("modal").classList.add("hidden");
$("modal").addEventListener("click",e=>{ if(e.target===$("modal")) $("modal").classList.add("hidden"); });
$("modal-speak").onclick=()=>modalWord&&speak(modalWord.w);
$("modal-fav").onclick=()=>{ if(modalWord){ toggleFav(modalWord.w); toast(modalWord.w+" บันทึกแล้ว ⭐"); renderList(true); statbar(); } };
$("modal-use").onclick=()=>{ builderPreset=modalWord; $("modal").classList.add("hidden");
  switchTab("builder"); toast("พร้อมแล้ว — กด slot ในประโยคเพื่อเลือกคำนี้"); };

/* ---------- flashcards ---------- */
let deck=[], deckIdx=0;
function buildDeck(){
  const mode=$("card-mode").value; let src=[];
  if(mode==="favs") src=[...VOCAB].filter(x=>state.favs.has(x.w));
  else if(mode==="random20"||mode==="random50"){ const n=mode==="random20"?20:50; src=[...VOCAB].sort(()=>Math.random()-0.5).slice(0,n); }
  else src=filtered();
  deck=[...src].sort(()=>Math.random()-0.5); deckIdx=0;
  if(!deck.length){ toast("ไม่มีคำในกองนี้ ลองเปลี่ยนโหมด"); return; }
  showCard();
}
function showCard(){
  if(deckIdx>=deck.length){ $("cardword").innerHTML=`<div class="cw-word" style="margin-top:60px">🎉</div><div class="cw-thai">จำครบแล้ว!</div><p class="hint">กด "สับไพ่" หรือเปลี่ยนโหมดเพื่อเล่นใหม่</p>`;
    $("card-progress").textContent=""; return; }
  const x=deck[deckIdx];
  $("cardword").innerHTML=`<div class="front"><div class="cw-word">${esc(x.w)}</div><div class="cw-ipa">${esc(x.ipa||"")}</div><button class="btn small ghost" id="card-speak">🔊 ฟังเสียง</button></div><div class="back hidden"><div class="cw-thai">${esc(x.th_ipa||"")}</div><div class="cw-read">${esc(x.th||"—")}</div></div>`;
  $("card-speak").onclick=(e)=>{ e.stopPropagation(); speak(x.w); };
  $("card-progress").textContent=`กอง: ${deck.length} คำ · ใบที่ ${deckIdx+1}`;
}
$("cardword").onclick=()=>{ const b=$("cardword").querySelector(".back"); if(b){ b.classList.toggle("hidden"); if(!b.classList.contains("hidden")) speak(deck[deckIdx]&&deck[deckIdx].w); } };
$("card-yes").onclick=()=>{ deck.splice(deckIdx,1); showCard(); };
$("card-no").onclick=()=>{ const x=deck.splice(deckIdx,1)[0]; deck.push(x); showCard(); };
$("card-shuffle").onclick=buildDeck;
$("card-mode").onchange=buildDeck;

/* ---------- sentence builder ---------- */
const PATTERNS=[
 "I like {n}.",
 "I can {v} {n} every day.",
 "They will {v} a new {n} tomorrow.",
 "She is a {adj} {n}.",
 "The {adj} {n} is very {adj}.",
 "We need more {np} for our {n}.",
 "You should {v} {adj} {n}.",
 "This {n} is {adj} and useful.",
 "He wants to {v} {n} today.",
 "My {n} is important to me.",
 "There are many {np} in the world.",
 "I want to visit a {adj} {n}.",
 "Many {np} are {adj} and {adj}.",
 "She can {v} {n} very {adv}.",
 "We should try to {v} {n} together.",
 "I see a {adj} {n} near the {n}.",
];
const IRREG_PL={man:"men",woman:"women",child:"children",person:"people",foot:"feet",tooth:"teeth",mouse:"mice",fish:"fish",sheep:"sheep",deer:"deer",life:"lives",knife:"knives",wife:"wives",leaf:"leaves",half:"halves",self:"selves"};
function plural(w){ if(IRREG_PL[w]) return IRREG_PL[w];
  if(/(s|x|z|ch|sh)$/.test(w)) return w+"es";
  if(/[^aeiou]y$/.test(w)) return w.slice(0,-1)+"ies";
  if(/[^aeiou]o$/.test(w)) return w+"es";
  return w+"s"; }
const SLOT_POS={n:"noun",np:"noun",v:"verb",adj:"adj",adv:"adv"};
const bp={text:"", slots:[]};
function builderInit(){
  const sel=$("bp-pattern"); sel.innerHTML=PATTERNS.map((p,i)=>`<option value="${i}">${esc(p)}</option>`).join("");
  sel.onchange=()=>builderLoad(PATTERNS[+sel.value]);
  builderLoad(PATTERNS[0]);
}
function builderLoad(p){
  bp.text=p; bp.slots=[]; const m=p.match(/\{[a-z]+\}/g)||[];
  m.forEach((tok,i)=>bp.slots.push({tok, word:null, custom:false}));
  renderSentence();
}
function renderSentence(){
  let html=""; let si=0;
  const parts=bp.text.split(/(\{[a-z]+\})/g);
  parts.forEach(part=>{
    const m=part.match(/^\{([a-z]+)\}$/);
    if(m){
      const s=bp.slots[si++];
      const label = (s && s.word) ? (s.tok==="{np}"?plural(s.word):s.word) : part;
      html+=`<span class="slot" data-si="${si-1}">${esc(label)}</span>`;
    } else html+=esc(part);
  });
  $("bp-sentence").innerHTML=html;
  document.querySelectorAll("#bp-sentence .slot").forEach(el=>{
    el.onclick=()=>openPicker(+el.dataset.si);
  });
}
function slotPos(s){ return SLOT_POS[String(s.tok).replace(/[{}]/g,"")]; }
function openPicker(si){
  const s=bp.slots[si]; const p=$("bp-picker"); p.classList.remove("hidden");
  const pos=slotPos(s);
  let pool=VOCAB.filter(x=>x.pos===pos && x.th);
  if(!pool.length) pool=VOCAB.filter(x=>x.th);
  const opts=[...pool].sort(()=>Math.random()-0.5).slice(0,10);
  let html=`<div style="font-weight:700;margin-bottom:6px">เลือกคำ${posLabel(pos)} (${s.tok}):</div>
    <input id="pick-input" placeholder="พิมพ์คำเอง แล้วกด Enter..." style="width:100%;padding:8px;border:1px solid #dce3ea;border-radius:8px;margin-bottom:8px">`;
  if(builderPreset && builderPreset.pos===pos){ const w=builderPreset;
    html+=`<div class="picker-item" data-w="${esc(w.w)}" style="background:#fffbeb"><span class="p-w">⭐ ${esc(w.w)}</span><span class="p-m">${esc(w.th)}</span></div>`;
    builderPreset=null; }
  opts.forEach(x=>{ html+=`<div class="picker-item" data-w="${esc(x.w)}"><span class="p-w">${esc(x.w)}</span><span class="p-m">${esc(x.th)}</span></div>`; });
  p.innerHTML=html;
  p._si=si;
  const inp=$("pick-input"); inp.focus();
  inp.onkeydown=e=>{ if(e.key==="Enter"&&inp.value.trim()){ bp.slots[si].word=inp.value.trim().toLowerCase(); closePicker(); renderSentence(); } };
  p.querySelectorAll(".picker-item").forEach(el=>el.onclick=()=>{
    bp.slots[si].word=el.dataset.w; closePicker(); renderSentence(); });
}
function closePicker(){ const p=$("bp-picker"); p.classList.add("hidden"); }
$("bp-picker").onclick=null;
function currentSentence(){
  let out=""; const parts=bp.text.split(/(\{[a-z]+\})/g);
  let si=0;
  for(const part of parts){
    const m=part.match(/^\{([a-z]+)\}$/);
    if(m){ const s=bp.slots[si++];
      if(s && s.word){ out+= s.tok==="{np}"?plural(s.word):s.word; }
      else out+=part; }
    else out+=part;
  }
  return out.replace(/\s+/g," ").trim();
}
$("bp-rand").onclick=()=>{ bp.slots.forEach(s=>{
  if(s.custom) return;
  let pool=VOCAB.filter(x=>x.pos===slotPos(s)&&x.th);
  if(!pool.length) pool=VOCAB.filter(x=>x.th);
  s.word=pool[Math.floor(Math.random()*pool.length)].w;
}); renderSentence(); };
$("bp-speak").onclick=()=>speak(currentSentence());
$("bp-translate").onclick=async ()=>{ const s=currentSentence(); if(!s||s.includes("{")||s.includes("}")){ toast("เติมคำในช่อง [] ให้ครบก่อน"); return; }
  $("bp-result").innerHTML="⏳ กำลังแปล..."; const r=await translateText(s,"en","th");
  $("bp-result").innerHTML=`<div class="translate-result">${esc(r)}</div>`; };
$("bp-copy").onclick=()=>{ const s=currentSentence(); navigator.clipboard.writeText(s).then(()=>toast("คัดลอกแล้ว 📋")); };

/* ---------- translator ---------- */
let trDir="en2th";
async function translateText(text, sl, tl){
  try{
    const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
    if(!r.ok) throw 0;
    const j=await r.json();
    if(j&&j[0]) return j[0].map(s=>s[0]).join("");
    throw 0;
  }catch(e){
    try{
      const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`);
      if(!r.ok) throw 0; const j=await r.json();
      if(j.responseData&&j.responseData.translatedText) return j.responseData.translatedText;
      throw 0;
    }catch(e2){ return "❌ แปลไม่สำเร็จ (ต้องเชื่อมต่ออินเทอร์เน็ต)"; }
  }
}
$("tr-swap").onclick=()=>{ trDir=trDir==="en2th"?"th2en":"en2th";
  $("tr-dir").textContent=trDir==="en2th"?"อังกฤษ → ไทย":"ไทย → อังกฤษ"; };
$("tr-go").onclick=async ()=>{
  const txt=$("tr-input").value.trim(); if(!txt) return;
  const [sl,tl]=trDir==="en2th"?["en","th"]:["th","en"];
  $("tr-output").innerHTML="⏳ กำลังแปล...";
  const out=await translateText(txt,sl,tl);
  $("tr-output").innerHTML=`<div class="translate-result">${esc(out)}</div>`;
};
$("tr-speak").onclick=()=>{ const t=$("tr-output").textContent.trim().replace(/^⏳.*$/,""); if(t) speak(t, trDir==="en2th"?"th-TH":"en-US"); };
$("tr-copy").onclick=()=>{ const t=$("tr-output").textContent.trim(); if(t) navigator.clipboard.writeText(t).then(()=>toast("คัดลอกแล้ว 📋")); };
$("tr-input").addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter") $("tr-go").click(); });

/* ---------- tabs ---------- */
function switchTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id==="tab-"+name));
  if(name==="cards"&&!deck.length) buildDeck();
  if(name==="builder") renderSentence();
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

/* ---------- wiring ---------- */
$("search").addEventListener("input",e=>{ state.q=e.target.value; resetList(); statbar(); });
$("f-pos").onchange=e=>{ state.pos=e.target.value; state.onlyFavs=false; $("btn-fav").classList.remove("on"); resetList(); statbar(); };
$("f-len").onchange=e=>{ state.len=e.target.value; resetList(); statbar(); };
$("f-sort").onchange=e=>{ state.sort=e.target.value; resetList(); statbar(); };
$("btn-fav").onclick=()=>{ state.onlyFavs=!state.onlyFavs; $("btn-fav").classList.toggle("on",state.onlyFavs); resetList(); statbar(); };
$("btn-reset").onclick=()=>{ Object.assign(state,{q:"",pos:"",letter:"",len:"",sort:"alpha",onlyFavs:false});
  $("search").value=""; $("f-pos").value=""; $("f-len").value=""; $("f-sort").value="alpha"; $("btn-fav").classList.remove("on");
  renderLetters(); resetList(); statbar(); };
$("btn-more").onclick=()=>{ state.shown+=PAGESIZE; renderList(true); };
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ $("modal").classList.add("hidden"); closePicker(); }
  if(e.key==="/"&&document.activeElement!==$("search")){ e.preventDefault(); $("search").focus(); } });

/* ---------- init ---------- */
if(!VOCAB.length){ $("statbar").textContent="⚠️ ยังไม่พบข้อมูลคำศัพท์ (data/words.js)"; }
else{
  statbar(); renderLetters(); renderList(); builderInit();
  if("speechSynthesis" in window){ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices(); }
}