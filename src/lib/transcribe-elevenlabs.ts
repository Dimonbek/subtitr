import { promises as fs } from "node:fs";
import type { Transcript, WordToken } from "@/types/job";
import { groupWordsIntoSegments } from "./segment-words";
import { ensureLatin } from "./cyrillic-latin";
import type { Transcriber } from "./transcribe-types";

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";

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

// ISO-639-1 ("uz") → ElevenLabs ISO-639-3 ("uzb")
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

export const elevenLabsTranscriber: Transcriber = {
  async transcribe(audioPath, language) {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY topilmadi");

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
      throw new Error(`ElevenLabs Scribe xatosi (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as ElevenResponse;

    const words: WordToken[] = (data.words ?? [])
      .filter((w) => w.type === "word" && typeof w.start === "number" && typeof w.end === "number")
      .map((w) => ({
        // ElevenLabs ba'zan kirill qaytaradi — har bir so'zni lotinga o'giramiz
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

    return {
      language: data.language_code ?? language,
      duration,
      segments,
    };
  },
};
