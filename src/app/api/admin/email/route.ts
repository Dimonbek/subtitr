import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-guard";
import { grantEmail, revokeEmail } from "@/lib/access-store";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  durationDays: z.number().int().min(1).max(3650).default(30),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  let body: { email: string; durationDays: number; note?: string };
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const grant = await grantEmail(body.email, body.durationDays, body.note);
  return NextResponse.json(grant);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email kerak" }, { status: 400 });
  await revokeEmail(email);
  return NextResponse.json({ ok: true });
}
