import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AiDraft } from "@/components/ai-draft";
import { DocumentsPanel } from "@/components/documents-panel";
import { OwnerSelect } from "@/components/lookups";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Empty, Field, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { addCredit, cancelPromise, logCollection, recordPayment, recordPromise, updateInvoiceControl } from "@/lib/actions/receivables";
import { aiDraftFollowUp } from "@/lib/actions/ai";
import { getUserMap } from "@/lib/data/lookups";
import { loadInvoices, loadPromises } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime, isoOf } from "@/lib/dates";
import { CHANNELS, INVOICE_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, PROMISE_STATUSES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import { fmtINR, humanize } from "@/lib/format";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("receivables:view");
  const { id } = await params;
  const [inv] = await loadInvoices(user, { ids: [id] });
  if (!inv) notFound();
  const [payments, credits, promises, activities, issues, order, users, events, customer] = await Promise.all([
    db.payment.findMany({ where: { orgId: user.orgId, invoiceId: id }, orderBy: { paymentDate: "desc" } }),
    db.creditAdjustment.findMany({ where: { orgId: user.orgId, invoiceId: id }, orderBy: { date: "desc" } }),
    loadPromises(user, { invoiceId: id }),
    db.collectionActivity.findMany({ where: { orgId: user.orgId, invoiceId: id }, orderBy: { occurredAt: "desc" } }),
    db.issue.findMany({ where: { orgId: user.orgId, invoiceId: id }, orderBy: { createdAt: "desc" } }),
    inv.orderId ? db.salesOrder.findFirst({ where: { id: inv.orderId, orgId: user.orgId } }) : null,
    getUserMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "invoice", entityId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.customer.findFirst({ where: { id: inv.customerId, orgId: user.orgId } }),
  ]);
  const canEdit = can(user, "receivables:edit");
  const canPay = can(user, "payments:record");
  const labels = bucketLabels(user.settings.ageingBoundaries);

  return (
    <>
      <PageHeader
        title={`Invoice ${inv.number}`}
        crumbs={[["Receivables", "/receivables"], [inv.number]]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={inv.status} label={labelOf(INVOICE_STATUSES, inv.status)} /><Link className="link" href={`/customers/${inv.customerId}`}>{inv.customerName}</Link><span>· Owner {inv.ownerName}</span></span>}
        actions={<Link href={`/issues/new?invoiceId=${inv.id}`} className="btn">Raise issue</Link>}
      />
      {inv.exceptions.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Data exceptions: {inv.exceptions.join(" · ")}. Values are shown as recorded; correct them in the source system and re-import.</div>
      )}
      {inv.onHold && <div className="mb-4 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[13px] text-violet-900">Collection on hold: {inv.holdReason}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Invoice total", fmtINR(inv.total, true)],
          ["Payments", fmtINR(inv.paid, true)],
          ["Credits / adjustments", fmtINR(inv.credited, true)],
          ["Outstanding", fmtINR(inv.outstanding, true)],
          ["Due date", fmtDate(inv.dueDate)],
          ["Days overdue", inv.outstanding > 0 && inv.overdueDays ? `${inv.overdueDays} (${labels[inv.bucket]})` : "—"],
        ].map(([l, v]) => (
          <div key={l} className="card p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{l}</div>
            <div className="mt-1 font-semibold tabular-nums text-slate-900">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Payment promises" bodyClass="p-0">
            {promises.length === 0 ? <Empty title="No promises recorded" /> : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Promised date</th><th className="num">Amount</th><th className="num">Paid by date</th><th>Contact</th><th>Recorded</th><th>Status</th><th>Notes</th><th /></tr></thead>
                  <tbody>
                    {promises.map((pr) => (
                      <tr key={pr.id}>
                        <td className="whitespace-nowrap">{fmtDate(pr.promisedDate)}</td>
                        <td className="num">{fmtINR(pr.amount)}</td>
                        <td className="num">{fmtINR(pr.paidByDate)}</td>
                        <td>{pr.contactName}</td>
                        <td className="whitespace-nowrap">{fmtDate(pr.recordedAt)}</td>
                        <td><StatusBadge value={pr.status} label={labelOf(PROMISE_STATUSES, pr.status)} /></td>
                        <td className="max-w-56 whitespace-pre-wrap text-xs text-slate-600">{pr.notes}</td>
                        <td>
                          {canEdit && pr.status === "open" && (
                            <ActionForm action={cancelPromise.bind(null, pr.id)} className="flex gap-1">
                              <input name="reason" className="input h-7 w-28 text-xs" placeholder="Reason" required aria-label="Cancel reason" />
                              <button className="btn btn-sm">Cancel</button>
                            </ActionForm>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            <p className="px-4 py-2 text-[11px] text-slate-500">Status is derived: fulfilled when payments between the recorded and promised dates cover the amount; missed when the date passes without payment. A missed promise creates a reviewable action, never an automatic customer message.</p>
            {canEdit && inv.outstanding > 0 && (
              <ActionForm action={recordPromise.bind(null, inv.id)} resetOnSuccess className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
                <Field label="Promised amount (₹)"><input name="amount" inputMode="decimal" className="input" defaultValue={inv.outstanding} required /></Field>
                <Field label="Promised date"><input type="date" name="promisedDate" min={user.today} className="input" required /></Field>
                <Field label="Promised by (contact)"><input name="contactName" className="input" defaultValue={customer?.accountsContactName} required /></Field>
                <OwnerSelect orgId={user.orgId} name="ownerId" label="Follow-up owner" value={inv.ownerId} placeholder="Invoice owner" className="" />
                <Field label="Notes" className="sm:col-span-2"><input name="notes" className="input" /></Field>
                <div className="sm:col-span-3"><button className="btn btn-primary">Record promise</button></div>
              </ActionForm>
            )}
          </Card>

          <Card title="Collection activity" bodyClass="p-0">
            {canEdit && (
              <ActionForm action={logCollection.bind(null, inv.id)} resetOnSuccess className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-4">
                <Field label="Channel"><Select name="channel" options={CHANNELS} defaultValue="call" /></Field>
                <Field label="Summary" className="sm:col-span-3"><input name="summary" className="input" required placeholder="What was discussed" /></Field>
                <Field label="Customer response" className="sm:col-span-2"><input name="customerResponse" className="input" /></Field>
                <Field label="Next step"><input name="nextStep" className="input" /></Field>
                <Field label="Next follow-up"><input type="date" name="nextFollowUpDate" min={user.today} className="input" /></Field>
                <div className="sm:col-span-4"><button className="btn btn-primary">Log activity</button></div>
              </ActionForm>
            )}
            {activities.length === 0 ? <Empty title="No follow-ups logged yet" /> : (
              <ul className="divide-y divide-slate-100">
                {activities.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><Badge tone="blue">{labelOf(CHANNELS, a.channel)}</Badge>{fmtDateTime(a.occurredAt)} · {a.userId ? users.get(a.userId) : "—"}</div>
                    <div className="mt-0.5">{a.summary}</div>
                    {a.customerResponse && <div className="text-slate-600">Response: {a.customerResponse}</div>}
                    {(a.nextStep || a.nextFollowUpDate) && <div className="text-xs text-slate-500">Next: {a.nextStep || "—"} {a.nextFollowUpDate && `by ${fmtDate(a.nextFollowUpDate)}`}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Payments & credits" bodyClass="p-0">
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="num">Amount</th><th>Note</th></tr></thead>
                <tbody>
                  {payments.map((pm) => (
                    <tr key={pm.id}><td>{fmtDate(pm.paymentDate)}{isoOf(pm.paymentDate)! > user.today && <Badge tone="amber">after reporting date</Badge>}</td><td>Payment ({humanize(pm.mode)})</td><td>{pm.reference}</td><td className="num">{fmtINR(pm.amount, true)}</td><td className="text-xs text-slate-500">{pm.importBatchId ? "Imported" : "Recorded in MNT Flow"}</td></tr>
                  ))}
                  {credits.map((c) => (
                    <tr key={c.id}><td>{fmtDate(c.date)}</td><td>{c.type === "credit_note" ? "Credit note" : "Adjustment"}</td><td>{c.reference}</td><td className="num">{fmtINR(c.amount, true)}</td><td className="text-xs text-slate-600">{c.reason}</td></tr>
                  ))}
                  {payments.length + credits.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500">No payments or credits recorded.</td></tr>}
                </tbody>
              </table>
            </TableWrap>
            {canPay && inv.outstanding > 0 && (
              <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                <ActionForm action={recordPayment.bind(null, inv.id)} resetOnSuccess className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Record payment received</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Amount (₹)"><input name="amount" inputMode="decimal" className="input" required /></Field>
                    <Field label="Payment date"><input type="date" name="paymentDate" max={user.today} className="input" required /></Field>
                    <Field label="UTR / cheque no."><input name="reference" className="input" required /></Field>
                    <Field label="Mode"><Select name="mode" options={[{ value: "bank_transfer", label: "Bank transfer" }, { value: "cheque", label: "Cheque" }, { value: "upi", label: "UPI" }, { value: "other", label: "Other" }]} defaultValue="bank_transfer" /></Field>
                  </div>
                  <button className="btn btn-primary">Record payment</button>
                </ActionForm>
                <ActionForm action={addCredit.bind(null, inv.id)} resetOnSuccess className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Record credit note / adjustment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Amount (₹)"><input name="amount" inputMode="decimal" className="input" required /></Field>
                    <Field label="Type"><Select name="type" options={[{ value: "credit_note", label: "Credit note" }, { value: "adjustment", label: "Adjustment" }]} defaultValue="credit_note" /></Field>
                    <Field label="Reference"><input name="reference" className="input" /></Field>
                    <Field label="Date"><input type="date" name="date" max={user.today} className="input" /></Field>
                  </div>
                  <Field label="Reason"><input name="reason" className="input" required /></Field>
                  <button className="btn">Record credit</button>
                </ActionForm>
              </div>
            )}
          </Card>

          <AiDraft
            title="Draft a follow-up email"
            description="Generates a polite reminder using only this invoice's recorded figures. You review and send it yourself from your email client."
            action={aiDraftFollowUp.bind(null, inv.id)}
            buttonLabel="Generate draft"
          />

          <Card title="Activity timeline"><Timeline events={events} users={users} /></Card>
        </div>

        <div className="space-y-4">
          <Card title="Invoice details">
            <dl className="dl">
              <dt>Customer</dt><dd><Link className="link" href={`/customers/${inv.customerId}`}>{inv.customerName}</Link> ({inv.customerCode})</dd>
              <dt>Invoice date</dt><dd>{fmtDate(inv.invoiceDate)}</dd>
              <dt>Payment terms</dt><dd>{customer?.paymentTermsDays ?? "—"} days</dd>
              <dt>Currency</dt><dd>{inv.currency}</dd>
              <dt>Linked order</dt><dd>{order ? <Link className="link" href={`/orders/${order.id}`}>{order.number}</Link> : "—"}{order?.customerPoNumber && <div className="text-xs text-slate-500">Customer PO {order.customerPoNumber}</div>}</dd>
              <dt>Last follow-up</dt><dd>{fmtDate(inv.lastFollowUpDate)}</dd>
              <dt>Accounts contact</dt><dd>{customer?.accountsContactName || "—"}<div className="text-xs text-slate-500">{customer?.accountsContactEmail} {customer?.accountsContactPhone}</div></dd>
            </dl>
          </Card>
          {canEdit && (
            <Card title="Ownership & follow-up">
              <ActionForm action={updateInvoiceControl.bind(null, inv.id)} className="space-y-2">
                <OwnerSelect orgId={user.orgId} name="ownerId" label="Collection owner" value={inv.ownerId} placeholder="Unassigned" className="" />
                <Field label="Next follow-up date"><input type="date" name="nextFollowUpDate" defaultValue={isoOf(inv.nextFollowUpDate) ?? ""} className="input" /></Field>
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="onHold" defaultChecked={inv.onHold} disabled={!canPay} /> Collection on hold</label>
                <Field label="Hold reason"><input name="holdReason" defaultValue={inv.holdReason ?? ""} className="input" disabled={!canPay} /></Field>
                {!canPay && <input type="hidden" name="onHold" value={inv.onHold ? "on" : ""} />}
                {!canPay && <input type="hidden" name="holdReason" value={inv.holdReason ?? ""} />}
                <button className="btn">Save</button>
              </ActionForm>
            </Card>
          )}
          <Card title="Issues on this invoice" bodyClass="p-0" actions={<Link href={`/issues/new?invoiceId=${inv.id}`} className="link text-xs">+ Raise</Link>}>
            {issues.length === 0 ? <Empty title="No issues" /> : (
              <ul className="divide-y divide-slate-100">
                {issues.map((i) => (
                  <li key={i.id} className="px-4 py-2 text-[13px]">
                    <Link className="link font-medium" href={`/issues/${i.id}`}>{i.number}</Link> {i.title}
                    <div className="mt-0.5 flex flex-wrap gap-1"><StatusBadge value={i.status} label={labelOf(ISSUE_STATUSES, i.status)} /><Badge>{labelOf(ISSUE_CATEGORIES, i.category)}</Badge>{i.blocksPayment && <Badge tone="amber">Blocks payment</Badge>}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <DocumentsPanel user={user} link={{ invoiceId: inv.id, customerId: inv.customerId }} />
        </div>
      </div>
    </>
  );
}
