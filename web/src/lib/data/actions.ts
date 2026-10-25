import { db } from "@/lib/db";
import { dateFromISO, isoOf } from "@/lib/dates";
import { buildActionCandidates, type ActionCandidate } from "@/lib/domain/actions";
import { CLOSED_ISSUE_STATUSES } from "@/lib/domain/constants";
import type { OrgSettings } from "@/lib/domain/settings";
import { loadInvoices, loadPromises } from "./receivables";

type Ctx = { orgId: string; today: string; settings: OrgSettings };

const COMPUTED = ["category", "title", "amount", "priority", "priorityScore", "priorityReason", "recommendedAction", "customerId", "invoiceId", "orderId", "issueId", "quotationId", "taskId", "promiseId"] as const;

/**
 * Idempotently reconciles the ActionItem table with the current source records.
 * User-owned fields (owner, due date, completion, resolution) are never overwritten.
 */
export async function syncActions(ctx: Ctx) {
  const [invoices, promises, issues, quotations, orders, dispatches, tasks, existing] = await Promise.all([
    loadInvoices(ctx),
    loadPromises(ctx),
    db.issue.findMany({ where: { orgId: ctx.orgId, status: { notIn: CLOSED_ISSUE_STATUSES } } }),
    db.quotation.findMany({ where: { orgId: ctx.orgId } }),
    db.salesOrder.findMany({ where: { orgId: ctx.orgId } }),
    db.dispatch.findMany({ where: { orgId: ctx.orgId } }),
    db.task.findMany({ where: { orgId: ctx.orgId, status: { not: "done" } } }),
    db.actionItem.findMany({ where: { orgId: ctx.orgId } }),
  ]);
  const candidates = buildActionCandidates({ invoices, promises, issues, quotations, orders, dispatches, tasks }, ctx.today, ctx.settings);
  const byKey = new Map(existing.map((a) => [a.key, a]));
  const seen = new Set<string>();
  const events: { entityId: string; customerId: string | null; message: string }[] = [];

  for (const c of candidates) {
    seen.add(c.key);
    const ex = byKey.get(c.key);
    const computed = pick(c);
    if (!ex) {
      await db.actionItem.upsert({
        where: { orgId_key: { orgId: ctx.orgId, key: c.key } },
        create: { orgId: ctx.orgId, key: c.key, ...computed, ownerId: c.ownerId, dueDate: c.dueDate ? dateFromISO(c.dueDate) : null },
        update: {},
      });
      continue;
    }
    const changed = COMPUTED.some((k) => (ex[k] ?? null) !== (computed[k] ?? null));
    const reopen = ex.status === "completed" && ex.systemClosed;
    if (changed || reopen || (!ex.ownerId && c.ownerId)) {
      await db.actionItem.update({
        where: { id: ex.id },
        data: {
          ...computed,
          ...(!ex.ownerId && c.ownerId ? { ownerId: c.ownerId } : {}),
          ...(reopen ? { status: "open", systemClosed: false, resolution: null, completedAt: null, completedById: null, dueDate: c.dueDate ? dateFromISO(c.dueDate) : ex.dueDate } : {}),
        },
      });
      if (reopen) events.push({ entityId: ex.id, customerId: ex.customerId, message: "Reopened automatically: the underlying condition has recurred." });
    }
  }

  for (const ex of existing) {
    if (seen.has(ex.key) || ex.status !== "open") continue;
    await db.actionItem.update({
      where: { id: ex.id },
      data: { status: "completed", systemClosed: true, completedAt: new Date(), resolution: "Closed automatically: the underlying condition has cleared (e.g. invoice paid, issue resolved, follow-up rescheduled)." },
    });
    events.push({ entityId: ex.id, customerId: ex.customerId, message: "Closed automatically: underlying condition cleared." });
  }

  if (events.length) {
    await db.activityEvent.createMany({
      data: events.map((e) => ({ orgId: ctx.orgId, entityType: "action", entityId: e.entityId, customerId: e.customerId, kind: "system", source: "system", message: e.message })),
    });
  }
}

function pick(c: ActionCandidate) {
  return {
    category: c.category,
    title: c.title,
    amount: c.amount,
    priority: c.priority,
    priorityScore: c.priorityScore,
    priorityReason: c.priorityReason,
    recommendedAction: c.recommendedAction,
    customerId: c.customerId,
    invoiceId: c.invoiceId ?? null,
    orderId: c.orderId ?? null,
    issueId: c.issueId ?? null,
    quotationId: c.quotationId ?? null,
    taskId: c.taskId ?? null,
    promiseId: c.promiseId ?? null,
  };
}

export function isOverdueAction(a: { status: string; dueDate: Date | null }, today: string) {
  return a.status === "open" && !!a.dueDate && isoOf(a.dueDate)! < today;
}
