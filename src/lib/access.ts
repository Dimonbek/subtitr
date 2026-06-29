import crypto from "node:crypto";
import { emailAccessUntil } from "./access-store";

export const ACCESS_COOKIE = "subtitr_access";
const SECRET = process.env.ACCESS_SECRET || "subtitr-dev-secret-change-me";

type Payload =
  | { kind: "email"; email: string }
  | { kind: "code"; until: number };

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signAccess(payload: Payload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyAccess(value: string | undefined): Payload | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
}

export interface ViewerAccess {
  isPro: boolean;
  until: number | null;
  identity: string | null; // email yoki "kod"
}

/** Cookie qiymatidan foydalanuvchining premium holatini aniqlaydi. */
export async function getViewerAccess(cookieValue: string | undefined): Promise<ViewerAccess> {
  const payload = verifyAccess(cookieValue);
  if (!payload) return { isPro: false, until: null, identity: null };

  if (payload.kind === "code") {
    const ok = payload.until > Date.now();
    return { isPro: ok, until: ok ? payload.until : null, identity: ok ? "kod" : null };
  }
  // email — ruxsat jonli ravishda store'dan tekshiriladi (admin bekor qilishi mumkin)
  const until = await emailAccessUntil(payload.email);
  return { isPro: until != null, until, identity: payload.email };
}

export const ADMIN_COOKIE = "subtitr_admin";

export function signAdmin(): string {
  const body = b64url(`admin:${Date.now()}`);
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdmin(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return false;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
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
