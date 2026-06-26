import { promises as fs } from "node:fs";
import path from "node:path";
import type { Transcript, TranscriptSegment, WordToken } from "@/types/job";

interface Dict {
  words: Set<string>;
  bucketsByLen: Map<number, string[]>;
  fixes: Map<string, string>;
}

let cached: Dict | null = null;

// Lug'at fayllari bir nechta joyda bo'lishi mumkin (dev, standalone build, Docker).
// Birinchi topilganini ishlatamiz.
const DATA_CANDIDATES = [
  path.resolve(process.cwd(), "src/data"),
  path.resolve(process.cwd(), ".next/server/src/data"),
  path.resolve(__dirname, "../data"),
  path.resolve(__dirname, "../../src/data"),
];

async function readDataFile(name: string): Promise<string> {
  for (const dir of DATA_CANDIDATES) {
    try {
      return await fs.readFile(path.join(dir, name), "utf8");
    } catch {
      // keyingi nomzodni sinab ko'ramiz
    }
  }
  throw new Error(`Lug'at fayli topilmadi: ${name}`);
}

export async function loadDict(): Promise<Dict> {
  if (cached) return cached;

  const [wordsRaw, fixesRaw] = await Promise.all([
    readDataFile("uzbek-words.txt"),
    readDataFile("uzbek-fixes.json"),
  ]);

  const words = new Set<string>();
  for (const line of wordsRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    words.add(normalize(trimmed));
  }

  // Length bo'yicha bucket'lash — fuzzy match'da faqat shu va yaqin uzunlikdagi
  // so'zlarni tekshirish uchun (Levenshtein optimizatsiyasi).
  const bucketsByLen = new Map<number, string[]>();
  for (const w of words) {
    const len = w.length;
    let bucket = bucketsByLen.get(len);
    if (!bucket) {
      bucket = [];
      bucketsByLen.set(len, bucket);
    }
    bucket.push(w);
  }

  const fixesParsed = JSON.parse(fixesRaw) as Record<string, string>;
  const fixes = new Map<string, string>();
  for (const [k, v] of Object.entries(fixesParsed)) {
    if (k.startsWith("_")) continue;
    fixes.set(normalize(k), v);
  }

  cached = { words, bucketsByLen, fixes };
  return cached;
}

/**
 * Apostroflarni va katta/kichik harflarni normallashtirish.
 * O'zbek lotin alifbosida ʻ (U+02BB), ' (U+2018, U+2019) hammasi → ASCII '.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʻʼ‘’‚❛❜`´]/g, "'")
    .trim();
}

export function isInDict(word: string, dict: Dict): boolean {
  return dict.words.has(normalize(stripPunct(word)));
}

function stripPunct(word: string): string {
  // So'z atrofidagi tinish belgilarini olib tashlash, lekin o'rtadagi apostrofni saqlash
  return word.replace(/^[\s.,!?;:"'()«»“”]+|[\s.,!?;:"'()«»“”]+$/g, "");
}

/**
 * Optimallashtirilgan Levenshtein masofa. Agar masofa max'dan oshsa,
 * darhol max+1 qaytaradi (early exit).
 */
function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Lug'atdan eng yaqin so'zni topadi. Max masofa standart 2.
 * Faqat shu va ±2 uzunlikdagi so'zlarni tekshiradi (tez).
 */
export function findClosest(word: string, dict: Dict, maxDist = 2): string | null {
  const target = normalize(word);
  if (!target || target.length < 3) return null;
  if (dict.words.has(target)) return target;

  let best: string | null = null;
  let bestDist = maxDist + 1;

  for (let len = target.length - maxDist; len <= target.length + maxDist; len++) {
    const bucket = dict.bucketsByLen.get(len);
    if (!bucket) continue;
    for (const candidate of bucket) {
      const d = levenshtein(target, candidate, bestDist - 1);
      if (d < bestDist) {
        bestDist = d;
        best = candidate;
        if (d === 0) return best;
      }
    }
  }

  // Birinchi harf bir xil bo'lmasa — to'g'ri so'z deb bilmaymiz (juda xato bo'lar)
  if (best && best[0] !== target[0] && bestDist > 1) return null;
  return best;
}

