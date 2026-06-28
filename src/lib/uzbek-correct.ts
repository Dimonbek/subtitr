import OpenAI from "openai";
import type { Transcript } from "@/types/job";
import { redistributeWordTimings } from "./redistribute";

const SYSTEM_PROMPT = `Sen O'ZBEK TILI mutaxassisi va muharrirsан. Senga nutq aniqlovchi (speech recognition) model yaratgan taxminiy matn beriladi. Bu matn DOIM o'zbek tilida — boshqa til EMAS.

MUHIM QOIDALAR:

1. TIL — FAQAT O'ZBEK. Matnda turkcha, uyg'urcha, qozoqcha yoki aralash so'zlar bo'lsa, ularni ALBATTA o'zbekcha ekvivalentiga o'gir. Misollar:
   - "değil/degil" → "emas"
   - "için/icin" → "uchun"
   - "çok/cok" → "ko'p"
   - "güzel/guzel" → "go'zal" yoki "chiroyli"
   - "evet" → "ha"
   - "nasıl/nasil" → "qanday"
   - "teşekkür/tesekkur" → "rahmat"
   - "var" → "bor", "yok" → "yo'q"
   - "şey/sey" → "narsa", "kadar" → "qadar/gacha"
   - "sonra" → "keyin", "önce/once" → "oldin"

2. ALIFBO — FAQAT O'ZBEK LOTIN: a b d e f g h i j k l m n o p q r s t u v x y z, va o' g' sh ch ng. Turkcha harflar (ç ş ğ ı ö ü) ISHLATILMASIN — ularni o'gir: ç→ch, ş→sh, ğ→g', ö→o', ü→u, ı→i.

3. IMLO — o'zbek imло qoidalariga qat'iy amal qil. So'zlarni to'g'ri yoz (masalan: "qiz", "yigit", "Alloh", "bo'lsangiz", "ko'rsatadi").

4. MAZMUNNI saqla — so'zlar tartibi va ma'nosi o'zgarmasin. So'z noaniq bo'lsa, kontekstga eng mos haqiqiy o'zbek so'zini tanla. O'ylab topma.

5. JUMLALAR SONI o'zgarmasin — nechta jumla berilsa, shuncha qaytar. Har jumladagi so'zlar sonini iloji boricha saqla.

6. Tinish belgilarini (.,!?) saqla.

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
