import OpenAI from "openai";
import type { Transcript } from "@/types/job";
import { redistributeWordTimings } from "./redistribute";

const SYSTEM_PROMPT = `Sen o'zbek tilidagi matnni tuzatuvchi mutaxassissan. Senga nutq aniqlovchi (speech recognition) modeli tomonidan yaratilgan taxminiy o'zbek matn beriladi. Vazifang:

1. Imloviy va grammatik xatolarni tuzatish
2. So'zlar tartibi va MAZMUNINI to'liq saqlash
3. So'zlar sonini taxminan saqlash (1-2 so'z farq bo'lishi mumkin)
4. Sof o'zbek lotin alifbosida yozish (apostrofli: o', g', sh, ch)
5. Yangi so'zlar qo'shma yoki o'ylab topma — agar so'z noaniq bo'lsa, eng yaqin haqiqiy o'zbek so'zini tanla
6. Tinish belgilarini saqlash

Javobni faqat shu JSON formatda ber, boshqa hech narsa yozma:
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
    return transcript;
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
      return transcript;
    }

    const parsed = JSON.parse(raw) as { corrected?: string[] };
    const corrected = Array.isArray(parsed.corrected) ? parsed.corrected : null;
    if (!corrected || corrected.length !== segments.length) {
      console.warn(
        `[uzbek-correct] Sonlar mos kelmadi (${corrected?.length} vs ${segments.length}), original qaytariladi`,
      );
      return transcript;
    }

    return redistributeWordTimings(transcript, corrected);
  } catch (err) {
    console.warn("[uzbek-correct] xato, original qaytariladi:", err);
    return transcript;
  }
}
