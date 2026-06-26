import type { Transcript, TranscriptSegment } from "@/types/job";

/**
 * Segmentlardagi matn o'zgartirilgandan keyin so'z timestamp'larini yangilaydi.
 *
 * MUHIM: agar yangi so'zlar soni eski bilan bir xil bo'lsa — har so'zning
 * ASL (haqiqiy) timestamp'i saqlanadi (faqat matn almashadi). Bu ovoz bilan
 * sinxronni buzmaydi. Faqat so'zlar soni o'zgarsa — segment davomida teng
 * taqsimlanadi (fallback).
 */
export function redistributeWordTimings(
  transcript: Transcript,
  newTexts: string[],
): Transcript {
  if (newTexts.length !== transcript.segments.length) {
    throw new Error(
      `Matnlar soni mos kelmadi: ${newTexts.length} vs ${transcript.segments.length}`,
    );
  }

  const segments: TranscriptSegment[] = transcript.segments.map((seg, i) => {
    const newText = (newTexts[i] ?? "").trim();
    if (!newText) {
      return { ...seg, text: "", words: [] };
    }
    const words = newText.split(/\s+/).filter(Boolean);

    // So'zlar soni o'zgarmagan — asl timestamp'larni saqlaymiz (sinxron buzilmaydi)
    if (seg.words.length === words.length && seg.words.length > 0) {
      return {
        start: seg.start,
        end: seg.end,
        text: newText,
        words: words.map((w, j) => ({
          word: w,
          start: seg.words[j].start,
          end: seg.words[j].end,
        })),
      };
    }

    // So'zlar soni o'zgargan — teng taqsimlash (fallback)
    const duration = Math.max(0.1, seg.end - seg.start);
    const perWord = duration / Math.max(1, words.length);
    return {
      start: seg.start,
      end: seg.end,
      text: newText,
      words: words.map((w, j) => ({
        word: w,
        start: seg.start + j * perWord,
        end: seg.start + (j + 1) * perWord,
      })),
    };
  });

  return { ...transcript, segments };
}
