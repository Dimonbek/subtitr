import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "./paths";

/** Bir martalik 6 xonali promokod. */
export interface PromoCode {
  code: string; // 6 raqam
  durationDays: number;
  status: "active" | "used";
  createdAt: number;
  redeemedAt?: number;
  /** Kod ishlatilgandan keyin ruxsat shu vaqtgacha amal qiladi. */
  redeemedUntil?: number;
  note?: string;
}

/** Admin tomonidan emailga to'g'ridan-to'g'ri berilgan ruxsat. */
export interface EmailGrant {
  email: string;
  expiresAt: number;
  createdAt: number;
  note?: string;
}

interface AccessDB {
  codes: PromoCode[];
  emails: Record<string, EmailGrant>;
}

const FILE = path.join(paths.root, "access.json");
let cache: AccessDB | null = null;

async function load(): Promise<AccessDB> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    cache = JSON.parse(raw) as AccessDB;
  } catch {
    cache = { codes: [], emails: {} };
  }
  if (!cache.codes) cache.codes = [];
  if (!cache.emails) cache.emails = {};
  return cache;
}

async function save(db: AccessDB): Promise<void> {
  cache = db;
  await fs.mkdir(paths.root, { recursive: true });
  // Atomik yozish: temp + rename
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function genCode(existing: Set<string>): string {
  let c: string;
  do {
    c = String(Math.floor(100000 + Math.random() * 900000));
  } while (existing.has(c));
  return c;
}

// ===== Promokodlar =====

export async function createCode(durationDays = 30, note?: string): Promise<PromoCode> {
  const db = await load();
  const code: PromoCode = {
    code: genCode(new Set(db.codes.map((c) => c.code))),
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

/** Kodni ishlatadi. Muvaffaqiyatli bo'lsa ruxsat tugash vaqtini qaytaradi. */
export async function redeemCode(input: string): Promise<{ until: number } | { error: string }> {
  const db = await load();
  const code = input.trim();
  const found = db.codes.find((c) => c.code === code);
  if (!found) return { error: "Kod topilmadi" };
  if (found.status === "used") return { error: "Bu kod allaqachon ishlatilgan" };

  const until = Date.now() + found.durationDays * 24 * 60 * 60 * 1000;
  found.status = "used";
  found.redeemedAt = Date.now();
  found.redeemedUntil = until;
  await save(db);
  return { until };
}

export async function deleteCode(code: string): Promise<void> {
  const db = await load();
  db.codes = db.codes.filter((c) => c.code !== code);
  await save(db);
}

// ===== Email ruxsatlari =====

export async function grantEmail(email: string, durationDays: number, note?: string): Promise<EmailGrant> {
  const db = await load();
  const key = normalizeEmail(email);
  const base = db.emails[key]?.expiresAt;
  const from = base && base > Date.now() ? base : Date.now();
  const grant: EmailGrant = {
    email: key,
    expiresAt: from + durationDays * 24 * 60 * 60 * 1000,
    createdAt: db.emails[key]?.createdAt ?? Date.now(),
    note,
  };
  db.emails[key] = grant;
  await save(db);
  return grant;
}

export async function revokeEmail(email: string): Promise<void> {
  const db = await load();
  delete db.emails[normalizeEmail(email)];
  await save(db);
}

export async function listEmailGrants(): Promise<EmailGrant[]> {
  const db = await load();
  return Object.values(db.emails).sort((a, b) => b.createdAt - a.createdAt);
}

export async function emailAccessUntil(email: string): Promise<number | null> {
  const db = await load();
  const g = db.emails[normalizeEmail(email)];
  if (!g) return null;
  return g.expiresAt > Date.now() ? g.expiresAt : null;
}
