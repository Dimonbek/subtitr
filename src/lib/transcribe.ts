import { createReadStream } from "node:fs";
import OpenAI from "openai";
import type { Transcript, TranscriptSegment, WordToken } from "@/types/job";
import type { Transcriber } from "./transcribe-types";
import { elevenLabsTranscriber, QuotaError } from "./transcribe-elevenlabs";
import { getElevenLabsKeys } from "./elevenlabs-keys";

export type { Transcriber } from "./transcribe-types";

interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  providerName: string;
}

function resolveWhisperProvider(): ProviderConfig {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const modelOverride = process.env.WHISPER_MODEL?.trim();

  if (groqKey) {
    return {
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
      model:
        modelOverride && modelOverride.startsWith("whisper-large")
          ? modelOverride
          : "whisper-large-v3",
      providerName: "Groq",
    };
  }
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      model: modelOverride === "whisper-1" || !modelOverride ? "whisper-1" : modelOverride,
      providerName: "OpenAI",
    };
  }
  throw new Error(
    "Transkripsiya API kaliti topilmadi. `.env.local` da ELEVENLABS_API_KEY, GROQ_API_KEY yoki OPENAI_API_KEY sozlang.",
  );
}

let cachedClient: OpenAI | null = null;
let cachedConfig: ProviderConfig | null = null;

function getWhisperClient(): { client: OpenAI; config: ProviderConfig } {
  if (cachedClient && cachedConfig) return { client: cachedClient, config: cachedConfig };
  const config = resolveWhisperProvider();
  cachedClient = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  cachedConfig = config;
  return { client: cachedClient, config };
}

// Whisper'ga "oldingi suhbat konteksti" sifatida yuboriladigan prompt.
// ElevenLabs'da ishlatilmaydi (u prompt qabul qilmaydi).
const UZBEK_PROMPT =
  "Assalomu alaykum, qadrli do'stlar. Bu yozuv o'zbek tilida olib boriladi. " +
  "Bizning oilamizda mehr-oqibat bor. Otam ishlaydi, onam uy ishlarini bajaradi. " +
  "Akam universitetda o'qiydi. Yigit-qizlar bir-birini hurmat qiladi. " +
  "Bunday yigitga tegishlidir har qanday yaxshi xulq. Agar yigit haqiqiy Allohdan " +
  "qo'rqadigan musulmon bo'lsa, qizini berib bo'lsangiz afsuslanmaysiz. Agar yaxshi " +
  "ko'rsa izzat-ikrom ko'rsatadi, agar yomon ko'rmasa zulm va qattiqlik qilmaydi. " +
  "Har bir musulmon Allohga iymon keltirishi, namoz o'qishi, ro'za tutishi kerak. " +
  "Halol mehnat qilish, yaqinlarni qadrlash, do'stlarga sodiq bo'lish lozim. " +
  "Bu matn faqat o'zbek lotin alifbosida yozilgan. Turkcha harflar (ç, ş, ğ, ö, ü, ı) yoki " +
  "turkcha so'zlar (evet, hayır, yok, değil, arkadaş, yapıyor) mutlaqo ishlatilmasin. " +
  "Faqat o'zbekcha ch, sh, g', o', u, i harflari va o'zbekcha so'zlar bo'lishi shart.";

export const whisperTranscriber: Transcriber = {
  async transcribe(audioPath, language) {
    const { client, config } = getWhisperClient();
    const file = createReadStream(audioPath);
    const result = await client.audio.transcriptions.create({
      file,
      model: config.model,
      language,
      prompt: language === "uz" ? UZBEK_PROMPT : undefined,
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    });

    interface RawWord {
      word: string;
      start: number;
      end: number;
    }
    interface RawSegment {
      start: number;
      end: number;
      text: string;
    }

    const r = result as unknown as {
      language: string;
      duration: number;
      words?: RawWord[];
      segments?: RawSegment[];
      text: string;
    };

    const words: WordToken[] = (r.words ?? []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    const segments: TranscriptSegment[] = (r.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      words: words.filter((w) => w.start >= s.start - 0.01 && w.end <= s.end + 0.01),
    }));

    if (segments.length === 0 && words.length > 0) {
      segments.push({
        start: words[0].start,
        end: words[words.length - 1].end,
        text: r.text,
        words,
      });
    }
    if (segments.length === 0 && r.text) {
      segments.push({ start: 0, end: r.duration ?? 0, text: r.text, words: [] });
    }

    return { language: r.language, duration: r.duration, segments };
  },
};

export type ProviderKind = "elevenlabs" | "whisper";

/**
 * Mavjud API kalitiga qarab eng yaxshi transkriberni tanlaydi.
 * Ustuvorlik: ElevenLabs Scribe (o'zbek uchun eng aniq) > Groq/OpenAI Whisper.
 */
function resolveTranscriber(): { transcriber: Transcriber; kind: ProviderKind; name: string } {
  if (getElevenLabsKeys().length > 0) {
    return { transcriber: elevenLabsTranscriber, kind: "elevenlabs", name: "ElevenLabs Scribe" };
  }
  return { transcriber: whisperTranscriber, kind: "whisper", name: "Whisper" };
}

function hasWhisperKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}

/** Hozir faol bo'lgan provider turini qaytaradi (post-processing intensivligini tanlash uchun). */
export function getActiveProviderKind(): ProviderKind {
  return resolveTranscriber().kind;
}

export const defaultTranscriber: Transcriber = {
  async transcribe(audioPath, language) {
    const { transcriber, kind, name } = resolveTranscriber();
    console.log(`[transcribe] provider: ${name}`);
    try {
      return await transcriber.transcribe(audioPath, language);
    } catch (e) {
      // ElevenLabs'ning barcha kalitlarida kredit tugagan bo'lsa — Whisper'ga o'tamiz
      if (kind === "elevenlabs" && e instanceof QuotaError && hasWhisperKey()) {
        console.warn("[transcribe] ElevenLabs kredit tugadi → Groq Whisper'ga o'tildi");
        return whisperTranscriber.transcribe(audioPath, language);
      }
      throw e;
    }
  },
};
