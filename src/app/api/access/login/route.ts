import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, signSubject, getViewerAccess, loginUser } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export async function POST(request: Request) {
  let body: { email: string; password: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Email yoki parol noto'g'ri kiritildi" }, { status: 400 });
  }

  const result = await loginUser(body.email, body.password);
  if (!result) {
    return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });
  }

  const cookie = signSubject(result.subjectId);
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
