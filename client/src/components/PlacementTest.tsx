/** Placement test with automatic 7-day plan: helps new learners know where to start. */
import { useState } from "react";
import { ArrowUpRight, CalendarCheck, Check, Compass, Loader2, RotateCcw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { simpleMarkdown } from "@/components/AiTutor";
import { buildSevenDayPlan, generatePlacementTest, interpretScore, type MistralConfig } from "@/lib/mistral";
import type { VocabularyWord } from "@/hooks/useVocabulary";

const KEY_STORAGE = "englishvocab-placement-v1";
const PLAN_STORAGE = "englishvocab-seven-day-plan-v1";

interface PlacementRecord { score: number; total: number; level: "beginner" | "elementary" | "intermediate"; takenAt: string }

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function PlacementTest({ words, apiKey, onStartWords }: { words: VocabularyWord[]; apiKey: string; onStartWords: (word: VocabularyWord) => void }) {
  const [record, setRecord] = useState<PlacementRecord | null>(() => stored<PlacementRecord | null>(KEY_STORAGE, null));
  const [taking, setTaking] = useState(false);
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<{ en: string; thQuestion: string; choices: string[]; correct: number; explain: string }[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(() => localStorage.getItem(PLAN_STORAGE));
  const [planLoading, setPlanLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [startedPlan, setStartedPlan] = useState(false);

  const config: MistralConfig = { apiKey, model: "mistral-large-latest" };
  const recentWords = words.slice(0, 12);

  async function begin() {
    if (!apiKey) { toast("กรุณาใส่ Mistral API key ก่อน (กดปุ่มรูปประแจ)", { description: "แบบทดสอบใช้ AI สร้างคำถามที่เหมาะกับผู้เรียนไทย" }); return; }
    setLoading(true); setError(null);
    try {
      const { questions: qs } = await generatePlacementTest(config);
      setQuestions(qs); setAnswers(new Array(qs.length).fill(null));
      setTaking(true); setRevealed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างแบบทดสอบไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  function answer(choice: number) {
    setAnswers(current => current.map((a, i) => (i === index ? choice : a)));
    setRevealed(true);
  }

  function next() {
    if (index + 1 < questions.length) { setIndex(index + 1); setRevealed(false); return; }
    const score = answers.reduce((sum, a, i) => (a === questions[i]?.correct ? sum + 1 : sum), 0);
    const result = interpretScore(score, questions.length);
    const newRecord: PlacementRecord = { score, total: questions.length, level: result.level, takenAt: new Date().toISOString() };
    localStorage.setItem(KEY_STORAGE, JSON.stringify(newRecord));
    setRecord(newRecord); setTaking(false);
    toast(`ทำแบบทดสอบเสร็จแล้ว — ${result.title}`);
  }

  async function generatePlan() {
    if (!record) return;
    setPlanLoading(true);
    try {
      const planText = await buildSevenDayPlan(config, record.level, recentWords);
      localStorage.setItem(PLAN_STORAGE, planText);
      setPlan(planText);
      toast("AI จัดแผน 7 วันให้เรียบร้อยแล้ว");
    } catch (e) {
      toast(e instanceof Error ? e.message : "สร้างแผนไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setPlanLoading(false);
    }
  }

  function startRecommended() {
    if (!startedPlan) {
      // Schedule the first-day words into the review plan so learning starts immediately
      recentWords.slice(0, 7).forEach((word) => onStartWords(word));
      setStartedPlan(true);
      toast("เพิ่มคำศัพท์วันแรกเข้ารอบทบทวนแล้ว");
    }
  }

  if (taking && questions.length) {
    const q = questions[index];
    const chosen = answers[index];
    const correct = chosen === q.correct;
    return <section className="placement-shell">
      <div className="placement-head"><span className="eyebrow">PLACEMENT TEST · {index + 1}/{questions.length}</span><h2>แบบทดสอบวัดระดับ</h2></div>
      <div className="placement-progress"><i style={{ width: `${(index + 1) / questions.length * 100}%` }} /></div>
      <article className="placement-card"><div className="placement-question"><span className="question-en">{q.en}</span><button className="sound-word" onClick={() => speak(q.en.replace("____", ""))} title="ฟังประโยค"><Volume2 size={15} /></button><span className="question-th">{q.thQuestion}</span></div>
        <div className="placement-choices">{q.choices.map((choice, i) => <button key={i} className={`placement-choice ${chosen === i ? "chosen" : ""} ${revealed && i === q.correct ? "correct" : ""} ${revealed && chosen === i && !correct ? "wrong" : ""}`} onClick={() => !revealed && answer(i)}>{choice}</button>)}</div>
        {revealed && <div className="placement-feedback"><p className={correct ? "good" : "bad"}>{correct ? "ถูกแล้ว เก่งมาก!" : `คำตอบที่ถูกคือ "${q.choices[q.correct]}"`}</p>{q.explain && <span className="explain">{q.explain}</span>}</div>}
        <div className="placement-next"><button className="button-primary" disabled={!revealed} onClick={next}>{index + 1 < questions.length ? "ข้อถัดไป" : "ดูผลและแผน 7 วัน"} <ArrowUpRight size={16} /></button></div>
      </article>
    </section>;
  }

  return <section className="placement-shell">
    <div className="placement-head"><span className="eyebrow">FIND YOUR START · 2 นาที</span><h2>ไม่รู้จะเริ่มตรงไหน? ทดสอบก่อนได้</h2><p>ตอบ 10 ข้อ ระบบจะบอกทันทีว่าคุณควรเริ่มจากจุดไหน และจัดแผนเรียน 7 วันให้อัตโนมัติ</p><div className="placement-actions"><button className="ai-button" disabled={loading} onClick={begin}>{loading ? <><Loader2 size={15} className="spin" /> กำลังเตรียมคำถาม...</> : <><Compass size={15} /> เริ่มวัดระดับ</>}</button>{record && <button className="text-button" onClick={() => { localStorage.removeItem(KEY_STORAGE); localStorage.removeItem(PLAN_STORAGE); setRecord(null); setPlan(null); setStartedPlan(false); }}><RotateCcw size={14} /> ทำใหม่อีกครั้ง</button>}</div></div>
    {error && <div className="ai-error">{error}</div>}
    {record && (
      <div className="placement-result">
        <div className="result-score"><span className="eyebrow">ผลของคุณ</span><strong>{record.score}/{record.total}</strong><em>{interpretScore(record.score, record.total).title}</em></div>
        <p className="result-advice">{interpretScore(record.score, record.total).advice}</p>
        {!plan && <button className="ai-button" disabled={planLoading} onClick={generatePlan}>{planLoading ? <><Loader2 size={15} className="spin" /> AI กำลังจัดแผน...</> : <><CalendarCheck size={15} /> จัดแผนเรียน 7 วันให้อัตโนมัติ</>}</button>}
        {plan && !startedPlan && <button className="starter-complete" onClick={startRecommended}><Check size={16} /> เริ่มจากคำศัพท์ที่ AI เลือกให้ (เพิ่มเข้ารอบทบทวน)</button>}
        {plan && <div className="ai-result"><div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(plan) }} /></div>}
      </div>
    )}
    {!record && !taking && (
      <div className="placement-empty"><span className="eyebrow">HOW IT WORKS</span><p>แบบทดสอบสร้างใหม่ทุกครั้งที่ทำ ด้วย AI ที่เข้าใจผู้เรียนไทย — คำถามเริ่มจากง่ายมากแล้วค่อย ๆ ยากขึ้น ไม่ต้องกลัวทำผิด ข้อผิดคือข้อมูลที่ช่วยให้ AI จัดแผนที่เหมาะกับคุณ</p></div>
    )}
  </section>;
}

function stored<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; } }

export default PlacementTest;
