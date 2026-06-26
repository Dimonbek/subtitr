import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { paths } from "@/lib/paths";
import { getJobFresh, updateJob } from "@/lib/jobs";
import { redistributeWordTimings } from "@/lib/redistribute";
import type { Transcript } from "@/types/job";

export const runtime = "nodejs";

const schema = z.object({
  segments: z.array(z.string()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJobFresh(id);
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  // Transkriptni diskdan (haqiqat manbai) o'qiymiz — xotira eskirgan bo'lishi mumkin
  let transcript: Transcript | undefined = job.transcript;
  try {
    const raw = await fs.readFile(paths.transcriptJson(id), "utf8");
    transcript = JSON.parse(raw) as Transcript;
  } catch {
    /* diskda yo'q — xotiradan foydalanamiz */
  }
  if (!transcript) {
    return NextResponse.json({ error: "Transkripsiya topilmadi" }, { status: 404 });
  }

  let body: { segments: string[] };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (body.segments.length !== transcript.segments.length) {
    return NextResponse.json(
      { error: "Segmentlar soni mos kelmadi" },
      { status: 400 },
    );
  }

  const updated = redistributeWordTimings(transcript, body.segments);
  await fs.writeFile(paths.transcriptJson(id), JSON.stringify(updated, null, 2), "utf8");
  updateJob(id, { transcript: updated });

  return NextResponse.json({ ok: true });
}
