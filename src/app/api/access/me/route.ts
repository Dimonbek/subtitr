import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, ensureViewer, getViewerAccess, signSubject } from "@/lib/access";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const existing = store.get(ACCESS_COOKIE)?.value;
  // Subject yo'q bo'lsa — yangi anonim yaratamiz (3 bepul coin)
  const { subjectId, created } = await ensureViewer(existing);
  const access = await getViewerAccess(created ? signSubject(subjectId) : existing);

  const res = NextResponse.json(access);
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
