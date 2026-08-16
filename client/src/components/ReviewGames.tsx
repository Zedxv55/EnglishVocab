/** ReviewGames: โหมดเกมทบทวนคำศัพท์ — จับคู่จับเวลา, พิมพ์แข่งเวลา, เติมคำในช่องว่าง */
import { useEffect, useRef, useState } from "react";
import { Gamepad2, Puzzle, Type, PenLine, RotateCcw, Check, Timer } from "lucide-react";
import { toast } from "sonner";
import type { VocabularyWord } from "@/hooks/useVocabulary";
import { logTodayReview } from "@/lib/srs";

type GameType = "match" | "race" | "fill";

interface MatchCard {
  id: number;
  kind: "word" | "th";
  text: string;
  pair: string;
}

function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

export function ReviewGames({ words, onGameReview }: { words: VocabularyWord[]; onGameReview: (word: VocabularyWord) => void }) {
  const [game, setGame] = useState<GameType>("match");
  const [round, setRound] = useState(0);
  const key = `englishvocab-games-${game}-${round}-v1`;

  const [deck, setDeck] = useState<VocabularyWord[]>(() => words.filter((w) => w.th).sort(() => Math.random() - 0.5).slice(0, 6));

  useEffect(() => {
    if (deck.length === 0 && words.length) setDeck(words.filter((w) => w.th).sort(() => Math.random() - 0.5).slice(0, 6));
  }, [words, deck.length]);

  const nextRound = (newDeck?: VocabularyWord[]) => {
    setRound((r) => r + 1);
    if (newDeck) setDeck(newDeck);
  };

  const randomDeck = () => words.filter((w) => w.th).sort(() => Math.random() - 0.5).slice(0, 6);

  return (
    <section className="scenario-shell">
      <div className="scenario-head">
        <div>
          <span className="eyebrow">REVIEW GAMES</span>
          <h2>โหมดเกมทบทวน</h2>
        </div>
        <div className="scenario-head-actions">
          <button className={`text-button ${game === "match" ? "selected" : ""}`} onClick={() => { setGame("match"); nextRound(); }}><Puzzle size={15} /> จับคู่</button>
          <button className={`text-button ${game === "race" ? "selected" : ""}`} onClick={() => { setGame("race"); nextRound(); }}><Type size={15} /> พิมพ์แข่งเวลา</button>
          <button className={`text-button ${game === "fill" ? "selected" : ""}`} onClick={() => { setGame("fill"); nextRound(); }}><PenLine size={15} /> เติมคำ</button>
        </div>
      </div>
      {game === "match" && <MatchGame key={key} deck={deck} onFinish={(score) => { toast.success(`จบรอบ! จับคู่ถูก ${score} คู่`); }} onNext={() => nextRound(randomDeck())} onGameReview={onGameReview} />}
      {game === "race" && <RaceGame key={key} deck={deck} onFinish={(score, seconds) => { toast.success(`จบรอบ! แปลถูก ${score} คำ ใน ${seconds} วินาที`); }} onNext={() => nextRound(randomDeck())} onGameReview={onGameReview} />}
      {game === "fill" && <FillGame key={key} deck={deck} onFinish={(score) => { toast.success(`จบรอบ! เติมถูก ${score} คำ`); }} onNext={() => nextRound(randomDeck())} onGameReview={onGameReview} />}
      <p className="scenario-footnote">ทุกครั้งที่ตอบถูก ระบบจะนับเป็นการทบทวนและบันทึกความคืบหน้าให้อัตโนมัติ</p>
    </section>
  );
}

function MatchGame({ deck, onFinish, onNext, onGameReview }: { deck: VocabularyWord[]; onFinish: (score: number) => void; onNext: () => void; onGameReview: (word: VocabularyWord) => void }) {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    const items: MatchCard[] = [];
    deck.forEach((w, i) => {
      items.push({ id: i * 2, kind: "word", text: w.w, pair: w.w });
      items.push({ id: i * 2 + 1, kind: "th", text: w.th, pair: w.w });
    });
    setCards(shuffle(items));
    setSelected(null);
    setMatched(new Set());
    setWrongPair(new Set());
    setDone(false);
    scoreRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck]);

  const pick = (id: number) => {
    if (done || matched.has(id) || wrongPair.has(id)) return;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) return;
    const prev = cards.find((c) => c.id === selected)!;
    if (prev.pair === card.pair && prev.id !== card.id) {
      const nextMatched = new Set(matched);
      nextMatched.add(selected);
      nextMatched.add(id);
      setMatched(nextMatched);
      scoreRef.current += 1;
      onGameReview(deck.find((w) => w.w === card.pair)!);
      setSelected(null);
      if (nextMatched.size === cards.length) {
        setDone(true);
        onFinish(scoreRef.current / 2);
      }
    } else {
      const wrong = new Set(wrongPair);
      wrong.add(selected);
      wrong.add(id);
      setWrongPair(wrong);
      setSelected(null);
      setTimeout(() => setWrongPair(new Set()), 600);
    }
  };

  return (
    <div className="game-wrap">
      {done ? (
        <div className="game-done"><Check size={26} /><strong>จับคู่ครบแล้ว!</strong><span>คำศัพท์ {deck.length} คำ — ลองรอบใหม่หรือเล่นโหมดอื่นได้</span><div className="game-actions"><button className="button-primary" onClick={onNext}>รอบใหม่ <RotateCcw size={15} /></button></div></div>
      ) : (
        <div className="match-grid">
          {cards.map((card) => {
            const isMatched = matched.has(card.id);
            const isSelected = selected === card.id;
            const isWrong = wrongPair.has(card.id);
            return (
              <button key={card.id} className={`match-card ${card.kind} ${isMatched ? "matched" : ""} ${isSelected ? "picked" : ""} ${isWrong ? "shake" : ""}`} onClick={() => pick(card.id)}>
                <strong>{card.text}</strong>
                <small>{card.kind === "word" ? "EN" : "TH"}</small>
              </button>
            );
          })}
        </div>
      )}
      {!done && <p className="game-hint">กดคำภาษาอังกฤษหนึ่งคำ แล้วกดคำแปลภาษาไทยที่ตรงกัน</p>}
    </div>
  );
}

