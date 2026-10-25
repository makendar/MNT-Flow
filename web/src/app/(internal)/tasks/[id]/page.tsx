import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { OwnerSelect } from "@/components/lookups";
import { Timeline } from "@/components/timeline";
import { Card, Field, PageHeader, Select, StatusBadge } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { commentTask, updateTask } from "@/lib/actions/work";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { fmtDateTime, isoOf } from "@/lib/dates";
import { PRIORITIES, TASK_STATUSES, labelOf } from "@/lib/domain/constants";

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("tasks:view");
  const { id } = await params;
  const t = await db.task.findFirst({ where: { id, orgId: user.orgId } });
  if (!t) notFound();
  const [users, customers, events] = await Promise.all([
    getUserMap(user.orgId),
    getCustomerMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "task", entityId: t.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const canEdit = can(user, "tasks:edit");

  return (
    <>
      <PageHeader title={t.title} crumbs={[["Tasks & Follow-ups", "/tasks"], ["Task"]]} subtitle={<span className="flex items-center gap-2"><StatusBadge value={t.status} label={labelOf(TASK_STATUSES, t.status)} />Created {fmtDateTime(t.createdAt)} by {t.createdById ? users.get(t.createdById) : "—"}</span>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {canEdit ? (
            <Card title="Task">
              <ActionForm action={updateTask.bind(null, t.id)} className="grid gap-3 md:grid-cols-4">
                <Field label="Title" className="md:col-span-4"><input name="title" defaultValue={t.title} className="input" required /></Field>
                <Field label="Description" className="md:col-span-4"><textarea name="description" rows={3} defaultValue={t.description} className="input" /></Field>
                <OwnerSelect orgId={user.orgId} name="ownerId" label="Owner" value={t.ownerId} placeholder="Unassigned" className="" />
                <Field label="Priority"><Select name="priority" options={PRIORITIES} defaultValue={t.priority} /></Field>
                <Field label="Due date"><input type="date" name="dueDate" defaultValue={isoOf(t.dueDate) ?? ""} className="input" /></Field>
                <Field label="Status"><Select name="status" options={TASK_STATUSES} defaultValue={t.status} /></Field>
                <div className="md:col-span-4"><button className="btn btn-primary">Save</button></div>
              </ActionForm>
            </Card>
          ) : <Card title="Task"><p className="whitespace-pre-wrap text-[13px]">{t.description || "—"}</p></Card>}
          <Card title="Comments & history">
            {canEdit && (
              <ActionForm action={commentTask.bind(null, t.id)} resetOnSuccess className="mb-4 flex flex-wrap items-end gap-2">
                <Field label="Comment" className="min-w-64 flex-1"><input name="comment" className="input" required /></Field>
                <button className="btn">Add</button>
              </ActionForm>
            )}
            <Timeline events={events} users={users} showVisibility={false} />
          </Card>
        </div>
        <Card title="Links">
          <dl className="dl">
            <dt>Customer</dt><dd>{t.customerId ? <Link className="link" href={`/customers/${t.customerId}`}>{customers.get(t.customerId)?.name}</Link> : "—"}</dd>
            <dt>Issue</dt><dd>{t.issueId ? <Link className="link" href={`/issues/${t.issueId}`}>Open issue</Link> : "—"}</dd>
            <dt>Invoice</dt><dd>{t.invoiceId && can(user, "receivables:view") ? <Link className="link" href={`/receivables/${t.invoiceId}`}>Open invoice</Link> : "—"}</dd>
            <dt>Order</dt><dd>{t.orderId ? <Link className="link" href={`/orders/${t.orderId}`}>Open order</Link> : "—"}</dd>
            <dt>Completed</dt><dd>{t.completedAt ? `${fmtDateTime(t.completedAt)} by ${t.completedById ? users.get(t.completedById) : "—"}` : "—"}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
