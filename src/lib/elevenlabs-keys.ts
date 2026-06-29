import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "./paths";

const STATE_FILE = path.join(paths.root, "elevenlabs-state.json");

/**
 * Barcha ElevenLabs kalitlarini env'dan o'qiydi. Quyidagilarni qo'llaydi:
 *   ELEVENLABS_API_KEYS = "key1,key2,..."  (vergul/probel/yangi qator bilan)
 *   ELEVENLABS_API_KEY_1 ... ELEVENLABS_API_KEY_9
 *   ELEVENLABS_API_KEY   (bitta — eski moslik)
 */
export function getElevenLabsKeys(): string[] {
  const keys: string[] = [];
  const list = process.env.ELEVENLABS_API_KEYS?.trim();
  if (list) {
    for (const k of list.split(/[\s,]+/)) {
      const t = k.trim();
      if (t) keys.push(t);
    }
  }
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`ELEVENLABS_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  const single = process.env.ELEVENLABS_API_KEY?.trim();
  if (single) keys.push(single);

  // Takrorlarni olib tashlaymiz
  return [...new Set(keys)];
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

interface State {
  currentIndex: number;
}

let cache: State | null = null;

export async function getCurrentIndex(): Promise<number> {
  if (cache) return cache.currentIndex;
  try {
    cache = JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as State;
  } catch {
    cache = { currentIndex: 0 };
  }
  return cache.currentIndex;
}

export async function setCurrentIndex(index: number): Promise<void> {
  cache = { currentIndex: index };
  try {
    await fs.mkdir(paths.root, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(cache), "utf8");
  } catch {
    /* persist muvaffaqiyatsiz bo'lsa ham xotirada ishlaydi */
  }
}
