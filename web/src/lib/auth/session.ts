import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { parseSettings, type OrgSettings } from "@/lib/domain/settings";
import { AuthorizationError, can, type Permission } from "./permissions";

// Minimal signed-cookie session for the local demo (HMAC-SHA256, httpOnly, SameSite=Lax).
// shortcut: no MFA / session revocation list; swap for a maintained provider (Auth.js, Clerk, Entra ID) before production.
const COOKIE = "mnt_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

const g = globalThis as unknown as { __mntDevSecret?: string };

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set to 32+ characters.");
  return (g.__mntDevSecret ??= randomBytes(32).toString("hex"));
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(payload: { uid: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

function decode(token: string | undefined): { uid: string; exp: number } | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof p.uid !== "string" || typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, encode({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string | null;
  orgId: string;
  customerId: string | null;
  org: { id: string; name: string; isDemo: boolean; timezone: string; address: string };
  settings: OrgSettings;
  /** Reporting date (YYYY-MM-DD) in the organization's timezone. */
  today: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const p = decode((await cookies()).get(COOKIE)?.value);
  if (!p) return null;
  const u = await db.user.findUnique({ where: { id: p.uid }, include: { org: true } });
  if (!u || !u.active) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    team: u.team,
    orgId: u.orgId,
    customerId: u.customerId,
    org: { id: u.org.id, name: u.org.name, isDemo: u.org.isDemo, timezone: u.org.timezone, address: u.org.address },
    settings: parseSettings(u.org.settingsJson),
    today: todayISO(u.org.timezone),
  };
});

/** For internal (manufacturer staff) pages. Portal users are redirected to the portal. */
export async function requireInternal(perm?: Permission): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (u.role === "customer_portal") redirect("/portal");
  if (perm && !can(u, perm)) redirect(`/forbidden?need=${perm}`);
  return u;
}

export async function requirePortal(): Promise<SessionUser & { customerId: string }> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (u.role !== "customer_portal" || !u.customerId) redirect("/action-center");
  return u as SessionUser & { customerId: string };
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function authorize(perm: Permission): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u || !can(u, perm)) throw new AuthorizationError();
  return u;
}
