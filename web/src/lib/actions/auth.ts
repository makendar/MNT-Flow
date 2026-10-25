"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./run";

// shortcut: in-memory rate limit (per process); use a shared store (Redis/DB) when running multiple instances.
const attempts = new Map<string, { n: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function limited(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) return false;
  return a.n >= MAX_ATTEMPTS;
}
function fail(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  attempts.set(key, a && a.until > now ? { n: a.n + 1, until: a.until } : { n: 1, until: now + WINDOW_MS });
}

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  if (!email || !password) return { error: "Enter your email and password." };
  if (limited(key)) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    fail(key);
    return { error: "Invalid email or password." };
  }
  attempts.delete(key);
  await createSession(user.id);
  await logEvent({ orgId: user.orgId, id: user.id }, { entityType: "user", entityId: user.id, customerId: user.customerId, kind: "login", message: `${user.name} signed in.`, source: user.role === "customer_portal" ? "portal" : "user" });
  redirect(landingFor(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function demoLoginEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.MNT_DEMO_LOGIN === "true";
}

/** Demo-only one-click sign-in / role switcher. Limited to seeded users of a demo organization. */
export async function demoLogin(fd: FormData) {
  if (!(await demoLoginEnabled())) throw new Error("Demo login is disabled.");
  const me = await getCurrentUser();
  const target = await db.user.findUnique({ where: { id: String(fd.get("userId") ?? "") }, include: { org: true } });
  if (!target || !target.org.isDemo || (me && me.orgId !== target.orgId)) throw new Error("Not allowed.");
  await createSession(target.id);
  redirect(landingFor(target.role));
}

function landingFor(role: string) {
  if (role === "customer_portal") return "/portal";
  return ["operations", "sales_exec", "quality"].includes(role) ? "/action-center" : "/overview";
}
