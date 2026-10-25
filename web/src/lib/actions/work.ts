"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { nextNumber } from "@/lib/data/numbering";
import { fmtDate } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, PRIORITIES, TASK_STATUSES, TEAMS, labelOf } from "@/lib/domain/constants";
import { dateField, oneOf, req, run, s, UserError, type ActionState } from "./run";

type U = Awaited<ReturnType<typeof authorize>>;

async function owner(user: U, id: string | null) {
  if (id && !(await db.user.findFirst({ where: { id, orgId: user.orgId, role: { not: "customer_portal" } } }))) throw new UserError("Invalid owner.");
  return id;
}

/** Resolves customer / invoice / order links and checks they are consistent and in-tenant. */
async function resolveLinks(user: U, fd: FormData) {
  const invoiceId = s(fd, "invoiceId");
  const orderId = s(fd, "orderId");
  let customerId = s(fd, "customerId");
  const inv = invoiceId ? await db.invoice.findFirst({ where: { id: invoiceId, orgId: user.orgId } }) : null;
  if (invoiceId && !inv) throw new UserError("Invoice not found.");
  const ord = orderId ? await db.salesOrder.findFirst({ where: { id: orderId, orgId: user.orgId } }) : null;
  if (orderId && !ord) throw new UserError("Order not found.");
  customerId = customerId ?? inv?.customerId ?? ord?.customerId ?? null;
  if (!customerId || !(await db.customer.findFirst({ where: { id: customerId, orgId: user.orgId } }))) throw new UserError("Customer is required.");
  if ((inv && inv.customerId !== customerId) || (ord && ord.customerId !== customerId)) throw new UserError("Linked invoice/order belongs to a different customer.");
  return { customerId, invoiceId: inv?.id ?? null, orderId: ord?.id ?? null };
}

// ---------- Issues ----------

export async function createIssue(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("issues:edit");
    const links = await resolveLinks(user, fd);
    const category = oneOf(s(fd, "category"), ISSUE_CATEGORIES.filter((c) => user.settings.enabledIssueCategories.includes(c.value)), "category");
    const number = await nextNumber(user.orgId, "issue", user.today);
    const issue = await db.issue.create({
      data: {
        orgId: user.orgId, number, ...links, category,
        title: req(fd, "title", "Title"), description: s(fd, "description") ?? "", reportedBy: s(fd, "reportedBy") ?? user.name,
        ownerId: await owner(user, s(fd, "ownerId")), team: s(fd, "team") ? oneOf(s(fd, "team"), TEAMS, "team") : null,
        priority: oneOf(s(fd, "priority") ?? "medium", PRIORITIES, "priority"), dueDate: dateField(fd, "dueDate"),
        blocksPayment: fd.get("blocksPayment") === "on", missingEvidence: s(fd, "missingEvidence"), nextAction: s(fd, "nextAction"),
      },
    });
    await logEvent(user, { entityType: "issue", entityId: issue.id, customerId: links.customerId, kind: "created", message: `Issue ${number} raised: ${issue.title}` });
    redirect(`/issues/${issue.id}`);
  });
}

