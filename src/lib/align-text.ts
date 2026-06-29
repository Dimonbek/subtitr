import type { Transcript, WordToken } from "@/types/job";
import { normalize } from "./uzbek-dict";
import { groupWordsIntoSegments } from "./segment-words";

interface RefTok {
  text: string; // foydalanuvchi yozgan asl shakl
  norm: string; // solishtirish uchun
}

function tokenizeRef(text: string): RefTok[] {
  return text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ text: t, norm: normalize(t.replace(/[.,!?;:"'«»“”()]+$/g, "").replace(/^[.,!?;:"'«»“”()]+/g, "")) }));
}

/**
 * Videodagi to'g'ri matnni (reference) ASR transkripsiyasiga moslaydi.
 * ASR so'zlari aniq VAQTNI beradi, reference esa aniq SO'ZLARNI. Ularni
 * ttoken-darajasida tekislab (Needleman-Wunsch), har bir reference so'ziga
 * mos ASR so'zining vaqtini beramiz. ASR yetishmagan so'zlar uchun vaqt
 * qo'shni so'zlar orasida taqsimlanadi.
 */
export function alignReferenceToTranscript(transcript: Transcript, referenceText: string): Transcript {
  const ref = tokenizeRef(referenceText);
  if (ref.length === 0) return transcript;

  const asr = transcript.segments.flatMap((s) => s.words);
  const duration = transcript.duration || (asr.length ? asr[asr.length - 1].end : 0);

  // ASR so'zlari bo'lmasa — reference'ni davomiylik bo'yicha teng taqsimlaymiz
  if (asr.length === 0) {
    const per = (duration || ref.length) / ref.length;
    const words: WordToken[] = ref.map((r, i) => ({
      word: r.text,
      start: i * per,
      end: (i + 1) * per,
    }));
    return { ...transcript, segments: groupWordsIntoSegments(words) };
  }

  const m = ref.length;
  const n = asr.length;
  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  // DP score matrix (m+1) x (n+1)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) dp[i][0] = i * GAP;
  for (let j = 1; j <= n; j++) dp[0][j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const same = ref[i - 1].norm && ref[i - 1].norm === normalize(asr[j - 1].word);
      const diag = dp[i - 1][j - 1] + (same ? MATCH : MISMATCH);
      const up = dp[i - 1][j] + GAP; // reference so'zi qo'shildi (ASR'da yo'q)
      const left = dp[i][j - 1] + GAP; // ASR so'zi tashlandi
      dp[i][j] = Math.max(diag, up, left);
    }
  }

  // Traceback — har reference so'ziga vaqt (yoki null) belgilaymiz
  const timed: Array<{ tok: RefTok; start: number | null; end: number | null }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = ref[i - 1].norm && ref[i - 1].norm === normalize(asr[j - 1].word);
      const score = dp[i][j];
      if (score === dp[i - 1][j - 1] + (same ? MATCH : MISMATCH)) {
        timed.push({ tok: ref[i - 1], start: asr[j - 1].start, end: asr[j - 1].end });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP) {
      // reference so'zi (ASR'da yo'q) — vaqt keyin interpolatsiya
      timed.push({ tok: ref[i - 1], start: null, end: null });
      i--;
      continue;
    }
    // ASR so'zi tashlandi
    j--;
  }
  timed.reverse();

  // Bo'sh (null) vaqtlarni qo'shnilar orasida taqsimlaymiz
  fillGaps(timed, duration);

  const words: WordToken[] = timed.map((t) => ({
    word: t.tok.text,
    start: t.start as number,
    end: t.end as number,
  }));

  // Monotonlik va minimal davomiylikni kafolatlaymiz
  for (let k = 0; k < words.length; k++) {
    if (k > 0 && words[k].start < words[k - 1].end) words[k].start = words[k - 1].end;
    if (words[k].end <= words[k].start) words[k].end = words[k].start + 0.15;
  }

  return { ...transcript, segments: groupWordsIntoSegments(words) };
}

function fillGaps(
  timed: Array<{ tok: RefTok; start: number | null; end: number | null }>,
  duration: number,
): void {
  // Boshlang'ich va oxirgi anchorlarni topib, null bloklarini teng taqsimlaymiz
  let k = 0;
  while (k < timed.length) {
    if (timed[k].start !== null) {
      k++;
      continue;
    }
    // null blok [k..r)
    let r = k;
    while (r < timed.length && timed[r].start === null) r++;
    const prevEnd = k > 0 ? (timed[k - 1].end as number) : 0;
    const nextStart = r < timed.length ? (timed[r].start as number) : duration || prevEnd + (r - k) * 0.3;
    const span = Math.max(0.1, nextStart - prevEnd);
    const per = span / (r - k);
    for (let x = k; x < r; x++) {
      timed[x].start = prevEnd + (x - k) * per;
      timed[x].end = prevEnd + (x - k + 1) * per;
    }
    k = r;
  }
}
