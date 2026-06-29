import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, checkAdminPassword, signAdmin } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({ password: z.string() });

export async function POST(request: Request) {
  let body: { password: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (!checkAdminPassword(body.password)) {
    return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signAdmin(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