export async function updateIssue(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("issues:edit");
    const is = await db.issue.findFirst({ where: { id, orgId: user.orgId } });
    if (!is) throw new UserError("Issue not found.");
    const status = oneOf(s(fd, "status") ?? is.status, ISSUE_STATUSES, "status");
    const resolutionNotes = s(fd, "resolutionNotes");
    const closing = CLOSED_ISSUE_STATUSES.includes(status);
    if (closing && !resolutionNotes) throw new UserError("Resolution notes are required to resolve or close an issue.");
    const reopening = CLOSED_ISSUE_STATUSES.includes(is.status) && !closing;
    const data = {
      status,
      ownerId: await owner(user, s(fd, "ownerId")),
      team: s(fd, "team") ? oneOf(s(fd, "team"), TEAMS, "team") : null,
      priority: oneOf(s(fd, "priority") ?? is.priority, PRIORITIES, "priority"),
      dueDate: dateField(fd, "dueDate"),
      rootCause: s(fd, "rootCause"),
      resolutionNotes,
      missingEvidence: s(fd, "missingEvidence"),
      nextAction: s(fd, "nextAction"),
      blocksPayment: fd.get("blocksPayment") === "on",
      resolvedAt: closing ? is.resolvedAt ?? new Date() : null,
      ...(reopening ? { customerConfirmed: false, unblockConfirmed: false } : {}),
    };
    await db.issue.update({ where: { id: is.id }, data });
    const changes = [
      is.status !== status && `status ${labelOf(ISSUE_STATUSES, is.status)} → ${labelOf(ISSUE_STATUSES, status)}`,
      is.ownerId !== data.ownerId && "owner changed",
      is.blocksPayment !== data.blocksPayment && (data.blocksPayment ? "marked as blocking payment" : "no longer blocking payment"),
      (is.dueDate?.getTime() ?? 0) !== (data.dueDate?.getTime() ?? 0) && `due → ${fmtDate(data.dueDate)}`,
    ].filter(Boolean);
    await logEvent(user, {
      entityType: "issue", entityId: is.id, customerId: is.customerId,
      kind: is.status !== status ? "status_change" : "updated",
      visibility: is.status !== status ? "customer" : "internal",
      message: `${changes.length ? changes.join("; ") : "Details updated"}.${closing && resolutionNotes ? ` Resolution: ${resolutionNotes}` : ""}`,
    });
    revalidatePath(`/issues/${is.id}`);
    return "Issue updated.";
  });
}

export async function commentIssue(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("issues:edit");
    const is = await db.issue.findFirst({ where: { id, orgId: user.orgId } });
    if (!is) throw new UserError("Issue not found.");
    const text = req(fd, "comment", "Comment");
    if (text.length > 4000) throw new UserError("Comment is too long.");
    const visibility = fd.get("visibility") === "customer" ? "customer" : "internal";
    await logEvent(user, { entityType: "issue", entityId: is.id, customerId: is.customerId, kind: "comment", visibility, message: text });
    revalidatePath(`/issues/${is.id}`);
    return visibility === "customer" ? "Comment added (visible to customer)." : "Internal comment added.";
  });
}

/** Records that the customer confirmed resolution outside the portal (e.g. by email/phone). */
export async function recordCustomerConfirmation(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("issues:edit");
    const is = await db.issue.findFirst({ where: { id, orgId: user.orgId } });
    if (!is) throw new UserError("Issue not found.");
    if (!CLOSED_ISSUE_STATUSES.includes(is.status)) throw new UserError("Resolve the issue before recording customer confirmation.");
    const how = req(fd, "how", "How the customer confirmed");
    await db.issue.update({ where: { id: is.id }, data: { customerConfirmed: true } });
    await logEvent(user, { entityType: "issue", entityId: is.id, customerId: is.customerId, kind: "status_change", message: `Customer confirmed resolution (${how}).` });
    revalidatePath(`/issues/${is.id}`);
    return "Customer confirmation recorded.";
  });
}

/** An authorized finance user confirms the linked invoice is no longer blocked. Never automatic. */
export async function confirmUnblocked(id: string, _: ActionState, __: FormData) {
  return run(async () => {
    const user = await authorize("receivables:edit");
    const is = await db.issue.findFirst({ where: { id, orgId: user.orgId } });
    if (!is) throw new UserError("Issue not found.");
    if (!CLOSED_ISSUE_STATUSES.includes(is.status)) throw new UserError("The issue must be resolved first.");
    await db.issue.update({ where: { id: is.id }, data: { unblockConfirmed: true, blocksPayment: false } });
    await logEvent(user, { entityType: "issue", entityId: is.id, customerId: is.customerId, kind: "status_change", message: "Finance confirmed the linked invoice/order is unblocked." });
    if (is.invoiceId) await logEvent(user, { entityType: "invoice", entityId: is.invoiceId, customerId: is.customerId, kind: "updated", message: `Payment blocker ${is.number} cleared by ${user.name}.` });
    revalidatePath(`/issues/${is.id}`);
    return "Unblock confirmed.";
  });
}

