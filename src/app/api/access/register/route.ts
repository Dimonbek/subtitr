import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, signSubject, getViewerAccess, registerUser } from "@/lib/access";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4, "Parol kamida 4 ta belgidan iborat bo'lishi kerak"),
});

export async function POST(request: Request) {
  let body: { email: string; password: string };
  try {
    body = schema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Ma'lumot noto'g'ri" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
  }

  try {
    const { subjectId } = await registerUser(body.email, body.password);
    const cookie = signSubject(subjectId);
    const access = await getViewerAccess(cookie);

    const res = NextResponse.json(access);
    res.cookies.set(ACCESS_COOKIE, cookie, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ro'yxatdan o'tishda xato" },
      { status: 409 },
    );
  }
}
