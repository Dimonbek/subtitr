import path from "node:path";
import { promises as fs } from "node:fs";

// Saqlash papkasi. Production (Railway/Docker) da DATA_DIR env orqali
// volume yo'lini berish mumkin. Default — loyiha ildizidagi `data/`.
const ROOT = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "data");

export const paths = {
  root: ROOT,
  uploadsDir: (jobId: string) => path.join(ROOT, "uploads", jobId),
  outputDir: (jobId: string) => path.join(ROOT, "output", jobId),
  sourceVideo: (jobId: string) => path.join(ROOT, "uploads", jobId, "source.mp4"),
  audioWav: (jobId: string) => path.join(ROOT, "uploads", jobId, "audio.wav"),
  transcriptJson: (jobId: string) => path.join(ROOT, "output", jobId, "transcript.json"),
  subtitleAss: (jobId: string) => path.join(ROOT, "output", jobId, "subtitles.ass"),
  outputVideo: (jobId: string) => path.join(ROOT, "output", jobId, "output.mp4"),
  jobStateJson: (jobId: string) => path.join(ROOT, "output", jobId, "state.json"),
};

export async function ensureJobDirs(jobId: string): Promise<void> {
  await fs.mkdir(paths.uploadsDir(jobId), { recursive: true });
  await fs.mkdir(paths.outputDir(jobId), { recursive: true });
}
