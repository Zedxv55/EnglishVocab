/** AI Tutor powered by Mistral: builds a personal study plan and answers questions. */
import { useState } from "react";
import { BrainCircuit, Loader2, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { askTutor, buildStudyPlan, type PlanRequest } from "@/lib/mistral";
import type { VocabularyWord } from "@/hooks/useVocabulary";

const API_KEY_STORAGE = "englishvocab-mistral-key-v1";

export function simpleMarkdown(text: string): string {
  // Lightweight Markdown → HTML for the study plan output (headings, bold, lists, tables, line breaks)
  const lines = text.split("\n");
  const out: string[] = [];
  let inTable = false;
  const tableRows: string[][] = [];
  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    const [head, ...rows] = tableRows;
    out.push(`<table><tr>${head.map(c => `<th>${c}</th>`).join("")}</tr>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`);
    tableRows.length = 0; inTable = false;
  };
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  for (const raw of lines) {
    const line = raw.trimEnd();
    const row = line.trim().match(/^\|(.+)\|\s*$/);
    if (row) {
      inTable = true;
      tableRows.push(row[1].split("|").map(cell => cell.trim()));
      continue;
    }
    flushTable();
    if (line.trim() === "") { out.push(""); continue; }
    if (/^#{1,3}\s+/.test(line.trim())) {
      const level = line.trim().search(/#/);
      out.push(`<h${Math.min(level + 1, 3)}>${inline(line.trim().replace(/^#+\s+/, ""))}</h${Math.min(level + 1, 3)}>`);
    } else if (/^[-*]\s+/.test(line.trim())) {
      out.push(`<ul><li>${inline(line.trim().replace(/^[-*]\s+/, ""))}</li></ul>`);
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushTable();
  return out.join("\n");
}

function Loading() {
  return <div className="ai-output" style={{ color: "var(--muted)" }}><span className="loading-dots"><i /><i /><i /></span> AI กำลังวางแผนการเรียนให้...</div>;
}

export function AiTutor({ words, scheduled }: { words: VocabularyWord[]; scheduled: number }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [minutes, setMinutes] = useState(20);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) || "");
  const [showKeyField, setShowKeyField] = useState(false);
  const [tutorQ, setTutorQ] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorOutput, setTutorOutput] = useState<string | null>(null);

  // Words currently in the learner's plan (saved + scheduled)
  const planWords = words.filter(w => {
    const saved = localStorage.getItem("englishvocab-srs-saved-v1");
    let savedKeys: string[] = [];
    try { savedKeys = saved ? JSON.parse(saved) : []; } catch { savedKeys = []; }
    return savedKeys.includes(w.w.toLowerCase()) || !!w;
  }).slice(0, 40);

  const config = { apiKey, model: "mistral-large-latest" };

  async function generate() {
    if (!apiKey) { toast("กรุณาใส่ Mistral API key ก่อนใช้งาน", { description: "กดปุ่มรูปประแจเพื่อตั้งค่า" }); return; }
    const picked = planWords.slice(0, 30);
    if (!picked.length) { toast("เพิ่มคำศัพท์เข้าแผนก่อน", { description: "กดปุ่ม \"เพิ่มทบทวน\" หรือ \"บันทึก\" ที่คำศัพท์ในคลังอย่างน้อย 1 คำ" }); return; }
    setLoading(true); setError(null); setOutput(null);
    try {
      const plan = await buildStudyPlan(
        { words: picked, minutesPerDay: minutes, level, goal: goal || undefined },
        config,
      );
      setOutput(plan);
      toast("AI วางแผนเรียนรู้ให้คุณแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function ask() {
    if (!apiKey) { toast("กรุณาใส่ Mistral API key ก่อน", { description: "กดปุ่มรูปประแจ" }); return; }
    if (!tutorQ.trim()) return;
    setTutorLoading(true); setTutorOutput(null);
    try {
      const answer = await askTutor(tutorQ, planWords.slice(0, 10), config);
      setTutorOutput(answer);
    } catch (e) {
      setTutorOutput(null);
      toast(e instanceof Error ? e.message : "ติดต่อ AI ไม่ได้", { description: "ตรวจสอบ API key และอินเทอร์เน็ต" });
    } finally {
      setTutorLoading(false);
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-head">
        <h3><BrainCircuit size={19} style={{ color: "var(--green)", marginRight: 10 }} />AI ทูเตอร์ — จัดแผนเรียนให้คุณ</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-button" style={{ width: 34, height: 34, background: apiKey ? "var(--green)" : "var(--muted)" }} title={apiKey ? "ตั้งค่า API key" : "ยังไม่มี API key — กดเพื่อใส่"} onClick={() => setShowKeyField(v => !v)}>
            <Wrench size={15} />
          </button>
          <button className="icon-button" style={{ width: 34, height: 34 }} title={open ? "ซ่อนเครื่องมือ AI" : "เปิดเครื่องมือ AI"} onClick={() => setOpen(v => !v)}>
            <Sparkles size={15} />
          </button>
        </div>
      </div>
      {showKeyField && (
        <div className="ai-form" style={{ borderBottom: "1px solid var(--line)" }}>
          <label>
            Mistral API Key
            <input value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem(API_KEY_STORAGE, e.target.value.trim()); }} placeholder="ลิงก์เช่น l78l... ส่วนตัว ไม่ถูกส่งออกจากเครื่องของคุณ" />
          </label>
        </div>
      )}
      {open && (
        <div className="ai-form">
          <div className="form-row">
            <label>ระดับของคุณ
              <select value={level} onChange={e => setLevel(e.target.value as typeof level)}>
                <option value="beginner">พื้นฐาน (เริ่มต้น)</option>
                <option value="intermediate">กลาง</option>
                <option value="advanced">ขั้นสูง</option>
              </select>
            </label>
            <label>เวลาเรียนต่อวัน (นาที)
              <input type="number" min={5} max={180} value={minutes} onChange={e => setMinutes(Math.max(5, Math.min(180, Number(e.target.value) || 20)))} />
            </label>
          </div>
          <label>เป้าหมาย (พิเศษ)
            <textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="เช่น เตรียมสอบ TOEIC / ใช้ในงาน / ท่องเที่ยว — เว้นว่างได้ ระบบจะใช้เป้าหมายเรียนตามปกติ" />
          </label>
          <div className="selected-words">
            <span style={{ background: "var(--amber-pale)", color: "#786847" }}>คำที่ใช้ในแผน: {planWords.length} คำ</span>
            <span>ทบทวนอยู่: {scheduled} คำ</span>
          </div>
          <button className="ai-button" disabled={loading} onClick={generate}>
            {loading ? <><Loader2 size={16} className="spin" /> กำลังให้ AI วางแผน...</> : <>ให้ AI จัดแผนเรียน <Sparkles size={15} /></>}
          </button>
          {error && <div className="ai-error">Error: {error}</div>}
          {loading && !error && <Loading />}
          {output && !loading && <div className="ai-result"><div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(output) }} /></div>}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 6, display: "grid", gap: 8 }}>
            <label>ถาม AI ได้เลย
              <textarea value={tutorQ} onChange={e => setTutorQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} placeholder={'เช่น "achieve ใช้กับอะไรได้บ้าง?" — กด Enter (Cmd/Ctrl+Enter) เพื่อสง'} />
            </label>
            <button className="text-button" style={{ justifySelf: "start" }} disabled={tutorLoading} onClick={ask}>
              {tutorLoading ? <><Loader2 size={14} /> รอตอบ...</> : "ถาม AI (Ctrl+Enter)"}
            </button>
            {tutorOutput && <div className="ai-result"><div className="ai-output" dangerouslySetInnerHTML={{ __html: simpleMarkdown(tutorOutput) }} /></div>}
          </div>
        </div>
      )}
      {!open && !apiKey && (
        <div className="ai-form" style={{ paddingBottom: 14 }}>
          <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.7, margin: 0 }}>กดปุ่มประแจซ้ายมือเพื่อใส่ Mistral API key ของคุณ หลังจากนั้น AI จะช่วยจัดแผนเรียนจากคำศัพท์ที่คุณเลือกและตอบคำถามได้ตลอด 24 ชั่วโมง</p>
        </div>
      )}
    </div>
  );
}
