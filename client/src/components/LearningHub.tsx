import { useMemo, useState } from "react";
import { BookPlus, Brain, Check, Loader2, Search, Sparkles, Volume2 } from "lucide-react";
import { learningHub, type LearningHubMode, type LearningHubResult } from "@/lib/mistral";
import { simpleMarkdown } from "@/components/AiTutor";
import type { VocabularyWord } from "@/hooks/useVocabulary";

type Props = { apiKey: string; words: VocabularyWord[]; level: "beginner" | "elementary" | "intermediate"; onAddWord: (word: VocabularyWord) => void };
const modes: { id: LearningHubMode; label: string; icon: string }[] = [
  { id: "auto", label: "ช่วยฉันเลือก", icon: "✦" },
  { id: "lookup", label: "ค้นหาคำ", icon: "⌕" },
  { id: "explain", label: "อธิบายคำ/แกรมมาร์", icon: "?" },
  { id: "translate", label: "แปลตามบริบท", icon: "↔" },
  { id: "wordset", label: "สร้างชุดคำ", icon: "▦" },
  { id: "quiz", label: "สร้างแบบฝึกหัด", icon: "✓" },
];

function speak(text: string) { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } }

export function LearningHub({ apiKey, words, level, onAddWord }: Props) {
  const [mode, setMode] = useState<LearningHubMode>("auto");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LearningHubResult | null>(null);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const recentWords = useMemo(() => words.slice(0, 8).map((w) => ({ w: w.w, th: w.th })), [words]);
  const run = async () => {
    if (!apiKey) { setError("กรุณาใส่ Mistral API key ในปุ่มตั้งค่า AI ก่อน"); return; }
    setLoading(true); setError(""); setChosen({});
    try { setResult(await learningHub({ apiKey }, mode, prompt, { level, recentWords })); } catch (e) { setError(e instanceof Error ? e.message : "AI ยังไม่พร้อม ลองใหม่อีกครั้ง"); } finally { setLoading(false); }
  };
  const addWord = (item: { word: string; meaning: string; pos?: string }) => { const found = words.find((w) => w.w.toLowerCase() === item.word.toLowerCase()); if (found) onAddWord(found); else setError(`คำว่า ${item.word} ยังไม่มีในคลังหลัก — คุณยังใช้เป็นคำค้นจาก AI ได้`); };
  return <section className="learning-hub">
    <div className="hub-heading"><div><span className="eyebrow">AI LEARNING HUB</span><h2><Sparkles size={22} /> ถามอะไรก็เรียนต่อได้</h2><p>พิมพ์ภาษาไทยได้เลย เช่น “อยากพูดอังกฤษที่ร้านอาหาร” หรือ “คำว่าเก่งขึ้นใช้คำไหน”</p></div><div className="hub-badge"><Brain size={17} /> AI ช่วยวางทางเรียน</div></div>
    <div className="hub-modes">{modes.map((item) => <button key={item.id} className={mode === item.id ? "active" : ""} onClick={() => setMode(item.id)}><b>{item.icon}</b>{item.label}</button>)}</div>
    <div className="hub-input"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void run(); }} placeholder="พิมพ์สิ่งที่อยากเรียน..." rows={3} /><button className="button-primary" onClick={() => void run()} disabled={loading}>{loading ? <><Loader2 className="spin" size={17} /> กำลังคิด...</> : <><Search size={17} /> ให้ AI ช่วย</>}</button></div>
    {error && <div className="data-notice">{error}</div>}
    {result && !loading && <div className="hub-result"><div className="hub-result-head"><div><span className="eyebrow">AI LESSON</span><h3>{result.title}</h3><p>{result.summary}</p></div><button className="icon-button" title="อ่านออกเสียง" onClick={() => speak(`${result.title}. ${result.answer}`)}><Volume2 size={17} /></button></div>
      {result.answer && <div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(result.answer) }} />}
      {result.words.length > 0 && <div className="hub-section"><h4>คำที่ควรรู้</h4><div className="hub-word-grid">{result.words.map((item) => <article className="hub-word" key={`${item.word}-${item.meaning}`}><div><strong>{item.word}</strong><span>{item.pos || "word"} · {item.meaning}</span>{item.example && <small>{item.example}</small>}</div><div className="hub-word-actions"><button title="ฟังเสียง" onClick={() => speak(item.word)}><Volume2 size={15} /></button><button title="เพิ่มเข้าทบทวน" onClick={() => addWord(item)}><BookPlus size={15} /></button></div></article>)}</div></div>}
      {result.examples.length > 0 && <div className="hub-section"><h4>ตัวอย่างการใช้</h4><div className="hub-examples">{result.examples.map((item) => <div key={item.en}><strong>{item.en}</strong><span>{item.th}</span></div>)}</div></div>}
      {result.exercise.length > 0 && <div className="hub-section"><h4>ลองทำทันที</h4>{result.exercise.map((item, index) => { const answer = chosen[index]; const checked = answer !== undefined; return <div className="hub-exercise" key={`${item.question}-${index}`}><strong>{index + 1}. {item.question}</strong><div>{item.choices.map((choice, choiceIndex) => <button key={choice} className={checked && choiceIndex === item.answer ? "correct" : checked && answer === choiceIndex ? "wrong" : ""} onClick={() => setChosen((current) => ({ ...current, [index]: choiceIndex }))}>{choice}</button>)}</div>{checked && <small><Check size={14} /> {answer === item.answer ? "ถูกต้อง — " : "ลองทบทวนอีกครั้ง — "}{item.explanation}</small>}</div>; })}</div>}
    </div>}
  </section>;
}
