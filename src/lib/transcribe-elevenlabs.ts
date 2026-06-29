import { promises as fs } from "node:fs";
import type { Transcript, WordToken } from "@/types/job";
import { groupWordsIntoSegments } from "./segment-words";
import { ensureLatin } from "./cyrillic-latin";
import type { Transcriber } from "./transcribe-types";
import { getElevenLabsKeys, getCurrentIndex, setCurrentIndex, maskKey } from "./elevenlabs-keys";
import { getElevenLabsUsage } from "./elevenlabs-usage";

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
// Kalitda shu kreditdan kam qolsa — keyingisiga o'tamiz
const MIN_CREDITS = 50;

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

/** Bitta kalit bilan transkripsiya qiladi. Kredit tugagan bo'lsa QuotaError. */
async function transcribeWithKey(
  audioPath: string,
  language: string,
  apiKey: string,
): Promise<Transcript> {
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

  return { language: data.language_code ?? language, duration, segments };
}

export const elevenLabsTranscriber: Transcriber = {
  async transcribe(audioPath, language) {
    const keys = getElevenLabsKeys();
    if (keys.length === 0) throw new Error("ELEVENLABS kaliti topilmadi");

    const start = (await getCurrentIndex()) % keys.length;
    // currentIndex'dan boshlab aylanma tartibda sinaymiz
    for (let off = 0; off < keys.length; off++) {
      const idx = (start + off) % keys.length;
      const key = keys[idx];

      // Avval qolgan kreditni tekshiramiz (arzon API chaqiruvi)
      const usage = await getElevenLabsUsage(key);
      if (usage.available && usage.remaining < MIN_CREDITS) {
        console.log(`[elevenlabs] kalit ${maskKey(key)} kredit tugagan (${usage.remaining}), keyingisi`);
        continue;
      }

      try {
        const result = await transcribeWithKey(audioPath, language, key);
        await setCurrentIndex(idx); // muvaffaqiyatli — shu kalitda qolamiz
        console.log(`[elevenlabs] kalit ${maskKey(key)} ishlatildi`);
        return result;
      } catch (e) {
        if (e instanceof QuotaError) {
          console.log(`[elevenlabs] kalit ${maskKey(key)} kredit tugadi, keyingisiga o'tamiz`);
          continue;
        }
        throw e; // haqiqiy xato — boshqa kalitlarni behuda sarflamaymiz
      }
    }

    throw new QuotaError("Barcha ElevenLabs kalitlarida kredit tugagan");
  },
};

export class ElevenLabsQuotaError extends QuotaError {}
export { QuotaError };
