import crypto from "node:crypto";
import { ensureSubject, getSubject, isSubscribed } from "./access-store";

export const ACCESS_COOKIE = "subtitr_sid";
const SECRET = process.env.ACCESS_SECRET || "subtitr-dev-secret-change-me";

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}
function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}

/** subjectId'ni imzolab cookie qiymatini qaytaradi. */
export function signSubject(subjectId: string): string {
  const body = b64url(subjectId);
  return `${body}.${sign(body)}`;
}

/** Cookie'dan subjectId'ni tekshirib oladi (yaroqsiz bo'lsa null). */
export function verifySubject(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(body)))) return null;
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function newAnonSubjectId(): string {
  return "anon:" + crypto.randomUUID();
}

export interface ViewerAccess {
  subjectId: string | null;
  coins: number;
  isPro: boolean; // cheksiz obuna
  until: number | null;
  email: string | null;
}

/** Cookie'dagi subjectId bo'yicha holatni qaytaradi (subject mavjud bo'lishi shart). */
export async function getViewerAccess(cookieValue: string | undefined): Promise<ViewerAccess> {
  const sid = verifySubject(cookieValue);
  if (!sid) return { subjectId: null, coins: 0, isPro: false, until: null, email: null };
  const s = await getSubject(sid);
  if (!s) return { subjectId: sid, coins: 0, isPro: false, until: null, email: null };
  return {
    subjectId: sid,
    coins: s.coins,
    isPro: isSubscribed(s),
    until: isSubscribed(s) ? s.expiresAt ?? null : null,
    email: sid.startsWith("email:") ? sid.slice("email:".length) : null,
  };
}

/** Subjectni kafolatlaydi (yo'q bo'lsa yaratadi, 3 bepul coin). */
export async function ensureViewer(cookieValue: string | undefined): Promise<{ subjectId: string; created: boolean }> {
  const sid = verifySubject(cookieValue);
  if (sid) {
    await ensureSubject(sid);
    return { subjectId: sid, created: false };
  }
  const fresh = newAnonSubjectId();
  await ensureSubject(fresh);
  return { subjectId: fresh, created: true };
}

// ===== Admin =====
export const ADMIN_COOKIE = "subtitr_admin";

export function signAdmin(): string {
  const body = b64url(`admin:${Date.now()}`);
  return `${body}.${sign(body)}`;
}
export function verifyAdmin(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return false;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(body)));
  } catch {
    return false;
  }
}
export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}
