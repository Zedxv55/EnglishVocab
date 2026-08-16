/** Scenario Lab: real-life role-play lessons + AI sentence correction for writing practice. */
import { useMemo, useState } from "react";
import { BookOpen, Loader2, PenLine, SendHorizontal, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { simpleMarkdown } from "@/components/AiTutor";
import { buildScenarioLesson, correctSentence, type MistralConfig, type ProficiencyLevel } from "@/lib/mistral";
import type { VocabularyWord } from "@/hooks/useVocabulary";

const SITUATIONS: { id: string; label: string; emoji: string }[] = [
  { id: "สั่งอาหารและกาแฟ", label: "สั่งอาหารและกาแฟ", emoji: "Coffee" },
  { id: "เช็คอินโรงแรม", label: "เช็คอินโรงแรม", emoji: "Bed" },
  { id: "เดินทางและถามทาง", label: "เดินทางและถามทาง", emoji: "Train" },
  { id: "ทักทายเพื่อนใหม่", label: "ทักทายเพื่อนใหม่", emoji: "Handshake" },
  { id: "ซื้อของและต่อรองราคา", label: "ซื้อของและต่อรองราคา", emoji: "ShoppingBag" },
  { id: "ที่ทำงานและการสัมภาษณ์เบื้องต้น", label: "ที่ทำงานและการสัมภาษณ์เบื้องต้น", emoji: "Briefcase" },
  { id: "พบหมอและร้านยา", label: "พบหมอและร้านยา", emoji: "Stethoscope" },
  { id: "โทรศัพท์และแชทเบื้องต้น", label: "โทรศัพท์และแชทเบื้องต้น", emoji: "Phone" },
];

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

function extractEnglishLines(text: string): string[] {
  // Lines that start with an English letter (dialogue lines) — good for listening practice
  return text.split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Z]/.test(line) && line.length < 140 && /[a-zA-Z]/.test(line))
    .map((line) => line.replace(/^([AB])[\s.:)\]–-]*/, "").replace(/[\[(].*?[\])]/g, "").trim())
    .filter((line) => line.length > 2 && /^[A-Za-z]/.test(line))
    .slice(0, 8);
}

export function ScenarioLab({ words, apiKey, level }: { words: VocabularyWord[]; apiKey: string; level: ProficiencyLevel }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: MistralConfig = { apiKey, model: "mistral-large-latest" };
  const recentWords = words.slice(0, 12);

  async function openSituation(id: string) {
    if (!apiKey) { toast("กรุณาใส่ Mistral API key ก่อน (กดปุ่มรูปประแจ)", { description: "บทเรียนสถานการณ์สร้างโดย AI" }); return; }
    setChosen(id); setLoading(true); setError(null); setLesson(null);
    try {
      const text = await buildScenarioLesson(config, id, level);
      setLesson(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างบทเรียนไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const listenLines = useMemo(() => (lesson ? extractEnglishLines(lesson) : []), [lesson]);

  return <section className="scenario-shell">
    <div className="scenario-head"><span className="eyebrow">REAL LIFE · PRACTICE ON THE SPOT</span><h2>ฝึกใช้จริงในสถานการณ์</h2><p>เลือกสถานการณ์ที่คุณจะใช้จริง ระบบจะสร้างบทสนทนา คำที่ต้องจำ และท่าฝึกพูดให้ทันที</p></div>
    <div className="scenario-grid">{SITUATIONS.map((s) => <button key={s.id} className={`scenario-card ${chosen === s.id ? "chosen" : ""}`} onClick={() => openSituation(s.id)}><span className="scenario-emoji">{s.emoji}</span><strong>{s.label}</strong></button>)}</div>
    {error && <div className="ai-error">{error}</div>}
    {loading && <div className="ai-output" style={{ color: "var(--muted)" }}><span className="loading-dots"><i /><i /><i /></span> AI กำลังเขียนบทสนทนา...</div>}
    {lesson && !loading && <div className="scenario-lesson">
      <div className="listen-strip">
        <span className="eyebrow">ฟังทีละประโยค</span>
        <div className="listen-buttons">{listenLines.map((line, i) => <button key={i} className="sound-word" onClick={() => speak(line)}><Volume2 size={14} />{line}</button>)}</div>
      </div>
      <div className="ai-result"><div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(lesson) }} /></div>
    </div>}
  </section>;
}

export function SentenceGym({ words, apiKey }: { words: VocabularyWord[]; apiKey: string }) {
  const [sentence, setSentence] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const config: MistralConfig = { apiKey, model: "mistral-large-latest" };
  const recentWords = words.slice(0, 10);

  async function check() {
    if (!sentence.trim()) return;
    if (!apiKey) { toast("กรุณาใส่ Mistral API key ก่อน", { description: "กดปุ่มรูปประแจ" }); return; }
    setLoading(true); setFeedback(null);
    try {
      const answer = await correctSentence(config, sentence.trim(), recentWords);
      setFeedback(answer);
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI ตรวจไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ["I want to drink coffee.", "She is my best friend.", "I go to work at eight o'clock.", "Can you help me, please?"];

  return <section className="gym-shell">
    <div className="gym-head"><span className="eyebrow">WRITE IT · AI CHECKS IT</span><h2>ลองแต่งประโยค แล้วให้ AI ตรวจ</h2><p>พิมพ์ภาษาอังกฤษมาประโยคหนึ่ง — AI จะบอกทันทีว่าผ่านไหม ควรแก้ตรงไหน และทำไม</p></div>
    <div className="gym-input-row">
      <PenLine size={18} />
      <textarea value={sentence} onChange={e => setSentence(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); check(); } }} placeholder={'เช่น "I want drink coffee" — พิมพ์แล้วกดตรวจ (Ctrl+Enter)'} />
      <button className="ai-button" disabled={loading || !sentence.trim()} onClick={check}>{loading ? <Loader2 size={15} className="spin" /> : <SendHorizontal size={15} />}{loading ? " กำลังตรวจ..." : " ตรวจ"}</button>
    </div>
    <div className="gym-suggest">ลองเลย: {suggestions.map((s) => <button key={s} className="sound-word" onClick={() => { setSentence(s); setFeedback(null); }}>{s}</button>)}</div>
    {feedback && <div className="ai-result"><div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(feedback) }} /></div>}
    {!feedback && <div className="gym-empty"><span className="eyebrow">ทำไมต้องเขียนเอง</span><p>การแต่งประโยคเองคือขั้นตอนที่เปลี่ยน "จำคำได้" ให้เป็น "ใช้คำเป็น" — ผิดได้อิสระ AI ช่วยแก้ทีละประโยคโดยไม่ตัดสิน</p></div>}
  </section>;
}

export default { ScenarioLab, SentenceGym };
