import { promises as fs } from "node:fs";
import { paths } from "./paths";
import { STYLE_PRESETS } from "./style-presets";
import { fontFamilyFromId } from "./fonts";
import { buildAssFile } from "./ass-generator";
import { burnSubtitles, probeVideo } from "./ffmpeg";
import { getJob, setStatus, updateJob, failJob, loadJobFromDisk } from "./jobs";
import type { Transcript } from "@/types/job";

export async function renderJob(
  jobId: string,
  presetId: string,
  fontId?: string,
): Promise<void> {
  const preset = STYLE_PRESETS[presetId];
  if (!preset) throw new Error(`Noma'lum style preset: ${presetId}`);
  const fontOverride = fontFamilyFromId(fontId) ?? undefined;

  const job = getJob(jobId) ?? (await loadJobFromDisk(jobId));
  if (!job) throw new Error("Job topilmadi");

  // transcript.json — haqiqat manbai. Har transcribe va qo'lda tahrir uni
  // diskka yozadi. Xotiradagi job.transcript dev rejimida eskirgan bo'lishi
  // mumkin (alohida modul nusxalari), shuning uchun avval diskdan o'qiymiz.
  let transcript: Transcript | undefined;
  try {
    const raw = await fs.readFile(paths.transcriptJson(jobId), "utf8");
    transcript = JSON.parse(raw) as Transcript;
  } catch {
    transcript = job.transcript;
  }
  if (!transcript) {
    throw new Error("Transkripsiya topilmadi — avval video transcribe qilinishi kerak");
  }

  updateJob(jobId, { preset: presetId, font: fontId });

  try {
    setStatus(jobId, "rendering", 0, "Video o'lchami aniqlanmoqda...");
    const meta = probeVideo(paths.sourceVideo(jobId));

    setStatus(jobId, "rendering", 2, "Subtitr fayl yaratilmoqda...");
    const ass = buildAssFile(
      transcript,
      preset,
      { width: meta.width, height: meta.height },
      fontOverride,
    );
    await fs.writeFile(paths.subtitleAss(jobId), ass, "utf8");

    setStatus(jobId, "rendering", 5, "Video tayyorlanmoqda...");
    await burnSubtitles(
      paths.sourceVideo(jobId),
      paths.subtitleAss(jobId),
      paths.outputVideo(jobId),
      (frac) => setStatus(jobId, "rendering", Math.max(5, Math.round(frac * 100))),
    );

    updateJob(jobId, {
      status: "done",
      progress: 100,
      message: "Tayyor — yuklab olish mumkin",
      error: undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failJob(jobId, message);
    throw err;
  }
}
