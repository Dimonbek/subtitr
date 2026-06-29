import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, getViewerAccess } from "@/lib/access";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const access = await getViewerAccess(store.get(ACCESS_COOKIE)?.value);
  return NextResponse.json(access);
}
