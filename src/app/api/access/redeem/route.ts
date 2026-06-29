import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemCode } from "@/lib/access-store";
import { ACCESS_COOKIE, signAccess } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().min(4).max(12) });

export async function POST(request: Request) {
  let body: { code: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }

  const result = await redeemCode(body.code);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, until: result.until });
  res.cookies.set(ACCESS_COOKIE, signAccess({ kind: "code", until: result.until }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
