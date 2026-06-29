import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { getElevenLabsKeys, getCurrentIndex, getKeyUsage, maskKey } from "@/lib/elevenlabs-keys";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const keys = getElevenLabsKeys();
  const current = keys.length ? (await getCurrentIndex()) % keys.length : 0;

  const items = await Promise.all(
    keys.map(async (key, i) => {
      const usage = await getKeyUsage(key);
      return {
        index: i,
        masked: maskKey(key),
        active: i === current,
        available: true,
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      };
    }),
  );

  const totalRemaining = items.reduce((s, it) => s + it.remaining, 0);
  return NextResponse.json({ keys: items, totalRemaining });
}
