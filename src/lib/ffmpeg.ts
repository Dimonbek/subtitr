import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";

export const FFMPEG_PATH: string = process.env.FFMPEG_PATH ?? ffmpegStatic ?? "ffmpeg";

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

export function probeVideo(videoPath: string): VideoMetadata {
  const res = spawnSync(FFMPEG_PATH, ["-hide_banner", "-i", videoPath], {
    encoding: "utf8",
  });
  // ffmpeg ma'lumotni "input missing" sababli stderr ga yozadi va 1 bilan chiqadi — bu normal
  const stderr = res.stderr ?? "";

  let width = 0;
  let height = 0;
  let duration = 0;
  let fps = 30;

  const resM = /(\d{2,5})x(\d{2,5})/.exec(stderr);
  if (resM) {
    width = Number(resM[1]);
    height = Number(resM[2]);
  }
  const durM = /Duration:\s+(\d+):(\d+):([\d.]+)/.exec(stderr);
  if (durM) {
    duration = Number(durM[1]) * 3600 + Number(durM[2]) * 60 + Number(durM[3]);
  }
  const fpsM = /(\d+(?:\.\d+)?)\s*fps/.exec(stderr);
  if (fpsM) fps = Number(fpsM[1]);

  if (!width || !height) {
    throw new Error("Video o'lchamlarini aniqlab bo'lmadi");
  }
  return { width, height, duration, fps };
}

interface RunOptions {
  args: string[];
  onProgressLine?: (line: string) => void;
  onDuration?: (seconds: number) => void;
}

export function runFfmpeg({ args, onProgressLine, onDuration }: RunOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      const lines = chunk.split(/\r?\n|\r/);
      for (const line of lines) {
        if (!line) continue;
        onProgressLine?.(line);
        if (onDuration) {
          const m = /Duration:\s+(\d+):(\d+):([\d.]+)/.exec(line);
          if (m) {
            const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
            onDuration(seconds);
          }
        }
      }
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code} bilan tugadi:\n${stderr.slice(-500)}`));
    });
  });
}

export function parseTimecode(line: string): number | null {
  const m = /time=(\d+):(\d+):([\d.]+)/.exec(line);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export async function extractAudio(
  videoPath: string,
  audioPath: string,
  onProgress?: (fraction: number) => void,
): Promise<number> {
  // Audio filterlar — nutq aniqligi uchun:
  //   highpass=f=80     — past chastotali shovqin (g'ovur, mikrofon rumble) o'chiriladi
  //   lowpass=f=8000    — yuqori chastota cheklovi (Whisper 16kHz da ishlaydi)
  //   dynaudnorm        — dinamik hajm normalizatsiyasi (jim joylar baland qilinadi)
  //   loudnorm I=-16    — yakuniy hajm darajasi (mobil videolar uchun standart)
  const audioFilter =
    "highpass=f=80,lowpass=f=8000,dynaudnorm=f=200:g=15:p=0.95,loudnorm=I=-16:LRA=11:TP=-1.5";
  let duration = 0;
  await runFfmpeg({
    args: [
      "-y",
      "-i",
      videoPath,
      "-vn",
      "-af",
      audioFilter,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "wav",
      audioPath,
    ],
    onDuration: (d) => {
      duration = d;
    },
    onProgressLine: (line) => {
      if (!duration || !onProgress) return;
      const t = parseTimecode(line);
      if (t !== null) onProgress(Math.min(1, t / duration));
    },
  });
  return duration;
}

// Loyiha ichidagi shriftlar papkasi — libass shu yerdan yuklaydi (tizimga
// font o'rnatish shart emas, Docker ham kerak emas).
export const FONTS_DIR: string = process.env.FONTS_DIR ?? path.resolve(process.cwd(), "fonts");

export async function burnSubtitles(
  videoPath: string,
  subtitlePath: string,
  outputPath: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  let duration = 0;
  const assArg = escapeForFilter(subtitlePath);
  const fontsArg = escapeForFilter(FONTS_DIR);
  await runFfmpeg({
    args: [
      "-y",
      "-i",
      videoPath,
      "-vf",
      // fontsdir — shriftlarni loyiha papkasidan yuklaydi
      `ass=f=${assArg}:fontsdir=${fontsArg}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-c:a",
      "copy",
      outputPath,
    ],
    onDuration: (d) => {
      duration = d;
    },
    onProgressLine: (line) => {
      if (!duration || !onProgress) return;
      const t = parseTimecode(line);
      if (t !== null) onProgress(Math.min(1, t / duration));
    },
  });
}

function escapeForFilter(p: string): string {
  // FFmpeg filter yo'llarini escape qiladi: backslash → forward slash,
  // ':' → '\:' (Windows disk harfi uchun), keyin butunni '...' ichiga olamiz.
  const normalized = p.replace(/\\/g, "/").replace(/:/g, "\\:");
  return `'${normalized}'`;
}
