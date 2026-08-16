/** AI tutor powered by Mistral. Calls a server proxy so the API key never ships to the browser. */
import { z } from "zod";

export interface MistralConfig { apiKey: string; model?: string }

export type PlanRequest = {
  /** English words the learner wants to study (from the 5,000-word library). */
  words: { w: string; th: string; pos: string }[];
  /** Minutes per day the learner can commit. */
  minutesPerDay: number;
  /** Learner's self-reported level. */
  level: "beginner" | "intermediate" | "advanced";
  /** Optional custom goal, e.g. "เตรียมสอบ TOEIC" or "อยากพูดกับชาวต่างชาติได้". */
  goal?: string;
};

const MistralResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })),
});

/** Proxy request shape shared with the server route /api/mistral/chat. */
const proxyPayload = (messages: { role: string; content: string }[], config: MistralConfig) => ({
  messages,
  model: config.model ?? "mistral-large-latest",
  maxTokens: 2000,
});

async function chat(messages: { role: string; content: string }[], config: MistralConfig): Promise<string> {
  // Vite dev server proxies /api to the Express server via the same origin.
  const resp = await fetch("/api/mistral/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...proxyPayload(messages, config), apiKey: config.apiKey }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `Mistral request failed (${resp.status})`);
  }
  const json = await resp.json();
  return MistralResponseSchema.parse(json).choices[0]?.message?.content ?? "";
}

export function buildStudyPlan(request: PlanRequest, config: MistralConfig): Promise<string> {
  const wordList = request.words.map((word) => `${word.w} (${word.pos}) — ${word.th}`).join("\n");
  const system = `You are a friendly English learning coach for Thai learners. Respond in Thai, except English example sentences.
Given a word list, daily minutes, and level, return a Markdown study plan:
- **ภาพรวมแผน** — short summary tailored to the goal.
- **แผนรายสัปดาห์ (4 สัปดาห์)** — 2–4 bullet points per week showing which words/phases to focus on.
- **ตารางทบทวนรายวัน** — a Markdown table: | วันที่ | คำศัพท์ที่ศึกษา | กิจกรรม | เวลา | — split the words across days to fit the daily minutes.
- **เทคนิคการจำ** — 3 practical SRS-friendly tips in Thai.
- **ประโยคตัวอย่าง** — 5 example sentences (English + Thai translation) using words from the list.
Keep it encouraging, concrete, and under 1,200 words.`;
  const user = `ระดับ: ${request.level}
เวลาที่มีต่อวัน: ${request.minutesPerDay} นาที
${request.goal ? `เป้าหมาย: ${request.goal}` : "เป้าหมาย: เรียนรู้คำศัพท์ใหม่ให้จำได้ระยะยาว"}

คำศัพท์ที่เลือก (คำ – ประเภท – ความหมายไทย):
${wordList}

ช่วยจัดทำแผนการเรียนตามข้อกำหนดด้านบน`;
  return chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    config,
  );
}

export function askTutor(question: string, recentWords: { w: string; th: string }[], config: MistralConfig): Promise<string> {
  const wordsCtx = recentWords.length
    ? `คำศัพท์ที่ผู้เรียนกำลังศึกษา: ${recentWords.map((w) => `${w.w} — ${w.th}`).join(", ")}`
    : "";
  return chat(
    [
      { role: "system", content: `You are a patient English tutor for a Thai learner. Explain in Thai with short English examples. Keep answers under 300 words. If the question touches words the learner studies, tie the explanation to them. ${wordsCtx}` },
      { role: "user", content: question },
    ],
    config,
  );
}
