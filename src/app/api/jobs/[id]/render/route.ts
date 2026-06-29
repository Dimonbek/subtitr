import { NextResponse } from "next/server";
import { z } from "zod";
import { renderJob } from "@/lib/render";
import { getJobFresh } from "@/lib/jobs";
import { STYLE_PRESETS } from "@/lib/style-presets";

export const runtime = "nodejs";

const bodySchema = z.object({
  preset: z.string(),
  font: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJobFresh(id);
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  let body: { preset: string; font?: string };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (!STYLE_PRESETS[body.preset]) {
    return NextResponse.json({ error: "Noma'lum uslub" }, { status: 400 });
  }

  void renderJob(id, body.preset, body.font).catch((err: unknown) => {
    console.error("[render] xato", err);
  });

  return NextResponse.json({ ok: true });
}