// ---------- Tasks ----------

export async function createTask(_: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("tasks:edit");
    const hasLink = s(fd, "customerId") || s(fd, "invoiceId") || s(fd, "orderId");
    const links = hasLink ? await resolveLinks(user, fd) : { customerId: null, invoiceId: null, orderId: null };
    const issueId = s(fd, "issueId");
    if (issueId && !(await db.issue.findFirst({ where: { id: issueId, orgId: user.orgId } }))) throw new UserError("Issue not found.");
    const t = await db.task.create({
      data: {
        orgId: user.orgId, title: req(fd, "title", "Title"), description: s(fd, "description") ?? "", ...links, issueId,
        ownerId: await owner(user, s(fd, "ownerId")), priority: oneOf(s(fd, "priority") ?? "medium", PRIORITIES, "priority"), dueDate: dateField(fd, "dueDate"),
        status: "open", createdById: user.id,
      },
    });
    await logEvent(user, { entityType: "task", entityId: t.id, customerId: links.customerId, kind: "created", message: `Task created: ${t.title}${t.dueDate ? ` (due ${fmtDate(t.dueDate)})` : ""}` });
    if (issueId) await logEvent(user, { entityType: "issue", entityId: issueId, customerId: links.customerId, kind: "updated", message: `Task assigned: ${t.title}` });
    redirect(`/tasks/${t.id}`);
  });
}

export async function updateTask(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("tasks:edit");
    const t = await db.task.findFirst({ where: { id, orgId: user.orgId } });
    if (!t) throw new UserError("Task not found.");
    const status = oneOf(s(fd, "status") ?? t.status, TASK_STATUSES, "status");
    const completing = status === "done" && t.status !== "done";
    await db.task.update({
      where: { id: t.id },
      data: {
        status, ownerId: await owner(user, s(fd, "ownerId")), priority: oneOf(s(fd, "priority") ?? t.priority, PRIORITIES, "priority"), dueDate: dateField(fd, "dueDate"),
        title: s(fd, "title") ?? t.title, description: s(fd, "description") ?? "",
        completedAt: status === "done" ? t.completedAt ?? new Date() : null, completedById: status === "done" ? t.completedById ?? user.id : null,
      },
    });
    await logEvent(user, { entityType: "task", entityId: t.id, customerId: t.customerId, kind: t.status !== status ? "status_change" : "updated", message: completing ? "Task completed." : t.status !== status ? `Status → ${labelOf(TASK_STATUSES, status)}.` : "Task updated." });
    revalidatePath(`/tasks/${t.id}`);
    revalidatePath("/tasks");
    return completing ? "Task completed." : "Task saved.";
  });
}

export async function completeTask(id: string, _: ActionState, __: FormData) {
  return run(async () => {
    const user = await authorize("tasks:edit");
    const t = await db.task.findFirst({ where: { id, orgId: user.orgId } });
    if (!t) throw new UserError("Task not found.");
    if (t.status === "done") throw new UserError("Already completed.");
    await db.task.update({ where: { id: t.id }, data: { status: "done", completedAt: new Date(), completedById: user.id } });
    await logEvent(user, { entityType: "task", entityId: t.id, customerId: t.customerId, kind: "status_change", message: "Task completed." });
    revalidatePath("/tasks");
    return "Done.";
  });
}

export async function commentTask(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("tasks:edit");
    const t = await db.task.findFirst({ where: { id, orgId: user.orgId } });
    if (!t) throw new UserError("Task not found.");
    await logEvent(user, { entityType: "task", entityId: t.id, customerId: t.customerId, kind: "comment", message: req(fd, "comment", "Comment") });
    revalidatePath(`/tasks/${t.id}`);
    return "Comment added.";
  });
}
