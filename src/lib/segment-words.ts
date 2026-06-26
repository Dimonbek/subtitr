import type { TranscriptSegment, WordToken } from "@/types/job";

const SENTENCE_END = /[.!?…]$/;
const MAX_WORDS_PER_SEGMENT = 14;
const MAX_SEGMENT_DURATION = 6;
const PAUSE_GAP = 0.8;

/**
 * Word token'lardan segmentlar yasaydi. ElevenLabs kabi segment qaytarmaydigan
 * API'lar uchun: jumla oxiri (. ! ?), uzoq pauza yoki maksimal uzunlik bo'yicha bo'ladi.
 */
export function groupWordsIntoSegments(words: WordToken[]): TranscriptSegment[] {
  if (words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let current: WordToken[] = [];
  let segStart = words[0].start;

  const flush = () => {
    if (current.length === 0) return;
    segments.push({
      start: segStart,
      end: current[current.length - 1].end,
      text: current.map((w) => w.word).join(" ").replace(/\s+([.,!?;:])/g, "$1").trim(),
      words: [...current],
    });
    current = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (current.length === 0) segStart = w.start;
    current.push(w);

    const next = words[i + 1];
    const gap = next ? next.start - w.end : 0;
    const elapsed = w.end - segStart;
    const sentenceEnd = SENTENCE_END.test(w.word.trim());

    if (
      sentenceEnd ||
      current.length >= MAX_WORDS_PER_SEGMENT ||
      elapsed >= MAX_SEGMENT_DURATION ||
      (next && gap >= PAUSE_GAP)
    ) {
      flush();
    }
  }
  flush();
  return segments;
}
