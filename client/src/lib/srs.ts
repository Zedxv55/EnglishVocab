/** Study Ledger design: local, transparent SM-2-style scheduling for Thai vocabulary learners. */
export type Grade = "again" | "hard" | "good" | "easy";

export interface SrsRecord {
  repetitions: number;
  interval: number;
  easeFactor: number;
  dueAt: string;
  lastReviewedAt: string;
  totalReviews: number;
  lastGrade: Grade;
}

export type SrsStore = Record<string, SrsRecord>;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export function reviewWord(previous: SrsRecord | undefined, grade: Grade, now = new Date()): SrsRecord {
  const record = previous ?? { repetitions: 0, interval: 0, easeFactor: 2.5, dueAt: now.toISOString(), lastReviewedAt: now.toISOString(), totalReviews: 0, lastGrade: "again" as Grade };
  let repetitions = record.repetitions;
  let interval = record.interval;
  let easeFactor = record.easeFactor;
  let nextAt = now.getTime();
  if (grade === "again") {
    repetitions = 0; interval = 0; easeFactor = Math.max(1.3, easeFactor - 0.2); nextAt += 10 * MINUTE;
  } else if (grade === "hard") {
    repetitions += 1; interval = Math.max(1, Math.round(interval > 0 ? interval * 1.2 : 1)); easeFactor = Math.max(1.3, easeFactor - 0.15); nextAt += interval * DAY;
  } else if (grade === "good") {
    repetitions += 1; interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(4, Math.round(interval * easeFactor)); nextAt += interval * DAY;
  } else {
    repetitions += 1; interval = repetitions === 1 ? 4 : Math.max(5, Math.round(interval * easeFactor * 1.3)); easeFactor = Math.min(3.4, easeFactor + 0.15); nextAt += interval * DAY;
  }
  return { repetitions, interval, easeFactor: Number(easeFactor.toFixed(2)), dueAt: new Date(nextAt).toISOString(), lastReviewedAt: now.toISOString(), totalReviews: record.totalReviews + 1, lastGrade: grade };
}

export function isDue(record: SrsRecord | undefined, now = new Date()) { return Boolean(record && new Date(record.dueAt).getTime() <= now.getTime()); }
export function gradeLabel(grade: Grade) { return { again: "จำไม่ได้", hard: "ยาก", good: "ดี", easy: "ง่าย" }[grade]; }
export function nextIntervalLabel(record: SrsRecord | undefined, grade: Grade) {
  const ms = new Date(reviewWord(record, grade).dueAt).getTime() - Date.now();
  return ms < DAY ? "10 นาที" : `${Math.max(1, Math.round(ms / DAY))} วัน`;
}
