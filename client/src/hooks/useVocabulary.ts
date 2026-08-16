/** Study Ledger design: vocabulary data stays external while learner progress stays private in localStorage. */
import { useEffect, useState } from "react";

export interface VocabularyWord { w: string; ipa: string; th_ipa: string; pos: string; th: string; }
const VOCABULARY_ASSET = "/manus-storage/words_9c0f4571.js";
const fallbackWords: VocabularyWord[] = [
  { w: "achieve", ipa: "/əˈtʃiːv/", th_ipa: "อะชีฟ", pos: "verb", th: "บรรลุ, ทำสำเร็จ" },
  { w: "curious", ipa: "/ˈkjʊəriəs/", th_ipa: "คิวเรียส", pos: "adj", th: "อยากรู้อยากเห็น" },
  { w: "discover", ipa: "/dɪˈskʌvər/", th_ipa: "ดิสคัฟเวอร์", pos: "verb", th: "ค้นพบ" },
  { w: "journey", ipa: "/ˈdʒɜːrni/", th_ipa: "เจอร์นี", pos: "noun", th: "การเดินทาง" },
  { w: "practice", ipa: "/ˈpræktɪs/", th_ipa: "แพร็กทิส", pos: "noun", th: "การฝึกฝน" },
  { w: "progress", ipa: "/ˈprəʊɡres/", th_ipa: "โพรเกรส", pos: "noun", th: "ความก้าวหน้า" },
  { w: "remember", ipa: "/rɪˈmembər/", th_ipa: "รีเมมเบอร์", pos: "verb", th: "จดจำ" },
  { w: "thoughtful", ipa: "/ˈθɔːtfəl/", th_ipa: "ธอตฟูล", pos: "adj", th: "รอบคอบ, ช่างคิด" },
];

export function useVocabulary() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(VOCABULARY_ASSET).then((response) => {
      if (!response.ok) throw new Error("Unable to load vocabulary");
      return response.text();
    }).then((source) => {
      const parsed = JSON.parse(source.replace(/^\s*window\.VOCAB\s*=\s*/, "").replace(/;\s*$/, "")) as VocabularyWord[];
      if (active) setWords(parsed);
    }).catch(() => {
      if (active) { setWords(fallbackWords); setError("กำลังแสดงคลังตัวอย่าง เนื่องจากโหลดข้อมูลเต็มไม่ได้"); }
    });
    return () => { active = false; };
  }, []);
  return { words, isLoading: words.length === 0 && !error, error };
}
