import { useMemo, useState } from "react";
import { Check, Headphones, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import type { VocabularyWord } from "@/hooks/useVocabulary";
import type { SrsStore } from "@/lib/srs";

const todayKey = () => new Date().toISOString().slice(0, 10);

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

export function DailyStarter({ words, store, onStart }: { words: VocabularyWord[]; store: SrsStore; onStart: () => void }) {
  const lessonWords = useMemo(() => words.filter((word) => !store[word.w.toLowerCase()]).slice(0, 5), [words, store]);
  const target = lessonWords[0];
  const options = useMemo(() => {
    if (!target) return [];
    return [target, ...lessonWords.slice(1, 4)].sort(() => 0.5 - Math.random());
  }, [target, lessonWords]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const completed = localStorage.getItem(`englishvocab-daily-starter-${todayKey()}`) === "done";
  const correct = checked && answer === target?.w;

  if (!target) return null;

  const finish = () => {
    localStorage.setItem(`englishvocab-daily-starter-${todayKey()}`, "done");
    setChecked(true);
  };

  return <section className="daily-starter">
    <div className="starter-head"><div><span className="eyebrow">BEGINNER PATH · 10 MINUTES</span><h2>เริ่มจากศูนย์ได้ทุกวัน</h2><p>ทำทีละขั้น ไม่ต้องรู้มาก่อน วันนี้ขอแค่ 5 คำก็พอ</p></div><span className="starter-badge"><Sparkles size={16} /> {completed ? "ทำแล้ววันนี้" : "บทเรียนวันนี้"}</span></div>
    <div className="starter-steps">
      <article className="starter-step"><span>01</span><div><strong>ฟังและพูดตาม</strong><p>กดปุ่มเสียง แล้วออกเสียงตาม 2 รอบ</p><div className="starter-words">{lessonWords.map((word) => <button key={word.w} className="sound-word" onClick={() => speak(word.w)}><Volume2 size={14} />{word.w}</button>)}</div></div><Headphones size={20} /></article>
      <article className="starter-step"><span>02</span><div><strong>จำความหมายจากบริบท</strong><p>อ่านคำแปล แล้วนึกประโยคของตัวเองหนึ่งประโยค</p><button className="button-primary starter-action" onClick={onStart}>เริ่มบัตรคำ <RotateCcw size={16} /></button></div></article>
      <article className="starter-step quiz-step"><span>03</span><div><strong>เช็กความเข้าใจ</strong><p>คำว่า <b>{target.w}</b> แปลว่าอะไร?</p><div className="starter-options">{options.map((word) => <button key={word.w} className={checked && word.w === target.w ? "correct" : checked && answer === word.w ? "wrong" : answer === word.w ? "chosen" : ""} onClick={() => { setAnswer(word.w); setChecked(false); }}>{word.th}</button>)}</div>{answer && !checked && <button className="text-button" onClick={() => setChecked(true)}>ตรวจคำตอบ <Check size={16} /></button>}{checked && <p className={correct ? "quiz-feedback good" : "quiz-feedback bad"}>{correct ? "ถูกต้อง เก่งมาก!" : `คำตอบคือ ${target.th} ลองทบทวนอีกครั้งนะ`}</p>}</div></article>
    </div>
    {!completed && checked && correct && <button className="starter-complete" onClick={finish}><Check size={17} /> บันทึกว่าทำบทเรียนวันนี้แล้ว</button>}
  </section>;
}

export default DailyStarter;

export function speakVocabulary(text: string) { speak(text); }
