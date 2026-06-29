import { promises as fs } from "node:fs";
import type { Transcript, WordToken } from "@/types/job";
import { groupWordsIntoSegments } from "./segment-words";
import { ensureLatin } from "./cyrillic-latin";
import type { Transcriber } from "./transcribe-types";
import {
  getElevenLabsKeys,
  getCurrentIndex,
  setCurrentIndex,
  getKeyUsage,
  addKeyUsage,
  markKeyExhausted,
  maskKey,
} from "./elevenlabs-keys";

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const SKIP_MARGIN = 50; // qolgan kredit shundan kam bo'lsa — kalitni o'tkazib yuboramiz

interface ElevenWord {
  text: string;
  start?: number;
  end?: number;
  type?: "word" | "spacing" | "audio_event";
}
interface ElevenResponse {
  language_code?: string;
  language_probability?: number;
  text: string;
  words?: ElevenWord[];
}

class QuotaError extends Error {}

function toIso3(language: string): string {
  const map: Record<string, string> = {
    uz: "uzb",
    ru: "rus",
    en: "eng",
    tr: "tur",
    kk: "kaz",
    tg: "tgk",
  };
  return map[language] ?? language;
}

/** Bitta kalit bilan transkripsiya qiladi. Kredit tugagan bo'lsa QuotaError.
 *  Natija bilan birga sarflangan kreditni (character-cost) qaytaradi. */
async function transcribeWithKey(
  audioPath: string,
  language: string,
  apiKey: string,
): Promise<{ transcript: Transcript; cost: number }> {
  const model = process.env.ELEVENLABS_MODEL?.trim() || "scribe_v1";
  const buffer = await fs.readFile(audioPath);
  const blob = new Blob([new Uint8Array(buffer)], { type: "audio/wav" });

  const form = new FormData();
  form.append("file", blob, "audio.wav");
  form.append("model_id", model);
  form.append("language_code", toIso3(language));
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // 401 (unusual_activity/quota), 402 (payment), 429 (rate/quota) — kredit muammosi
    if (res.status === 401 || res.status === 402 || res.status === 429 || /quota|credit|limit/i.test(detail)) {
      throw new QuotaError(`Kredit tugagan (${res.status})`);
    }
    throw new Error(`ElevenLabs Scribe xatosi (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as ElevenResponse;
  const words: WordToken[] = (data.words ?? [])
    .filter((w) => w.type === "word" && typeof w.start === "number" && typeof w.end === "number")
    .map((w) => ({
      word: ensureLatin(w.text.trim()),
      start: w.start as number,
      end: w.end as number,
    }))
    .filter((w) => w.word.length > 0);

  const segments =
    words.length > 0
      ? groupWordsIntoSegments(words)
      : [{ start: 0, end: 0, text: data.text ?? "", words: [] }];
  const duration = words.length > 0 ? words[words.length - 1].end : 0;

  const cost = Number(res.headers.get("character-cost") ?? 0) || 0;
  return {
    transcript: { language: data.language_code ?? language, duration, segments },
    cost,
  };
}

export const elevenLabsTranscriber: Transcriber = {
  async transcribe(audioPath, language) {
    const keys = getElevenLabsKeys();
    if (keys.length === 0) throw new Error("ELEVENLABS kaliti topilmadi");

    const start = (await getCurrentIndex()) % keys.length;
    // currentIndex'dan boshlab aylanma tartibda sinaymiz. Lokal hisobda krediti
    // kam qolgan kalitni o'tkazib yuboramiz; STT kredit xatosi (QuotaError) bo'lsa
    // o'sha kalitni tugagan deb belgilab keyingisiga o'tamiz.
    for (let off = 0; off < keys.length; off++) {
      const idx = (start + off) % keys.length;
      const key = keys[idx];

      const { remaining } = await getKeyUsage(key);
      if (remaining < SKIP_MARGIN) {
        continue; // lokal hisobda kredit tugagan — keyingisi
      }

      try {
        const { transcript, cost } = await transcribeWithKey(audioPath, language, key);
        await addKeyUsage(key, cost);
        await setCurrentIndex(idx);
        console.log(`[elevenlabs] kalit #${idx + 1} ${maskKey(key)} (cost ${cost})`);
        return transcript;
      } catch (e) {
        if (e instanceof QuotaError) {
          await markKeyExhausted(key);
          console.log(`[elevenlabs] kalit #${idx + 1} ${maskKey(key)} kredit tugadi, keyingisiga`);
          continue;
        }
        throw e;
      }
    }

    throw new QuotaError("Barcha ElevenLabs kalitlarida kredit tugagan");
  },
};

export class ElevenLabsQuotaError extends QuotaError {}
export { QuotaError };