function RaceGame({ deck, onFinish, onNext, onGameReview }: { deck: VocabularyWord[]; onFinish: (score: number, seconds: number) => void; onNext: () => void; onGameReview: (word: VocabularyWord) => void }) {
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<{ th: string; ok: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const scoreRef = useRef(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    setIndex(0);
    setScore(0);
    setDone(false);
    scoreRef.current = 0;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck]);

  useEffect(() => {
    if (index >= deck.length || deck.length === 0) return;
    const current = deck[index];
    const pool = deck.filter((w) => w.w !== current.w);
    const distractors = shuffle(pool).slice(0, 3).map((w) => ({ th: w.th, ok: false }));
    setChoices(shuffle([{ th: current.th, ok: true }, ...distractors]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, deck]);

  const answer = (th: string) => {
    if (done) return;
    const ok = choices.find((c) => c.th === th)?.ok;
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      onGameReview(deck[index]);
    }
    if (index + 1 >= deck.length) {
      setDone(true);
      onFinish(scoreRef.current, Math.floor((Date.now() - startRef.current) / 1000));
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="game-wrap">
      {done ? (
        <div className="game-done"><Timer size={26} /><strong>จบรอบ! ถูก {score}/{deck.length} คำ</strong><span>ใช้เวลา {elapsed} วินาที</span><div className="game-actions"><button className="button-primary" onClick={onNext}>รอบใหม่ <RotateCcw size={15} /></button></div></div>
      ) : deck[index] ? (
        <div className="race-stage">
          <div className="race-status"><span className="eyebrow">คำที่ {index + 1}/{deck.length}</span><strong className="race-word">{deck[index].w}</strong><span className="race-timer">{elapsed} วินาที · ถูก {score}</span></div>
          <div className="race-options">
            {choices.map((c, i) => <button key={i} className="drill-option" onClick={() => answer(c.th)}>{c.th}</button>)}
          </div>
        </div>
      ) : null}
      {!done && <p className="game-hint">ดูคำภาษาอังกฤษ แล้วเลือกคำแปลที่ถูกต้องให้เร็วที่สุด</p>}
    </div>
  );
}

function FillGame({ deck, onFinish, onNext, onGameReview }: { deck: VocabularyWord[]; onFinish: (score: number) => void; onNext: () => void; onGameReview: (word: VocabularyWord) => void }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    setIndex(0);
    setInput("");
    setRevealed(false);
    setScore(0);
    scoreRef.current = 0;
  }, [deck]);

  const current = deck[index];

  const check = () => {
    if (revealed || !current) return;
    setRevealed(true);
    if (input.trim().toLowerCase() === current.w.toLowerCase()) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      onGameReview(current);
    }
  };

  const next = () => {
    setRevealed(false);
    setInput("");
    if (index + 1 >= deck.length) {
      onFinish(scoreRef.current);
      return;
    }
    setIndex(index + 1);
  };

  return (
    <div className="game-wrap">
      <div className="fill-stage">
        <div className="fill-status"><span className="eyebrow">คำที่ {index + 1}/{deck.length}</span><span className="fill-meaning">ความหมาย: {current ? current.th : ""}</span><span className="race-timer">ถูก {score}</span></div>
        {current && (
          <div className="fill-row">
            <span className="fill-blank">{input.trim().toLowerCase() === current.w.toLowerCase() ? current.w : "_".repeat(Math.min(12, current.w.length))}</span>
            <div className="type-row" style={{ marginTop: 14 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") revealed ? next() : check(); }} placeholder="พิมพ์คำภาษาอังกฤษที่ตรงกับความหมาย" disabled={revealed} autoComplete="off" spellCheck={false} />
              <button className="button-primary" onClick={revealed ? next : check} disabled={!revealed && !input.trim()}>{revealed ? (index + 1 >= deck.length ? "จบรอบ" : "คำถัดไป") : "ตรวจคำตอบ"}</button>
            </div>
            {revealed && (
              <div className={`type-result ${input.trim().toLowerCase() === current.w.toLowerCase() ? "good" : "bad"}`}>
                <strong>{input.trim().toLowerCase() === current.w.toLowerCase() ? "ถูกต้อง!" : `คำตอบคือ: ${current.w}`}</strong>
                <span>{current.ipa || "—"}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="game-hint">ระบบจะให้เลือกคำจากคำที่คุณกำลังเรียนจริง — เห็นคำแปลแล้วนึกคำอังกฤษให้ถูกตัวสะกด</p>
    </div>
  );
}
