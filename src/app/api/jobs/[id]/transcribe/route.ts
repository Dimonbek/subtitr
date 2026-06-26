import { NextResponse } from "next/server";
import { getJob, loadJobFromDisk } from "@/lib/jobs";
import { retranscribeJob } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id) ?? (await loadJobFromDisk(id));
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  void retranscribeJob(id).catch((err: unknown) => {
    console.error("[retranscribe] xato", err);
  });

  return NextResponse.json({ ok: true });
}
