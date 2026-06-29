import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/access-store";
import { ACCESS_COOKIE, signAccess, getViewerAccess } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  let body: { email: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Email noto'g'ri" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const cookie = signAccess({ kind: "email", email });
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