/**
 * Matnga lug'at va aniq fixes'larni qo'llaydi.
 *   1) Aniq mapping bo'lsa (uzbek-fixes.json) — darhol almashtiradi
 *   2) Lug'atda yo'q so'z bo'lsa — eng yaqin so'zni topadi (max 2 ta harf farqi)
 *   3) Topa olmasa — original so'z qoladi
 * Katta/kichik harf saqlanadi.
 */
export interface DictOptions {
  /** Fuzzy (Levenshtein) match yoqilsinmi. Zaif ASR (Whisper) uchun true,
   *  aniq ASR (ElevenLabs) uchun false — to'g'ri so'zlarni buzmaslik uchun. */
  fuzzy?: boolean;
}

export function applyDict(text: string, dict: Dict, opts: DictOptions = {}): string {
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      return correctToken(token, dict, opts);
    })
    .join("");
}

function correctToken(token: string, dict: Dict, opts: DictOptions): string {
  // Tinish belgilarini ajratib olamiz
  const leadingMatch = token.match(/^[^\p{L}']*/u);
  const trailingMatch = token.match(/[^\p{L}']*$/u);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const core = token.slice(leading.length, token.length - trailing.length);
  if (!core) return token;

  const normalized = normalize(core);

  // 1. Aniq fix (har doim — xavfsiz, deterministik)
  const fix = dict.fixes.get(normalized);
  if (fix) return leading + matchCase(core, fix) + trailing;

  // 2. Lug'atda mavjud — o'zgartirmaymiz
  if (dict.words.has(normalized)) return token;

  // 3. Eng yaqin so'z — faqat fuzzy yoqilgan bo'lsa (zaif ASR uchun)
  if (opts.fuzzy) {
    const closest = findClosest(normalized, dict, 2);
    if (closest && closest !== normalized) {
      return leading + matchCase(core, closest) + trailing;
    }
  }

  return token;
}

/**
 * Original so'zning katta/kichik harf shaklini yangi so'zga ko'chirib qo'yadi.
 *   "Bunday" + "yigitga" → "Yigitga"
 *   "QILMOQ" + "qilgan" → "QILGAN"
 */
function matchCase(original: string, replacement: string): string {
  if (!original) return replacement;
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Bir so'z token'iga lug'atni qo'llab, har bir natija so'zining HAQIQIY
 * timestamp'ini saqlaydi. Agar fix bitta so'zni bir nechtaga bo'lsa
 * (masalan "harqanday" → "har qanday"), o'sha so'z vaqtini proporsional bo'ladi.
 */
function correctWord(w: WordToken, dict: Dict, opts: DictOptions): WordToken[] {
  const corrected = correctToken(w.word, dict, opts);
  const parts = corrected.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return [{ word: corrected || w.word, start: w.start, end: w.end }];
  }
  // So'z bir nechtaga bo'lindi — vaqtni teng bo'lamiz
  const dur = (w.end - w.start) / parts.length;
  return parts.map((p, i) => ({
    word: p,
    start: w.start + i * dur,
    end: w.start + (i + 1) * dur,
  }));
}

function wordsToText(words: WordToken[]): string {
  return words
    .map((w) => w.word)
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

/**
 * Transkriptga lug'atni SO'Z DARAJASIDA qo'llaydi — har so'zning haqiqiy
 * (ASR'dan kelgan) timestamp'i saqlanadi. Bu ovoz bilan sinxronni buzmaydi.
 */
export async function correctTranscriptWithDict(
  transcript: Transcript,
  opts: DictOptions = {},
): Promise<Transcript> {
  const dict = await loadDict();
  const segments: TranscriptSegment[] = transcript.segments.map((seg) => {
    // So'z-darajasidagi vaqt mavjud bo'lsa — uni saqlab tuzatamiz
    if (seg.words.length > 0) {
      const newWords = seg.words.flatMap((w) => correctWord(w, dict, opts));
      return {
        start: seg.start,
        end: seg.end,
        text: wordsToText(newWords),
        words: newWords,
      };
    }
    // So'z vaqtlari yo'q segment — faqat matnni tuzatamiz
    return { ...seg, text: applyDict(seg.text, dict, opts) };
  });
  return { ...transcript, segments };
}
