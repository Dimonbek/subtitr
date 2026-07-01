import OpenAI from "openai";
import type { Transcript } from "@/types/job";
import { redistributeWordTimings } from "./redistribute";
import { turkishToUzbek } from "./turkish-to-uzbek";

const SYSTEM_PROMPT = `Sen o'zbek tili imlo muharririsan. Senga nutq aniqlovchi (speech recognition) model yaratgan o'zbekcha matn beriladi. Vazifang — faqat IMLO xatolarini to'g'rilash.

QAT'IY QOIDALAR:

1. TARJIMA QILMA. So'zlarni boshqa so'zga (sinonimga) almashtirma. Faqat noto'g'ri YOZILGAN so'zni to'g'ri yozilishiga keltir. Masalan "qizizi" → "qizini" (imlo), lekin "buyuk" so'zini "katta"ga O'ZGARTIRMA — u o'zbekcha so'z, joyida qoladi.

2. ALIFBO — faqat o'zbek lotin alifbosi: a b d e f g h i j k l m n o p q r s t u v x y z, va o' g' sh ch ng. Turkcha harflar (ç ş ğ ı ö ü) bo'lsa o'zbekchasiga: ç→ch, ş→sh, ğ→g', ö→o', ü→u, ı→i.

3. TURKCHA SO'ZLARNI O'ZBEKCHALASHTIR. Agar matnda turkcha so'zlar (masalan: "evet", "hayır", "yapıyor", "değil", "çünkü" kabi) uchrab qolsa, ularni butunlay o'zbekcha so'zlarga almashtir (evet -> ha, hayır -> yo'q, yapıyor -> qilyapti, değil -> emas, çünkü -> chunki va hokazo). Hech qanday turkcha so'z yoki turkcha ohang qolmasligi kerak, matn faqat toza o'zbek tilida bo'lishi shart.

4. So'z allaqachon to'g'ri o'zbekcha bo'lsa — TEGMA, o'sha holicha qoldir.

5. So'zlar SONI, TARTIBI va MA'NOSI o'zgarmasin. Yangi so'z qo'shma, so'z o'chirma.

6. JUMLALAR SONI o'zgarmasin — nechta jumla berilsa, shuncha qaytar.

7. Tinish belgilarini (.,!?) saqla.

Javobni FAQAT shu JSON formatda ber, boshqa hech narsa yozma:
{"corrected": ["1-jumla", "2-jumla", "3-jumla"]}`;

interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
}

function resolveLlmProvider(): ProviderConfig | null {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const modelOverride = process.env.LLM_MODEL?.trim();
  if (groqKey) {
    return {
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
      model: modelOverride || "llama-3.3-70b-versatile",
    };
  }
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      model: modelOverride || "gpt-4o-mini",
    };
  }
  return null;
}

let cached: { client: OpenAI; config: ProviderConfig } | null = null;
function getClient() {
  if (cached) return cached;
  const config = resolveLlmProvider();
  if (!config) return null;
  cached = {
    client: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
    config,
  };
  return cached;
}

/** Turkcha harflarni matndan tozalash funksiyasi */
function cleanTranscriptTurkish(transcript: Transcript): Transcript {
  return {
    ...transcript,
    segments: transcript.segments.map((seg) => ({
      ...seg,
      text: turkishToUzbek(seg.text),
      words: seg.words.map((w) => ({
        ...w,
        word: turkishToUzbek(w.word),
      })),
    })),
  };
}

/**
 * Whisper transkripsiyasini Groq LLM orqali o'zbek imlosiga moslashtirish.
 * Xatolik bo'lsa original transkriptni qaytaradi (graceful fallback).
 */
export async function correctUzbekTranscript(transcript: Transcript): Promise<Transcript> {
  const segments = transcript.segments;
  if (segments.length === 0) return transcript;

  const provider = getClient();
  if (!provider) {
    console.warn("[uzbek-correct] LLM provider topilmadi, original qaytariladi");
    return cleanTranscriptTurkish(transcript);
  }
  const { client, config } = provider;

  const userMessage = segments
    .map((s, i) => `${i + 1}. ${s.text.trim()}`)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Quyidagi ${segments.length} ta jumlani tuzating:\n\n${userMessage}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.warn("[uzbek-correct] Bo'sh javob, original qaytariladi");
      return cleanTranscriptTurkish(transcript);
    }

    const parsed = JSON.parse(raw) as { corrected?: string[] };
    const corrected = Array.isArray(parsed.corrected)
      ? parsed.corrected.map((s) => turkishToUzbek(s))
      : null;
    if (!corrected || corrected.length !== segments.length) {
      console.warn(
        `[uzbek-correct] Sonlar mos kelmadi (${corrected?.length} vs ${segments.length}), original qaytariladi`,
      );
      return cleanTranscriptTurkish(transcript);
    }

    const redistributed = redistributeWordTimings(transcript, corrected);
    return cleanTranscriptTurkish(redistributed);
  } catch (err) {
    console.warn("[uzbek-correct] xato, original qaytariladi:", err);
    return cleanTranscriptTurkish(transcript);
  }
}
