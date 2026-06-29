import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { paths } from "./paths";

const STATE_FILE = path.join(paths.root, "elevenlabs-state.json");
// Bepul tarif: har kalit oyiga ~10 000 kredit
export const FREE_LIMIT = Number(process.env.ELEVENLABS_FREE_LIMIT ?? 10000);

/**
 * Barcha ElevenLabs kalitlarini env'dan o'qiydi:
 *   ELEVENLABS_API_KEYS = "key1,key2,..."  (vergul/probel/yangi qator)
 *   ELEVENLABS_API_KEY_1 ... _20
 *   ELEVENLABS_API_KEY (bitta — eski moslik)
 */
export function getElevenLabsKeys(): string[] {
  const keys: string[] = [];
  const list = process.env.ELEVENLABS_API_KEYS?.trim();
  if (list) for (const k of list.split(/[\s,]+/)) if (k.trim()) keys.push(k.trim());
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`ELEVENLABS_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  const single = process.env.ELEVENLABS_API_KEY?.trim();
  if (single) keys.push(single);
  return [...new Set(keys)];
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

function keyId(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
}
function curMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

interface KeyUsage {
  used: number;
  month: string;
}
interface State {
  currentIndex: number;
  usage: Record<string, KeyUsage>;
}

let cache: State | null = null;

async function load(): Promise<State> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as State;
  } catch {
    cache = { currentIndex: 0, usage: {} };
  }
  if (!cache.usage) cache.usage = {};
  return cache;
}

async function save(st: State): Promise<void> {
  cache = st;
  try {
    await fs.mkdir(paths.root, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(st), "utf8");
  } catch {
    /* xotirada ishlaydi */
  }
}

export async function getCurrentIndex(): Promise<number> {
  return (await load()).currentIndex;
}
export async function setCurrentIndex(index: number): Promise<void> {
  const st = await load();
  st.currentIndex = index;
  await save(st);
}

/** Kalitning shu oydagi ishlatilgan/qolgan kreditini qaytaradi (lokal hisob). */
export async function getKeyUsage(key: string): Promise<{ used: number; limit: number; remaining: number }> {
  const st = await load();
  const u = st.usage[keyId(key)];
  const used = u && u.month === curMonth() ? u.used : 0;
  return { used, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - used) };
}

/** Transkripsiyadan keyin ishlatilgan kreditni qo'shadi (character-cost). */
export async function addKeyUsage(key: string, cost: number): Promise<void> {
  const st = await load();
  const id = keyId(key);
  const cur = st.usage[id];
  const used = cur && cur.month === curMonth() ? cur.used : 0;
  st.usage[id] = { used: used + Math.max(0, cost), month: curMonth() };
  await save(st);
}

/** Kalitni to'liq tugagan deb belgilaydi (STT kredit xatosi). */
export async function markKeyExhausted(key: string): Promise<void> {
  const st = await load();
  st.usage[keyId(key)] = { used: FREE_LIMIT, month: curMonth() };
  await save(st);
}
