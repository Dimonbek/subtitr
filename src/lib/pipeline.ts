import { promises as fs } from "node:fs";
import { paths } from "./paths";
import { extractAudio } from "./ffmpeg";
import { defaultTranscriber, getActiveProviderKind } from "./transcribe";
import { correctUzbekTranscript } from "./uzbek-correct";
import { correctTranscriptWithDict } from "./uzbek-dict";
import { setStatus, updateJob, failJob } from "./jobs";

export async function startProcessing(jobId: string): Promise<void> {
  try {
    setStatus(jobId, "extracting_audio", 0, "Audio chiqarilmoqda va tozalanmoqda...");
    const duration = await extractAudio(
      paths.sourceVideo(jobId),
      paths.audioWav(jobId),
      (frac) => setStatus(jobId, "extracting_audio", Math.round(frac * 100)),
    );

    updateJob(jobId, { duration });

    await runTranscription(jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failJob(jobId, message);
  }
}

export async function retranscribeJob(jobId: string): Promise<void> {
  try {
    // Yangi audio filtrlarni qo'llash uchun audioni qayta chiqaramiz
    setStatus(jobId, "extracting_audio", 0, "Audio qayta tozalanmoqda...");
    await extractAudio(paths.sourceVideo(jobId), paths.audioWav(jobId), (frac) =>
      setStatus(jobId, "extracting_audio", Math.round(frac * 100)),
    );
    await runTranscription(jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failJob(jobId, message);
  }
}

async function runTranscription(jobId: string): Promise<void> {
  const provider = getActiveProviderKind();
  const isHighAccuracy = provider === "elevenlabs";

  setStatus(jobId, "transcribing", 0, "Nutq aniqlanmoqda...");
  const raw = await defaultTranscriber.transcribe(paths.audioWav(jobId), "uz");

  let transcript = raw;
  // Post-processing:
  //   • lug'at fuzzy: ENDI har doim yoqiq — 93k so'zli lug'at + qo'shimcha-ajratuvchi
  //     validator tufayli to'g'ri so'zlar buzilmaydi, faqat g'aliz so'zlar tuzatiladi.
  //   • LLM: ElevenLabs'da default o'chiq (deterministik lug'at yetarli, hallucination yo'q);
  //     Whisper'da yoqiq (zaif ASR uchun kontekst kerak).
  const useDict = process.env.UZBEK_DICT !== "off";
  const useFuzzy = useDict; // katta lug'at + validator -> xavfsiz
  const useLlm = isHighAccuracy
    ? process.env.UZBEK_CORRECTION === "on" // ElevenLabs'da default o'chiq, faqat majburlasa
    : process.env.UZBEK_CORRECTION !== "off"; // Whisper'da default yoqiq

  // 1-bosqich: Lug'at
  if (useDict) {
    setStatus(jobId, "transcribing", 50, "O'zbek lug'ati bilan tuzatilmoqda...");
    try {
      transcript = await correctTranscriptWithDict(transcript, { fuzzy: useFuzzy });
    } catch (e) {
      console.warn("[dict] xato, o'tib ketamiz:", e);
    }
  }

  // 2-bosqich: LLM
  if (useLlm) {
    setStatus(jobId, "transcribing", 75, "O'zbek imlosi tuzatilmoqda (LLM)...");
    transcript = await correctUzbekTranscript(transcript);
  }

  await fs.writeFile(
    paths.transcriptJson(jobId),
    JSON.stringify(transcript, null, 2),
    "utf8",
  );

  updateJob(jobId, {
    status: "ready_to_render",
    progress: 100,
    transcript,
    message: "Tayyor — uslubni tanlang",
    error: undefined,
  });
}
