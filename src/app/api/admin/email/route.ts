import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-guard";
import { addCoins, addDays, emailSubjectId } from "@/lib/access-store";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  coins: z.number().int().min(0).max(100000).default(0),
  days: z.number().int().min(0).max(3650).default(0),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  let body: { email: string; coins: number; days: number };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const sid = emailSubjectId(body.email);
  if (body.coins > 0) await addCoins(sid, body.coins);
  if (body.days > 0) await addDays(sid, body.days);
  return NextResponse.json({ ok: true });
}
