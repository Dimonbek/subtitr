import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { renderJob } from "@/lib/render";
import { getJobFresh } from "@/lib/jobs";
import { STYLE_PRESETS } from "@/lib/style-presets";
import { CAPTION_FONTS } from "@/lib/fonts";
import { ACCESS_COOKIE, getViewerAccess } from "@/lib/access";

export const runtime = "nodejs";

const bodySchema = z.object({
  preset: z.string(),
  font: z.string().nullable().optional(),
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

  let body: { preset: string; font?: string | null };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const preset = STYLE_PRESETS[body.preset];
  if (!preset) {
    return NextResponse.json({ error: "Noma'lum uslub" }, { status: 400 });
  }

  // Server tomonidan premium tekshiruvi — UI'ni chetlab o'tib bo'lmasin
  const fontPremium = body.font
    ? (CAPTION_FONTS.find((f) => f.id === body.font)?.premium ?? false)
    : false;
  if (preset.premium || fontPremium) {
    const store = await cookies();
    const access = await getViewerAccess(store.get(ACCESS_COOKIE)?.value);
    if (!access.isPro) {
      return NextResponse.json(
        { error: "Bu uslub/shrift premium. Obuna kerak." },
        { status: 403 },
      );
    }
  }

  void renderJob(id, body.preset, body.font ?? undefined).catch((err: unknown) => {
    console.error("[render] xato", err);
  });

  return NextResponse.json({ ok: true });
}
