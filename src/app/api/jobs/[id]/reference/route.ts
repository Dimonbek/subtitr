import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { paths } from "@/lib/paths";
import { getJobFresh, updateJob } from "@/lib/jobs";
import { alignReferenceToTranscript } from "@/lib/align-text";
import type { Transcript } from "@/types/job";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(20000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobFresh(id);
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  // Transkriptni diskdan (haqiqat manbai) o'qiymiz
  let transcript: Transcript | undefined = job.transcript;
  try {
    const raw = await fs.readFile(paths.transcriptJson(id), "utf8");
    transcript = JSON.parse(raw) as Transcript;
  } catch {
    /* xotiradan */
  }
  if (!transcript) {
    return NextResponse.json({ error: "Transkripsiya topilmadi" }, { status: 404 });
  }

  let body: { text: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Matn noto'g'ri" }, { status: 400 });
  }

  const updated = alignReferenceToTranscript(transcript, body.text);
  await fs.writeFile(paths.transcriptJson(id), JSON.stringify(updated, null, 2), "utf8");
  updateJob(id, { transcript: updated });

  return NextResponse.json({ ok: true });
}
