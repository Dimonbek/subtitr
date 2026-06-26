import { NextResponse } from "next/server";
import { z } from "zod";
import { renderJob } from "@/lib/render";
import { getJob, loadJobFromDisk } from "@/lib/jobs";
import type { StylePreset } from "@/types/job";

export const runtime = "nodejs";

const bodySchema = z.object({
  preset: z.enum(["tiktok", "mrbeast", "minimal", "neon"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getJob(id) ?? (await loadJobFromDisk(id));
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  let body: { preset: StylePreset["id"] };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  void renderJob(id, body.preset).catch((err: unknown) => {
    console.error("[render] xato", err);
  });

  return NextResponse.json({ ok: true });
}
