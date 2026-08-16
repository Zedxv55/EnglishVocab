/** ChatPractice: ฝึกสนทนาภาษาอังกฤษแบบบทบาทสมมติกับ AI (Mistral) */
import { useState } from "react";
import { MessageCircle, Send, RotateCcw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { roleplayChat, type ChatMessage } from "@/lib/mistral";
import { simpleMarkdown } from "@/components/AiTutor";

const SCENARIOS = [
  "สั่งอาหารที่ร้านอาหาร — คุณคือลูกค้า คู่สนทาคือพนักงานเสิร์ฟ",
  "เช็คอินโรงแรม — คุณคือนักท่องเที่ยว คู่สนทาคือพนักงานต้อนรับ",
  "ถามทางบนถนน — คุณคือนักท่องเที่ยวที่หลงทาง",
  "ซื้อของในร้านค้า — คุณต้องการซื้อเสื้อและสอบถามราคา",
  "สัมภาษณ์งานเบื้องต้น — คุณคือผู้สมัคร คู่สนทาคือ HR",
  "พบหมอที่โรงพยาบาล — คุณมีอาการปวดหัวและไข้",
];

function speak(text: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\(.*\)/g, ""));
    utter.lang = "en-US";
    utter.rate = 0.75;
    window.speechSynthesis.speak(utter);
  } catch { /* unsupported */ }
}

export function ChatPractice({ apiKey }: { apiKey: string }) {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const begin = async () => {
    if (!apiKey) return toast.error("กรุณาใส่ Mistral API key ก่อน", { description: "กดปุ่มประแจที่มุมขวาบนของแผง AI" });
    setStarted(true);
    setLoading(true);
    try {
      const reply = await roleplayChat({ apiKey }, scenario, []);
      setHistory([{ role: "assistant", text: reply }]);
    } catch (err) {
      toast.error("AI ตอบกลับไม่สำเร็จ", { description: err instanceof Error ? err.message : "ลองใหม่อีกครั้ง" });
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", text };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setLoading(true);
    try {
      const reply = await roleplayChat({ apiKey }, scenario, nextHistory);
      setHistory([...nextHistory, { role: "assistant", text: reply }]);
    } catch (err) {
      toast.error("AI ตอบกลับไม่สำเร็จ", { description: err instanceof Error ? err.message : "ลองใหม่อีกครั้ง" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setHistory([]);
    setStarted(false);
    setInput("");
  };

  return (
    <section className="scenario-shell">
      <div className="scenario-head">
        <div>
          <span className="eyebrow">CHAT PRACTICE</span>
          <h2>ฝึกสนทนากับ AI</h2>
        </div>
        {started && (
          <button className="text-button" onClick={reset}><RotateCcw size={14} /> เริ่มบทสนทนาใหม่</button>
        )}
      </div>
      <div className="chat-controls">
        <select value={scenario} onChange={(e) => { setScenario(e.target.value); reset(); }} disabled={loading}>
          {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!started && (
          <button className="button-primary" onClick={begin} disabled={loading}>
            {loading ? "กำลังเริ่ม..." : <>เริ่มคุย <MessageCircle size={15} /></>}
          </button>
        )}
      </div>
      {started && (
        <div className="chat-area">
          <div className="chat-messages">
            {history.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="chat-speak" onClick={() => speak(msg.text)} title="ฟังเสียง">
                    <Volume2 size={14} />
                  </div>
                )}
                <div className="chat-text">{simpleMarkdown(msg.text)}</div>
              </div>
            ))}
            {loading && <div className="chat-bubble assistant"><span className="thinking">AI กำลังคิด...</span></div>}
          </div>
          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="พิมพ์ภาษาอังกฤษตอบกลับ..."
              disabled={loading}
              autoComplete="off"
            />
            <button className="button-primary" onClick={send} disabled={loading || !input.trim()}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
      <p className="scenario-footnote">AI จะพูดภาษาอังกฤษง่าย ๆ พร้อมคำใบ้ภาษาไทยในวงเล็บ — กดไอคอนลำโพงเพื่อฟังเสียง และตอบกลับเป็นภาษาอังกฤษ</p>
    </section>
  );
}
