import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { renderJob } from "@/lib/render";
import { getJobFresh } from "@/lib/jobs";
import { STYLE_PRESETS } from "@/lib/style-presets";
import { ACCESS_COOKIE, ensureViewer, signSubject } from "@/lib/access";
import { getSubject, isSubscribed, spendCoins } from "@/lib/access-store";
import { COIN_PER_RENDER } from "@/lib/pricing";

export const runtime = "nodejs";

const bodySchema = z.object({
  preset: z.string(),
  font: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobFresh(id);
  if (!job) {
    return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
  }

  let body: { preset: string; font?: string | null };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (!STYLE_PRESETS[body.preset]) {
    return NextResponse.json({ error: "Noma'lum uslub" }, { status: 400 });
  }

  // Coin/obuna tekshiruvi — har tayyorlash 1 coin (obuna bo'lsa cheksiz)
  const store = await cookies();
  const existing = store.get(ACCESS_COOKIE)?.value;
  const { subjectId, created } = await ensureViewer(existing);
  const subject = await getSubject(subjectId);

  if (!isSubscribed(subject)) {
    const ok = await spendCoins(subjectId, COIN_PER_RENDER);
    if (!ok) {
      const res = NextResponse.json(
        { error: "Coin yetarli emas. Obuna yoki coin sotib oling.", needCoins: true },
        { status: 402 },
      );
      if (created) setCookie(res, subjectId);
      return res;
    }
  }

  void renderJob(id, body.preset, body.font ?? undefined).catch((err: unknown) => {
    console.error("[render] xato", err);
  });

  const res = NextResponse.json({ ok: true });
  if (created) setCookie(res, subjectId);
  return res;
}

function setCookie(res: NextResponse, subjectId: string) {
  res.cookies.set(ACCESS_COOKIE, signSubject(subjectId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
