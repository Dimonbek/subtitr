import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdmin } from "./access";

/** Admin cookie'sini tekshiradi. Admin bo'lmasa false. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdmin(store.get(ADMIN_COOKIE)?.value);
}
