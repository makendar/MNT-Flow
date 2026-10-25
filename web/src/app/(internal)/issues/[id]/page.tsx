import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { AiDraft } from "@/components/ai-draft";
import { DocumentsPanel } from "@/components/documents-panel";
import { OwnerSelect } from "@/components/lookups";
import { TasksTable } from "@/components/record-tables";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Field, PageHeader, Select, StatusBadge } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { aiSummarizeIssue } from "@/lib/actions/ai";
import { commentIssue, confirmUnblocked, recordCustomerConfirmation, updateIssue } from "@/lib/actions/work";
import { getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { daysBetween, fmtDate, fmtDateTime, isoOf } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, PRIORITIES, TEAMS, labelOf } from "@/lib/domain/constants";

export default async function IssueDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("issues:view");
  const { id } = await params;
  const is = await db.issue.findFirst({ where: { id, orgId: user.orgId } });
  if (!is) notFound();
  const [customer, invoice, order, users, events, tasks] = await Promise.all([
    db.customer.findFirst({ where: { id: is.customerId, orgId: user.orgId } }),
    is.invoiceId ? db.invoice.findFirst({ where: { id: is.invoiceId, orgId: user.orgId } }) : null,
    is.orderId ? db.salesOrder.findFirst({ where: { id: is.orderId, orgId: user.orgId } }) : null,
    getUserMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "issue", entityId: is.id }, orderBy: { createdAt: "desc" } }),
    db.task.findMany({ where: { orgId: user.orgId, issueId: is.id }, orderBy: { dueDate: "asc" } }),
  ]);
  const closed = CLOSED_ISSUE_STATUSES.includes(is.status);
  const canEdit = can(user, "issues:edit");
  const due = isoOf(is.dueDate);
  const showMoney = can(user, "receivables:view");

  const checklist: [string, React.ReactNode, boolean][] = [
    ["What happened?", is.description || is.title, !!(is.description || is.title)],
    ["Which records are affected?", <span key="r" className="flex flex-wrap gap-2">{invoice && (showMoney ? <Link className="link" href={`/receivables/${invoice.id}`}>Invoice {invoice.number}</Link> : <span>Invoice {invoice.number}</span>)}{order && <Link className="link" href={`/orders/${order.id}`}>Order {order.number}</Link>}{!invoice && !order && "No invoice or order linked"}</span>, !!(invoice || order)],
    ["What evidence is missing?", is.missingEvidence || "Nothing recorded as missing", !is.missingEvidence || closed],
    ["Who is responsible?", `${is.ownerId ? users.get(is.ownerId) : "Unassigned"}${is.team ? ` (${labelOf(TEAMS, is.team)})` : ""}`, !!is.ownerId],
    ["What is the next action?", is.nextAction || "Not defined", !!is.nextAction || closed],
    ["By when?", due ? `${fmtDate(due)}${!closed && due < user.today ? ` (${daysBetween(due, user.today)} days overdue)` : ""}` : "No due date", !!due && (closed || due >= user.today)],
    ["Has the customer confirmed resolution?", is.customerConfirmed ? "Yes" : closed ? "Not yet" : "Issue still open", is.customerConfirmed],
    ["Did it unblock the invoice or order?", is.unblockConfirmed ? "Yes, confirmed by Finance" : is.blocksPayment && !closed ? "Still blocking payment" : closed ? "Awaiting Finance confirmation" : "Not blocking", is.unblockConfirmed || (!is.blocksPayment && !closed)],
  ];

  return (
    <>
      <PageHeader
        title={`${is.number}: ${is.title}`}
        crumbs={[["Issues & Disputes", "/issues"], [is.number]]}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={is.status} label={labelOf(ISSUE_STATUSES, is.status)} />
            <StatusBadge value={is.priority} label={`${is.priority} priority`} />
            <Badge>{labelOf(ISSUE_CATEGORIES, is.category)}</Badge>
            {is.blocksPayment && !closed && <Badge tone="amber">Blocks payment</Badge>}
            {is.source === "portal" && <Badge tone="teal">Raised via customer portal</Badge>}
            <Link className="link" href={`/customers/${is.customerId}`}>{customer?.name}</Link>
            <span>· opened {fmtDateTime(is.createdAt)} by {is.reportedBy || "—"}</span>
          </span>
        }
        actions={canEdit && <Link href={`/tasks/new?issueId=${is.id}&customerId=${is.customerId}`} className="btn">Assign task</Link>}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Resolution checklist" bodyClass="p-0">
            <ul className="divide-y divide-slate-100">
              {checklist.map(([q, a, ok]) => (
                <li key={q} className="flex gap-3 px-4 py-2.5">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Answered" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Open" />}
                  <div className="min-w-0 text-[13px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{q}</div>
                    <div className="text-slate-800">{a}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Comments & activity">
            {canEdit && (
              <ActionForm action={commentIssue.bind(null, is.id)} resetOnSuccess className="mb-4 space-y-2">
                <Field label="Add a comment"><textarea name="comment" rows={2} className="input" required /></Field>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="radio" name="visibility" value="internal" defaultChecked /> Internal only</label>
                  <label className="flex items-center gap-1"><input type="radio" name="visibility" value="customer" /> Visible to customer portal</label>
                  <button className="btn btn-primary btn-sm">Add comment</button>
                </div>
              </ActionForm>
            )}
            <Timeline events={events} users={users} />
          </Card>

          <AiDraft title="Summarize this issue" description="Summarizes the issue history from recorded facts. Internal use; review before sharing." action={aiSummarizeIssue.bind(null, is.id)} buttonLabel="Summarize" />
          <Card title="Tasks" bodyClass="p-0"><TasksTable rows={tasks} m={{ users, today: user.today }} /></Card>
        </div>

        <div className="space-y-4">
          {canEdit && (
            <Card title="Update issue">
              <ActionForm action={updateIssue.bind(null, is.id)} className="space-y-2">
                <Field label="Status"><Select name="status" options={ISSUE_STATUSES} defaultValue={is.status} /></Field>
                <OwnerSelect orgId={user.orgId} name="ownerId" label="Responsible owner" value={is.ownerId} placeholder="Unassigned" className="" />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Team"><Select name="team" options={TEAMS} defaultValue={is.team} placeholder="—" /></Field>
                  <Field label="Priority"><Select name="priority" options={PRIORITIES} defaultValue={is.priority} /></Field>
                </div>
                <Field label="Resolve by"><input type="date" name="dueDate" defaultValue={due ?? ""} className="input" /></Field>
                <Field label="Missing evidence"><input name="missingEvidence" defaultValue={is.missingEvidence ?? ""} className="input" /></Field>
                <Field label="Next action"><textarea name="nextAction" rows={2} defaultValue={is.nextAction ?? ""} className="input" /></Field>
                <Field label="Root cause (if established)"><input name="rootCause" defaultValue={is.rootCause ?? ""} className="input" /></Field>
                <Field label="Resolution notes" hint="Required to resolve or close"><textarea name="resolutionNotes" rows={2} defaultValue={is.resolutionNotes ?? ""} className="input" /></Field>
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="blocksPayment" defaultChecked={is.blocksPayment} /> Blocks payment</label>
                <button className="btn btn-primary">Save</button>
              </ActionForm>
            </Card>
          )}
          {closed && (
            <Card title="Close-out confirmations">
              <div className="space-y-3 text-[13px]">
                {is.customerConfirmed ? <p className="text-emerald-700">Customer has confirmed the resolution.</p> : canEdit && (
                  <ActionForm action={recordCustomerConfirmation.bind(null, is.id)} className="space-y-2">
                    <Field label="Record customer confirmation" hint="Customers can also acknowledge in the portal"><input name="how" className="input" placeholder="e.g. email from accounts on 12 Oct" required /></Field>
                    <button className="btn btn-sm">Record confirmation</button>
                  </ActionForm>
                )}
                {is.unblockConfirmed ? <p className="text-emerald-700">Finance confirmed the invoice/order is unblocked.</p> : can(user, "receivables:edit") ? (
                  <ActionForm action={confirmUnblocked.bind(null, is.id)}>
                    <p className="mb-1 text-xs text-slate-500">Uploading evidence never marks an invoice payable automatically. Confirm once you have verified it.</p>
                    <button className="btn btn-sm">Confirm invoice/order unblocked</button>
                  </ActionForm>
                ) : <p className="text-xs text-slate-500">Awaiting Finance confirmation that the invoice is unblocked.</p>}
              </div>
            </Card>
          )}
          <DocumentsPanel user={user} link={{ issueId: is.id, customerId: is.customerId, invoiceId: is.invoiceId, orderId: is.orderId }} />
        </div>
      </div>
    </>
  );
}
