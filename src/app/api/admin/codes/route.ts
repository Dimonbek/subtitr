import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-guard";
import { createCode, deleteCode } from "@/lib/access-store";

export const runtime = "nodejs";

const schema = z.object({
  coins: z.number().int().min(0).max(100000).default(0),
  durationDays: z.number().int().min(0).max(3650).default(0),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  let body: { coins: number; durationDays: number; note?: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (body.coins === 0 && body.durationDays === 0) {
    return NextResponse.json({ error: "Coin yoki kun bering" }, { status: 400 });
  }
  const code = await createCode(body.coins, body.durationDays, body.note);
  return NextResponse.json(code);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code kerak" }, { status: 400 });
  await deleteCode(code);
  return NextResponse.json({ ok: true });
}
