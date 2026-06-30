import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { listCodes, listSubjects } from "@/lib/access-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const [codes, subjects] = await Promise.all([listCodes(), listSubjects()]);
  return NextResponse.json({ codes, subjects });
}
