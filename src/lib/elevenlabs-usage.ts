export interface ElevenUsage {
  available: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier?: string;
  error?: string;
}

/** Berilgan ElevenLabs kalit uchun qolgan kreditni qaytaradi. */
export async function getElevenLabsUsage(apiKey: string): Promise<ElevenUsage> {
  if (!apiKey) {
    return { available: false, used: 0, limit: 0, remaining: 0, error: "Kalit yo'q" };
  }
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return { available: false, used: 0, limit: 0, remaining: 0, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      character_count?: number;
      character_limit?: number;
      tier?: string;
    };
    const used = data.character_count ?? 0;
    const limit = data.character_limit ?? 0;
    return {
      available: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      tier: data.tier,
    };
  } catch (e) {
    return {
      available: false,
      used: 0,
      limit: 0,
      remaining: 0,
      error: e instanceof Error ? e.message : "Xato",
    };
  }
}
