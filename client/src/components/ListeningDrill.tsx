/** ListeningDrill: ฟังเสียงภาษาอังกฤษของเบราว์เซอร์ แล้วเลือกคำที่ได้ยิน หรือพิมพ์ตามที่ได้ยิน */
import { useEffect, useMemo, useState } from "react";
import { Volume2, RefreshCw, Check, X, Keyboard, Ear } from "lucide-react";
import { toast } from "sonner";
import type { VocabularyWord } from "@/hooks/useVocabulary";

const KEY = "englishvocab-listening-mixed-v1";
const SPEAKER_RATE = 0.72;

function speak(text: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = SPEAKER_RATE;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => v.lang.startsWith("en"));
    if (en) utter.voice = en;
    window.speechSynthesis.speak(utter);
  } catch { /* unsupported */ }
}

interface DrillWord {
  w: string;
  th: string;
  ipa: string;
}

function loadMixed(): DrillWord[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved) && saved.length >= 3) return saved as DrillWord[];
  } catch { /* ignore */ }
  return [];
}

export function ListeningDrill({ words, apiKey }: { words: VocabularyWord[]; apiKey: string }) {
  const [mixed, setMixed] = useState<DrillWord[]>(() => loadMixed());
  const [mode, setMode] = useState<"pick" | "type">("pick");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [playing, setPlaying] = useState(false);

  const current = mixed[index];
  const distractors = useMemo(() => {
    if (!current) return [] as DrillWord[];
    const pool = words.filter((w) => w.w.toLowerCase() !== current.w.toLowerCase() && w.th && !mixed.some((m) => m.w.toLowerCase() === w.w.toLowerCase())).slice(0, 200);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [current, words, mixed]);

  const options = useMemo(() => {
    if (!current || mode !== "pick") return [] as (DrillWord | null)[];
    const all = [current, ...distractors].sort(() => Math.random() - 0.5);
    return all as (DrillWord | null)[];
  }, [current, distractors, mode]);

  const regenerate = () => {
    if (words.length < 6) {
      toast("คลังคำศัพท์ยังโหลดไม่ครบ", { description: "รอแอปโหลดคำศัพท์ 5,000 คำให้เสร็จแล้วลองใหม่" });
      return;
    }
    const subset = words.sort(() => Math.random() - 0.5).slice(0, 6).map((w) => ({ w: w.w, th: w.th, ipa: w.ipa }));
    localStorage.setItem(KEY, JSON.stringify(subset));
    setMixed(subset);
    setIndex(0);
    setRevealed(false);
    setPicked(null);
    setInput("");
    setScore(0);
    setTotalAnswered(0);
    toast("เปลี่ยนชุดคำใหม่แล้ว", { description: "กดปุ่มลำโพงเพื่อฟัง แล้วตอบคำถาม" });
  };

  useEffect(() => {
    if (!mixed.length) regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = () => {
    if (!current) return;
    speak(current.w);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 1400);
  };

  const answerPick = (option: DrillWord | null) => {
    if (revealed || !option) return;
    setPicked(mixed.indexOf(option));
    setRevealed(true);
    setTotalAnswered((t) => t + 1);
    if (option.w.toLowerCase() === current.w.toLowerCase()) setScore((s) => s + 1);
  };

  const answerType = () => {
    if (revealed || !current) return;
    if (!input.trim()) return;
    setRevealed(true);
    setTotalAnswered((t) => t + 1);
    if (input.trim().toLowerCase() === current.w.toLowerCase()) setScore((s) => s + 1);
  };

  const nextWord = () => {
    setRevealed(false);
    setPicked(null);
    setInput("");
    if (index + 1 >= mixed.length) {
      setIndex(0);
      setScore(0);
      setTotalAnswered(0);
      toast("ครบชุดแล้ว — รีเซตคะแนน", { description: "ฝึกต่อได้อีกไม่จำกัด" });
      return;
    }
    setIndex(index + 1);
  };

  const pct = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

  return (
    <section className="scenario-shell">
      <div className="scenario-head">
        <div>
          <span className="eyebrow">LISTENING DRILL</span>
          <h2>แบบฝึกหัดการฟัง</h2>
        </div>
        <div className="scenario-head-actions">
          <button className={`text-button ${mode === "pick" ? "selected" : ""}`} onClick={() => { setMode("pick"); setRevealed(false); setPicked(null); setInput(""); }}><Check size={15} /> เลือกคำตอบ</button>
          <button className={`text-button ${mode === "type" ? "selected" : ""}`} onClick={() => { setMode("type"); setRevealed(false); setPicked(null); setInput(""); }}><Keyboard size={15} /> พิมพ์ตามที่ได้ยิน</button>
        </div>
      </div>
      {current ? (
        <div className="listening-stage">
          <div className="listening-top">
            <button className={`listen-button ${playing ? "playing" : ""}`} onClick={play} aria-label="ฟังเสียงคำศัพท์">
              <Volume2 size={30} />
              <span>ฟังเสียง (กดซ้ำได้ตามต้องการ)</span>
            </button>
            {totalAnswered > 0 && (
              <span className="drill-score">คำตอบถูก {score}/{totalAnswered} · {pct}%</span>
            )}
          </div>
          {mode === "pick" ? (
            <div className="listening-options">
              {options.map((option, i) => {
                if (!option) return null;
                const isCorrect = option.w.toLowerCase() === current.w.toLowerCase();
                const chosen = picked === mixed.indexOf(option);
                return (
                  <button
                    key={i}
                    className={`drill-option${revealed && isCorrect ? " correct" : ""}${revealed && chosen && !isCorrect ? " wrong" : ""}`}
                    onClick={() => answerPick(option)}
                    disabled={revealed}
                  >
                    <strong>{option.w}</strong>
                    {revealed && isCorrect ? <Check size={18} className="opt-ok" /> : revealed && chosen && !isCorrect ? <X size={18} className="opt-no" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="listening-type">
              <div className="type-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") answerType(); }}
                  placeholder="พิมพ์คำที่คุณได้ยิน"
                  disabled={revealed}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button className="button-primary" onClick={answerType} disabled={revealed || !input.trim()}>ตรวจสอบ <Ear size={15} /></button>
              </div>
              {revealed && (
                <div className={`type-result ${input.trim().toLowerCase() === current.w.toLowerCase() ? "good" : "bad"}`}>
                  <strong>{input.trim().toLowerCase() === current.w.toLowerCase() ? "ถูกต้อง!" : "ยังไม่ใช่ — คำที่ฟังคือ"}</strong>
                  <span>{current.w}</span>
                  <small>{current.th}</small>
                </div>
              )}
            </div>
          )}
          {revealed && (
            <div className="listening-reveal">
              <div className="reveal-main"><span className="reveal-ipa">{current.ipa || "—"}</span><strong className="reveal-word">{current.w}</strong><span className="reveal-th">{current.th}</span></div>
              <button className="text-button" onClick={play}><RefreshCw size={14} /> ฟังอีกครั้ง</button>
            </div>
          )}
          <div className="listening-footer">
            <button className="button-primary" onClick={nextWord}>{revealed ? (index + 1 >= mixed.length ? "เริ่มรอบใหม่" : "คำถัดไป") : "ข้ามไปคำถัดไป"} →</button>
            <button className="text-button" onClick={regenerate}><RefreshCw size={14} /> สลับคำศัพท์ชุดใหม่</button>
          </div>
        </div>
      ) : (
        <p className="week-empty">กำลังเตรียมคำศัพท์...</p>
      )}
      {apiKey || true ? (
        <p className="scenario-footnote">เสียงใช้เทคโนโลยี Text-to-Speech ของเบราว์เซอร์ — หากเบราว์เซอร์ยังไม่มีเสียง ให้เช็กการตั้งค่าเสียงของระบบ หรือเลื่อนดูตัวอย่างจากบทเรียนสถานการณ์ได้</p>
      ) : null}
    </section>
  );
}
