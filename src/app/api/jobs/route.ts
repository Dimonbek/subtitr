import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { paths, ensureJobDirs } from "@/lib/paths";
import { setJob } from "@/lib/jobs";
import { startProcessing } from "@/lib/pipeline";
import type { Job } from "@/types/job";

export const runtime = "nodejs";

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 524_288_000);

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
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(paths.sourceVideo(jobId), buffer);
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
