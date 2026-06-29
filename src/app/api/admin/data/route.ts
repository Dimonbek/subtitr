import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { listCodes, listEmailGrants } from "@/lib/access-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const [codes, emails] = await Promise.all([listCodes(), listEmailGrants()]);
  return NextResponse.json({ codes, emails });
}
