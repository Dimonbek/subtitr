import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { redeemCode } from "@/lib/access-store";
import { ACCESS_COOKIE, ensureViewer, getViewerAccess, signSubject } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().min(4).max(12) });

export async function POST(request: Request) {
  let body: { code: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }

  const store = await cookies();
  const existing = store.get(ACCESS_COOKIE)?.value;
  const { subjectId, created } = await ensureViewer(existing);

  const result = await redeemCode(body.code, subjectId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const access = await getViewerAccess(signSubject(subjectId));
  const res = NextResponse.json({ ok: true, ...result, access });
  if (created) {
    res.cookies.set(ACCESS_COOKIE, signSubject(subjectId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
