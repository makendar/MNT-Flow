import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Timeline } from "@/components/timeline";
import { Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { portalUploadEvidence } from "@/lib/actions/documents";
import { acknowledgeResolution, portalComment } from "@/lib/actions/portal";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { ISSUE_STATUSES, PORTAL_QUERY_TYPES, labelOf } from "@/lib/domain/constants";

export default async function PortalQueryDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requirePortal();
  const { id } = await params;
  const q = await db.issue.findFirst({ where: { id, orgId: u.orgId, customerId: u.customerId, source: "portal" } });
  if (!q) notFound();
  const [events, docs, staff, invoice, order] = await Promise.all([
    // Only customer-visible events; internal comments and notes are never selected.
    db.activityEvent.findMany({ where: { orgId: u.orgId, entityType: "issue", entityId: q.id, visibility: "customer" }, orderBy: { createdAt: "desc" } }),
    db.document.findMany({ where: { orgId: u.orgId, issueId: q.id, customerId: u.customerId, sharedWithCustomer: true }, orderBy: { createdAt: "desc" } }),
    db.user.findMany({ where: { orgId: u.orgId }, select: { id: true, name: true } }),
    q.invoiceId ? db.invoice.findFirst({ where: { id: q.invoiceId, customerId: u.customerId }, select: { number: true } }) : null,
    q.orderId ? db.salesOrder.findFirst({ where: { id: q.orderId, customerId: u.customerId }, select: { number: true } }) : null,
  ]);
  const names = new Map(staff.map((s) => [s.id, s.name]));
  const resolved = ["resolved", "closed"].includes(q.status);

  return (
    <>
      <PageHeader title={`${q.number}: ${q.title}`} crumbs={[["My queries", "/portal/queries"], [q.number]]} subtitle={<span className="flex items-center gap-2"><StatusBadge value={q.status} label={labelOf(ISSUE_STATUSES, q.status)} />Raised {fmtDateTime(q.createdAt)}</span>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Your query">
            <dl className="dl">
              <dt>Type</dt><dd>{labelOf(PORTAL_QUERY_TYPES, q.category)}</dd>
              <dt>Invoice</dt><dd>{invoice?.number ?? "—"}</dd>
              <dt>Order</dt><dd>{order?.number ?? "—"}</dd>
              <dt>Target response</dt><dd>{fmtDate(q.dueDate)}</dd>
              <dt>Details</dt><dd className="whitespace-pre-wrap">{q.description}</dd>
              {resolved && q.resolutionNotes && <><dt>Resolution</dt><dd className="whitespace-pre-wrap">{q.resolutionNotes}</dd></>}
            </dl>
          </Card>
          {resolved && (
            <Card title="Resolution">
              {q.customerConfirmed ? <p className="text-[13px] text-emerald-700">You acknowledged this resolution. Thank you.</p> : (
                <ActionForm action={acknowledgeResolution.bind(null, q.id)}>
                  <p className="mb-2 text-[13px]">Our team has marked this query as resolved. Please confirm if this resolves it for you, or add a comment below if not.</p>
                  <button className="btn btn-primary">Acknowledge resolution</button>
                </ActionForm>
              )}
            </Card>
          )}
          <Card title="Conversation">
            <ActionForm action={portalComment.bind(null, q.id)} resetOnSuccess className="mb-4 space-y-2">
              <Field label="Add a comment or clarification"><textarea name="comment" rows={3} className="input" required maxLength={4000} /></Field>
              <button className="btn btn-primary">Send</button>
            </ActionForm>
            <Timeline events={events} users={names} showVisibility={false} />
          </Card>
        </div>
        <Card title="Supporting documents" bodyClass="p-0">
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => <li key={d.id} className="px-4 py-2 text-[13px]"><a className="link inline-flex items-center gap-1 break-all" href={`/api/documents/${d.id}`}><Download className="h-3.5 w-3.5 shrink-0" />{d.fileName}</a><div className="text-[11px] text-slate-500">{fmtDate(d.createdAt)} · {d.uploadedByPortal ? "Uploaded by you" : "Shared by supplier"}</div></li>)}
            {docs.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No documents yet.</li>}
          </ul>
          <ActionForm action={portalUploadEvidence.bind(null, q.id)} resetOnSuccess className="space-y-2 border-t border-slate-100 p-4">
            <Field label="Upload evidence" hint="PDF, image, CSV, XLSX, DOCX or TXT, max 5 MB"><input type="file" name="file" required className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1" /></Field>
            <button className="btn btn-sm">Upload</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
