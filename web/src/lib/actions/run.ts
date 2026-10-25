import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth/permissions";

export type ActionState = { ok?: string; error?: string; at?: number } | null;

/** Error whose message is safe to show to the user. */
export class UserError extends Error {}

/** Wraps a server action body: returns a user-safe message and never leaks internal errors. */
export async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = await fn();
    return { ok: ok || "Saved.", at: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ZodError) return { error: e.issues.map((i) => `${i.path.join(".") || "Input"}: ${i.message}`).join("; "), at: Date.now() };
    if (e instanceof UserError || e instanceof AuthorizationError) return { error: e.message, at: Date.now() };
    console.error("[action]", e instanceof Error ? e.message : e);
    return { error: "Something went wrong. Please try again.", at: Date.now() };
  }
}

/** FormData helpers. Empty strings become null. */
export function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function req(fd: FormData, k: string, label = k): string {
  const v = s(fd, k);
  if (!v) throw new UserError(`${label} is required.`);
  return v;
}

export function money(fd: FormData, k: string, label = k): number {
  const raw = req(fd, k, label).replace(/[₹,\s]/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new UserError(`${label} must be a positive amount.`);
  return Math.round(n * 100) / 100;
}

export function dateField(fd: FormData, k: string): Date | null {
  const v = s(fd, k);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new UserError(`Invalid date for ${k}.`);
  return new Date(`${v}T00:00:00.000Z`);
}

export function oneOf<T extends string>(v: string | null, allowed: readonly { value: string }[], label: string): T {
  if (!v || !allowed.some((a) => a.value === v)) throw new UserError(`Invalid ${label}.`);
  return v as T;
}
