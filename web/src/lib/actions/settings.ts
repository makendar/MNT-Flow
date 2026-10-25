"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { ISSUE_CATEGORIES, ROLES } from "@/lib/domain/constants";
import { parseSettings } from "@/lib/domain/settings";
import { seedDemo } from "../../../prisma/demo-seed";
import { req, run, s, UserError, type ActionState } from "./run";

function int(fd: FormData, k: string, min: number, max: number, label: string): number {
  const n = Number(s(fd, k));
  if (!Number.isFinite(n) || n < min || n > max || !Number.isInteger(n)) throw new UserError(`${label} must be a whole number between ${min} and ${max}.`);
  return n;
}

export async function saveOrgProfile(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("settings:manage");
    const timezone = req(fd, "timezone", "Timezone");
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw new UserError("Unknown timezone."); }
    const logoUrl = s(fd, "logoUrl");
    if (logoUrl && !/^https:\/\/[^\s]+$/.test(logoUrl)) throw new UserError("Logo URL must start with https://");
    await db.organization.update({
      where: { id: user.orgId },
      data: { name: req(fd, "name", "Company name").slice(0, 200), address: s(fd, "address") ?? "", timezone, logoUrl, fiscalYearStartMonth: int(fd, "fiscalYearStartMonth", 1, 12, "Fiscal year start month"), defaultPaymentTermsDays: int(fd, "defaultPaymentTermsDays", 0, 365, "Default payment terms") },
    });
    await logEvent(user, { entityType: "organization", entityId: user.orgId, kind: "updated", message: "Organization profile updated." });
    revalidatePath("/", "layout");
    return "Organization profile saved.";
  });
}

export async function saveRules(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("settings:manage");
    const org = await db.organization.findUniqueOrThrow({ where: { id: user.orgId } });
    const cur = parseSettings(org.settingsJson);
    const bounds = (s(fd, "ageingBoundaries") ?? "").split(",").map((x) => Number(x.trim()));
    if (bounds.length < 1 || bounds.length > 6 || bounds.some((b) => !Number.isInteger(b) || b < 1 || b > 3650) || bounds.some((b, i) => i > 0 && b <= bounds[i - 1])) {
      throw new UserError("Ageing boundaries must be 1–6 increasing whole numbers of days, e.g. 30, 60, 90.");
    }
    const next = {
      ...cur,
      ageingBoundaries: bounds,
      priority: {
        highAmount: int(fd, "highAmount", 0, 1e10, "High amount"), mediumAmount: int(fd, "mediumAmount", 0, 1e10, "Medium amount"),
        highOverdueDays: int(fd, "highOverdueDays", 1, 3650, "High overdue days"), mediumOverdueDays: int(fd, "mediumOverdueDays", 1, 3650, "Medium overdue days"),
        staleIssueDays: int(fd, "staleIssueDays", 1, 3650, "Stale issue days"), commitmentWindowDays: int(fd, "commitmentWindowDays", 0, 60, "Commitment window"),
        highScore: int(fd, "highScore", 1, 200, "High score"), mediumScore: int(fd, "mediumScore", 1, 200, "Medium score"),
      },
      risk: {
        largeOutstanding: int(fd, "largeOutstanding", 0, 1e11, "Large outstanding"), multipleOverdueInvoices: int(fd, "multipleOverdueInvoices", 1, 100, "Overdue invoice count"),
        repeatedMissedPromises: int(fd, "repeatedMissedPromises", 1, 100, "Missed promise count"), longDisputeDays: int(fd, "longDisputeDays", 1, 3650, "Long dispute days"),
      },
      monthlyCollectionTarget: int(fd, "monthlyCollectionTarget", 0, 1e11, "Monthly collection target"),
      reminderLeadDays: int(fd, "reminderLeadDays", 0, 30, "Reminder lead days"),
    };
    if (next.priority.mediumAmount > next.priority.highAmount || next.priority.mediumOverdueDays > next.priority.highOverdueDays || next.priority.mediumScore > next.priority.highScore) {
      throw new UserError("Medium thresholds must not exceed high thresholds.");
    }
    await db.organization.update({ where: { id: user.orgId }, data: { settingsJson: JSON.stringify(next) } });
    await logEvent(user, { entityType: "organization", entityId: user.orgId, kind: "updated", message: `Business rules updated (ageing ${bounds.join("/")} days; priority and risk thresholds).` });
    revalidatePath("/", "layout");
    return "Rules saved. Priorities are recalculated on the next page load.";
  });
}

export async function saveIssueCategories(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("settings:manage");
    const enabled = fd.getAll("categories").map(String).filter((c) => ISSUE_CATEGORIES.some((x) => x.value === c));
    if (!enabled.includes("other")) enabled.push("other");
    const org = await db.organization.findUniqueOrThrow({ where: { id: user.orgId } });
    await db.organization.update({ where: { id: user.orgId }, data: { settingsJson: JSON.stringify({ ...parseSettings(org.settingsJson), enabledIssueCategories: enabled }) } });
    await logEvent(user, { entityType: "organization", entityId: user.orgId, kind: "updated", message: `Issue categories updated (${enabled.length} enabled).` });
    revalidatePath("/settings");
    return "Issue categories saved.";
  });
}

export async function updateMember(userId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const me = await authorize("settings:manage");
    const target = await db.user.findFirst({ where: { id: userId, orgId: me.orgId, role: { not: "customer_portal" } } });
    if (!target) throw new UserError("Team member not found.");
    const role = s(fd, "role") ?? target.role;
    if (!ROLES.some((r) => r.value === role) || role === "customer_portal") throw new UserError("Invalid role.");
    const active = fd.get("active") === "on";
    if (target.id === me.id && (role !== target.role || !active)) throw new UserError("You cannot change your own role or deactivate yourself.");
    await db.user.update({ where: { id: target.id }, data: { role, active } });
    await logEvent(me, { entityType: "user", entityId: target.id, kind: "updated", message: `${target.name}: role ${target.role} → ${role}${active !== target.active ? (active ? ", reactivated" : ", deactivated") : ""}.` });
    revalidatePath("/settings");
    return "Member updated.";
  });
}

export async function resetDemoData(_: ActionState, __: FormData) {
  return run(async () => {
    const user = await authorize("demo:reset");
    if (!user.org.isDemo) throw new UserError("Reset is only available for demo organizations.");
    await seedDemo(db);
    revalidatePath("/", "layout");
    redirect("/overview");
  });
}
