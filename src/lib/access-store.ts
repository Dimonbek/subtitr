import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "./paths";
import { WELCOME_COINS } from "./pricing";

/** Foydalanuvchi (email yoki anonim sessiya). */
export interface Subject {
  id: string; // "email:foo@bar" yoki "anon:uuid"
  coins: number;
  expiresAt?: number; // cheksiz obuna tugash vaqti (bo'lsa)
  welcomeGiven: boolean;
  createdAt: number;
  note?: string;
}

/** Bir martalik promokod — coin va/yoki obuna kun beradi. */
export interface PromoCode {
  code: string;
  coins: number;
  durationDays: number;
  status: "active" | "used";
  createdAt: number;
  redeemedAt?: number;
  redeemedBy?: string;
  note?: string;
}

interface DB {
  subjects: Record<string, Subject>;
  codes: PromoCode[];
}

const FILE = path.join(paths.root, "access.json");
let cache: DB | null = null;

async function load(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch {
    cache = { subjects: {}, codes: [] };
  }
  if (!cache.subjects) cache.subjects = {};
  if (!cache.codes) cache.codes = [];
  return cache;
}

async function save(db: DB): Promise<void> {
  cache = db;
  await fs.mkdir(paths.root, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export function emailSubjectId(email: string): string {
  return "email:" + email.trim().toLowerCase();
}
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ===== Subjectlar =====

/** Subjectni qaytaradi; bo'lmasa yaratadi (yangi anonim/emailga 3 bepul coin). */
export async function ensureSubject(id: string): Promise<Subject> {
  const db = await load();
  let s = db.subjects[id];
  if (!s) {
    s = {
      id,
      coins: WELCOME_COINS,
      welcomeGiven: true,
      createdAt: Date.now(),
    };
    db.subjects[id] = s;
    await save(db);
  }
  return s;
}

export async function getSubject(id: string): Promise<Subject | undefined> {
  return (await load()).subjects[id];
}

export function isSubscribed(s: Subject | undefined): boolean {
  return Boolean(s?.expiresAt && s.expiresAt > Date.now());
}

/** 1 coin (yoki n) yechadi. Yetarli bo'lmasa false. Obuna bo'lsa yechmaydi. */
export async function spendCoins(id: string, n = 1): Promise<boolean> {
  const db = await load();
  const s = db.subjects[id];
  if (!s) return false;
  if (isSubscribed(s)) return true; // cheksiz — coin yechilmaydi
  if (s.coins < n) return false;
  s.coins -= n;
  await save(db);
  return true;
}

export async function addCoins(id: string, n: number): Promise<Subject> {
  const db = await load();
  const s = db.subjects[id] ?? {
    id,
    coins: 0,
    welcomeGiven: true,
    createdAt: Date.now(),
  };
  s.coins += n;
  db.subjects[id] = s;
  await save(db);
  return s;
}

export async function addDays(id: string, days: number, note?: string): Promise<Subject> {
  const db = await load();
  const s = db.subjects[id] ?? {
    id,
    coins: 0,
    welcomeGiven: true,
    createdAt: Date.now(),
  };
  const base = s.expiresAt && s.expiresAt > Date.now() ? s.expiresAt : Date.now();
  s.expiresAt = base + days * 24 * 60 * 60 * 1000;
  if (note) s.note = note;
  db.subjects[id] = s;
  await save(db);
  return s;
}

export async function listSubjects(): Promise<Subject[]> {
  const db = await load();
  return Object.values(db.subjects).sort((a, b) => b.createdAt - a.createdAt);
}

// ===== Promokodlar =====

function genCode(existing: Set<string>): string {
  let c: string;
  do {
    c = String(Math.floor(100000 + Math.random() * 900000));
  } while (existing.has(c));
  return c;
}

export async function createCode(
  coins: number,
  durationDays: number,
  note?: string,
): Promise<PromoCode> {
  const db = await load();
  const code: PromoCode = {
    code: genCode(new Set(db.codes.map((c) => c.code))),
    coins,
    durationDays,
    status: "active",
    createdAt: Date.now(),
    note,
  };
  db.codes.unshift(code);
  await save(db);
  return code;
}

export async function listCodes(): Promise<PromoCode[]> {
  return (await load()).codes;
}

/** Kodni subjectga qo'llaydi (coin + kun qo'shadi). */
export async function redeemCode(
  input: string,
  subjectId: string,
): Promise<{ coins: number; days: number } | { error: string }> {
  const db = await load();
  const found = db.codes.find((c) => c.code === input.trim());
  if (!found) return { error: "Kod topilmadi" };
  if (found.status === "used") return { error: "Bu kod allaqachon ishlatilgan" };

  found.status = "used";
  found.redeemedAt = Date.now();
  found.redeemedBy = subjectId;
  await save(db);

  if (found.coins > 0) await addCoins(subjectId, found.coins);
  if (found.durationDays > 0) await addDays(subjectId, found.durationDays);
  return { coins: found.coins, days: found.durationDays };
}

export async function deleteCode(code: string): Promise<void> {
  const db = await load();
  db.codes = db.codes.filter((c) => c.code !== code);
  await save(db);
}
