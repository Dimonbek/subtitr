import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/access";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
