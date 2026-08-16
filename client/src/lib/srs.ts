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

/** Lightweight daily review log: records how many reviews happened on each day. */
export const DAILY_LOG_KEY = "englishvocab-daily-log-v1";
export function logTodayReview(): void {
  const dayKey = new Date().toISOString().slice(0, 10);
  try {
    const log = JSON.parse(localStorage.getItem(DAILY_LOG_KEY) || "{}") as Record<string, number>;
    log[dayKey] = (log[dayKey] || 0) + 1;
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch { /* storage unavailable */ }
}
export function readDailyLog(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DAILY_LOG_KEY) || "{}") as Record<string, number>; } catch { return {}; }
}
export function lastSevenDays(log: Record<string, number>): { day: string; short: string; count: number }[] {
  const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const out: { day: string; short: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now); date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    out.push({ day: key, short: days[date.getDay()], count: log[key] || 0 });
  }
  return out;
}
export function nextIntervalLabel(record: SrsRecord | undefined, grade: Grade) {
  const ms = new Date(reviewWord(record, grade).dueAt).getTime() - Date.now();
  return ms < DAY ? "10 นาที" : `${Math.max(1, Math.round(ms / DAY))} วัน`;
}

/** Streak & daily goal tracking built on top of the daily review log. */
export interface StreakInfo {
  /** จำนวนวันเรียนต่อเนื่องรวมวันนี้ */
  currentStreak: number;
  /** Streak สูงสุดที่เคยทำ */
  bestStreak: number;
  /** รอบทบทวนที่ทำได้วันนี้ */
  todayCount: number;
  /** เป้าหมายรายวัน (รอบ) */
  goal: number;
}

const GOAL_KEY = "englishvocab-daily-goal-v1";
const BEST_KEY = "englishvocab-best-streak-v1";

export function setDailyGoal(goal: number): void {
  try { localStorage.setItem(GOAL_KEY, String(Math.max(1, Math.min(100, goal)))); } catch { /* ignore */ }
}

export function readDailyGoal(): number {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (raw) return Math.max(1, Math.min(100, Number(raw)));
  } catch { /* ignore */ }
  return 10;
}

export function computeStreak(log: Record<string, number>): StreakInfo {
  const todayKey = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  let best = (() => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } })();
  const now = new Date();
  for (let i = 0; i < 400; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (log[key] && log[key] > 0) {
      currentStreak += 1;
    } else if (i > 0) {
      break;
    }
  }
  if (currentStreak > best) {
    best = currentStreak;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ }
  }
  return { currentStreak, bestStreak: best, todayCount: log[todayKey] || 0, goal: readDailyGoal() };
}
