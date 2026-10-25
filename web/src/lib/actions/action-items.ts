"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { fmtDate } from "@/lib/dates";
import { dateField, req, run, s, UserError, type ActionState } from "./run";

async function load(orgId: string, id: string) {
  const a = await db.actionItem.findFirst({ where: { id, orgId } });
  if (!a) throw new UserError("Action not found.");
  return a;
}

async function assertUser(orgId: string, userId: string | null) {
  if (!userId) return;
  const u = await db.user.findFirst({ where: { id: userId, orgId, role: { not: "customer_portal" } } });
  if (!u) throw new UserError("Selected owner is not a member of this organization.");
  return u;
}

export async function assignAction(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const a = await load(user.orgId, id);
    const ownerId = s(fd, "ownerId");
    const owner = await assertUser(user.orgId, ownerId);
    await db.actionItem.update({ where: { id: a.id }, data: { ownerId } });
    await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "updated", message: `Owner changed to ${owner?.name ?? "Unassigned"}.` });
    revalidatePath(`/action-center/${a.id}`);
    return "Owner updated.";
  });
}

export async function rescheduleAction(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const a = await load(user.orgId, id);
    const due = dateField(fd, "dueDate");
    if (!due) throw new UserError("Choose a due date.");
    await db.actionItem.update({ where: { id: a.id }, data: { dueDate: due } });
    await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "updated", message: `Due date changed to ${fmtDate(due)}${s(fd, "reason") ? ` (${s(fd, "reason")})` : ""}.` });
    revalidatePath(`/action-center/${a.id}`);
    return "Due date updated.";
  });
}

export async function commentAction(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const a = await load(user.orgId, id);
    const text = req(fd, "comment", "Comment");
    if (text.length > 2000) throw new UserError("Comment is too long (max 2000 characters).");
    await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "comment", message: text });
    revalidatePath(`/action-center/${a.id}`);
    return "Comment added.";
  });
}

export async function completeAction(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const a = await load(user.orgId, id);
    if (a.status === "completed") throw new UserError("This action is already completed.");
    const resolution = req(fd, "resolution", "Resolution");
    await db.actionItem.update({ where: { id: a.id }, data: { status: "completed", resolution, completedAt: new Date(), completedById: user.id, systemClosed: false } });
    await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "status_change", message: `Completed: ${resolution}` });
    revalidatePath(`/action-center/${a.id}`);
    revalidatePath("/action-center");
    return "Action completed.";
  });
}

export async function reopenAction(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const a = await load(user.orgId, id);
    if (a.status !== "completed") throw new UserError("Only completed actions can be reopened.");
    const reason = req(fd, "reason", "Reason for reopening");
    await db.actionItem.update({ where: { id: a.id }, data: { status: "open", resolution: null, completedAt: null, completedById: null, systemClosed: false } });
    await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "status_change", message: `Reopened: ${reason}` });
    revalidatePath(`/action-center/${a.id}`);
    return "Action reopened.";
  });
}

/** Bulk reassign / reschedule open actions. Completion is intentionally not bulk-enabled (needs a resolution per item). */
export async function bulkUpdateActions(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("actions:edit");
    const ids = fd.getAll("ids").map(String).slice(0, 200);
    if (!ids.length) throw new UserError("Select at least one action.");
    const ownerId = s(fd, "bulkOwner");
    const due = dateField(fd, "bulkDue");
    if (!ownerId && !due) throw new UserError("Choose an owner and/or a due date to apply.");
    const owner = await assertUser(user.orgId, ownerId);
    const targets = await db.actionItem.findMany({ where: { orgId: user.orgId, id: { in: ids }, status: "open" } });
    for (const a of targets) {
      await db.actionItem.update({ where: { id: a.id }, data: { ...(ownerId ? { ownerId } : {}), ...(due ? { dueDate: due } : {}) } });
      await logEvent(user, { entityType: "action", entityId: a.id, customerId: a.customerId, kind: "updated", message: `Bulk update:${owner ? ` owner → ${owner.name}` : ""}${due ? ` due → ${fmtDate(due)}` : ""}.` });
    }
    revalidatePath("/action-center");
    return `Updated ${targets.length} open action(s).`;
  });
}
