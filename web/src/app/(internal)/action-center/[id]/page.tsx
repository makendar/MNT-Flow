import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { OwnerSelect } from "@/components/lookups";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { assignAction, commentAction, completeAction, reopenAction, rescheduleAction } from "@/lib/actions/action-items";
import { syncActions } from "@/lib/data/actions";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, isoOf } from "@/lib/dates";
import { ACTION_CATEGORIES, RECEIVABLE_ACTION_CATEGORIES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

export default async function ActionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("actions:view");
  const { id } = await params;
  await syncActions(user);
  const a = await db.actionItem.findFirst({ where: { id, orgId: user.orgId } });
  if (!a || (!can(user, "receivables:view") && RECEIVABLE_ACTION_CATEGORIES.includes(a.category))) notFound();
  const [users, customers, events, invoice, issue, order, quote, task] = await Promise.all([
    getUserMap(user.orgId),
    getCustomerMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "action", entityId: a.id }, orderBy: { createdAt: "desc" } }),
    a.invoiceId ? db.invoice.findFirst({ where: { id: a.invoiceId, orgId: user.orgId } }) : null,
    a.issueId ? db.issue.findFirst({ where: { id: a.issueId, orgId: user.orgId } }) : null,
    a.orderId ? db.salesOrder.findFirst({ where: { id: a.orderId, orgId: user.orgId } }) : null,
    a.quotationId ? db.quotation.findFirst({ where: { id: a.quotationId, orgId: user.orgId } }) : null,
    a.taskId ? db.task.findFirst({ where: { id: a.taskId, orgId: user.orgId } }) : null,
  ]);
  const canEdit = can(user, "actions:edit");
  const t = user.settings.priority;

  return (
    <>
      <PageHeader
        title={a.title}
        crumbs={[["Action Center", "/action-center"], [labelOf(ACTION_CATEGORIES, a.category)]]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={a.priority} label={`${a.priority} priority`} />{a.status === "open" ? <Badge tone="blue">Open</Badge> : <Badge tone="green">Completed</Badge>}<span>Created {fmtDateTime(a.createdAt)}</span></span>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Why this needs attention">
            <p className="text-[13px] text-slate-800">{a.priorityReason}</p>
            <div className="mt-3 flex items-start gap-2 rounded bg-slate-50 p-2.5 text-[11px] text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Deterministic rule score {a.priorityScore} (high ≥ {t.highScore}, medium ≥ {t.mediumScore}). Signals: overdue ≥ {t.highOverdueDays} days (+30) / ≥ {t.mediumOverdueDays} days (+15),
                amount ≥ {fmtINR(t.highAmount)} (+25) / ≥ {fmtINR(t.mediumAmount)} (+12), missed promise (+25), unresolved blocking issue (+15), issue open ≥ {t.staleIssueDays} days (+15),
                missing document (+10), commitment past due (+25) or within {t.commitmentWindowDays} days (+15), late follow-up (+10). Thresholds are set in Settings.
              </span>
            </div>
          </Card>
          <Card title="Recommended next action">
            <p className="text-[13px] text-slate-800">{a.recommendedAction}</p>
            <p className="mt-2 text-[11px] text-slate-500">Suggested from a defined workflow playbook and the linked records. Review before acting; nothing is sent to the customer automatically.</p>
          </Card>
          {a.status === "completed" && (
            <Card title="Resolution">
              <p className="text-[13px]">{a.resolution}</p>
              <p className="mt-1 text-xs text-slate-500">
                {a.systemClosed ? "Closed automatically by the system" : `Completed by ${a.completedById ? users.get(a.completedById) : "—"}`} on {fmtDateTime(a.completedAt)}
              </p>
              {canEdit && (
                <ActionForm action={reopenAction.bind(null, a.id)} className="mt-3 flex flex-wrap items-end gap-2">
                  <Field label="Reason for reopening" className="min-w-64 flex-1"><input name="reason" className="input" required /></Field>
                  <button className="btn">Reopen action</button>
                </ActionForm>
              )}
            </Card>
          )}
          <Card title="Comments & history">
            {canEdit && (
              <ActionForm action={commentAction.bind(null, a.id)} resetOnSuccess className="mb-4 flex flex-wrap items-end gap-2">
                <Field label="Add a comment" className="min-w-64 flex-1"><textarea name="comment" rows={2} className="input" required maxLength={2000} /></Field>
                <button className="btn btn-primary">Add comment</button>
              </ActionForm>
            )}
            <Timeline events={events} users={users} showVisibility={false} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Details">
            <dl className="dl">
              <dt>Customer</dt><dd>{a.customerId ? <Link className="link" href={`/customers/${a.customerId}`}>{customers.get(a.customerId)?.name}</Link> : "—"}</dd>
              <dt>Amount</dt><dd>{fmtINR(a.amount)}</dd>
              <dt>Owner</dt><dd>{a.ownerId ? users.get(a.ownerId) : "Unassigned"}</dd>
              <dt>Due date</dt><dd>{fmtDate(a.dueDate)}{a.status === "open" && a.dueDate && isoOf(a.dueDate)! < user.today && <Badge tone="red">Overdue</Badge>}</dd>
              <dt>Linked records</dt>
              <dd className="space-y-0.5">
                {invoice && <div>Invoice <Link className="link" href={`/receivables/${invoice.id}`}>{invoice.number}</Link></div>}
                {issue && <div>Issue <Link className="link" href={`/issues/${issue.id}`}>{issue.number}</Link></div>}
                {order && <div>Order <Link className="link" href={`/orders/${order.id}`}>{order.number}</Link></div>}
                {quote && <div>Quotation <Link className="link" href={`/quotations/${quote.id}`}>{quote.number}</Link></div>}
                {task && <div>Task <Link className="link" href={`/tasks/${task.id}`}>{task.title}</Link></div>}
                {!invoice && !issue && !order && !quote && !task && "—"}
              </dd>
            </dl>
          </Card>
          {canEdit && a.status === "open" && (
            <>
              <Card title="Assign owner">
                <ActionForm action={assignAction.bind(null, a.id)} className="flex flex-wrap items-end gap-2">
                  <OwnerSelect orgId={user.orgId} name="ownerId" value={a.ownerId} placeholder="Unassigned" className="flex-1" />
                  <button className="btn">Save</button>
                </ActionForm>
              </Card>
              <Card title="Change due date">
                <ActionForm action={rescheduleAction.bind(null, a.id)} className="space-y-2">
                  <Field label="New due date"><input type="date" name="dueDate" defaultValue={isoOf(a.dueDate) ?? ""} className="input" required /></Field>
                  <Field label="Reason (optional)"><input name="reason" className="input" /></Field>
                  <button className="btn">Update due date</button>
                </ActionForm>
              </Card>
              <Card title="Complete action">
                <ActionForm action={completeAction.bind(null, a.id)} className="space-y-2">
                  <Field label="Resolution" hint="What was done and the outcome. Recorded with a timestamp in the audit trail."><textarea name="resolution" rows={3} className="input" required /></Field>
                  <button className="btn btn-primary">Mark completed</button>
                </ActionForm>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
