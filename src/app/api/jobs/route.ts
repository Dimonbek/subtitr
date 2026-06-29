import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { paths, ensureJobDirs } from "@/lib/paths";
import { setJob } from "@/lib/jobs";
import { startProcessing } from "@/lib/pipeline";
import type { Job } from "@/types/job";

export const runtime = "nodejs";

// Default 200MB. Railway'da MAX_UPLOAD_BYTES env bilan o'zgartiriladi.
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 209_715_200);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Yuklash ma'lumotlarini o'qib bo'lmadi" }, { status: 400 });
  }

  const file = formData.get("video");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Video fayl topilmadi" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fayl bo'sh" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Fayl juda katta. Maksimal o'lcham: ${(MAX_BYTES / (1024 * 1024)).toFixed(0)} MB` },
      { status: 413 },
    );
  }

  const jobId = randomUUID();
  await ensureJobDirs(jobId);

  try {
    // Faylni bo'lak-bo'lak diskka yozamiz (butun faylni xotiraga ikki marta
    // nusxalamaslik uchun — arrayBuffer() o'rniga stream).
    const nodeStream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
    await pipeline(nodeStream, createWriteStream(paths.sourceVideo(jobId)));
  } catch (err) {
    console.error("[upload] yozish xatosi", err);
    return NextResponse.json({ error: "Faylni saqlashda xato" }, { status: 500 });
  }

  const now = Date.now();
  const job: Job = {
    id: jobId,
    status: "uploading",
    progress: 100,
    sourceFilename: file.name,
    sourceSize: file.size,
    createdAt: now,
    updatedAt: now,
  };
  setJob(job);

  void startProcessing(jobId).catch((err: unknown) => {
    console.error("[pipeline] xato", err);
  });

  return NextResponse.json({ id: jobId });
}
