import { NextResponse } from "next/server";
import { z } from "zod";
import { emailSubjectId, ensureSubject } from "@/lib/access-store";
import { ACCESS_COOKIE, signSubject, getViewerAccess } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  let body: { email: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Email noto'g'ri" }, { status: 400 });
  }

  const sid = emailSubjectId(body.email);
  await ensureSubject(sid); // yangi email — 3 bepul coin
  const cookie = signSubject(sid);
  const access = await getViewerAccess(cookie);

  const res = NextResponse.json(access);
  res.cookies.set(ACCESS_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
