import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { DocumentsPanel } from "@/components/documents-panel";
import { DispatchTable, IssuesTable } from "@/components/record-tables";
import { OrderForm } from "@/components/sales-forms";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Empty, Field, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { addDispatch, addOrderUpdate, linkInvoiceToOrder } from "@/lib/actions/sales";
import { getUserMap } from "@/lib/data/lookups";
import { loadInvoices } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { daysBetween, fmtDate, isoOf } from "@/lib/dates";
import { INVOICE_STATUSES, ORDER_PENDING_DELIVERY, ORDER_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("orders:view");
  const { id } = await params;
  const o = await db.salesOrder.findFirst({ where: { id, orgId: user.orgId } });
  if (!o) notFound();
  const showMoney = can(user, "receivables:view");
  const [customer, quote, dispatches, issues, users, events, customerInvoices] = await Promise.all([
    db.customer.findFirst({ where: { id: o.customerId, orgId: user.orgId } }),
    o.quotationId ? db.quotation.findFirst({ where: { id: o.quotationId, orgId: user.orgId } }) : null,
    db.dispatch.findMany({ where: { orgId: user.orgId, orderId: o.id }, orderBy: { committedDate: "asc" } }),
    db.issue.findMany({ where: { orgId: user.orgId, orderId: o.id }, orderBy: { createdAt: "desc" } }),
    getUserMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "order", entityId: o.id }, orderBy: { createdAt: "desc" } }),
    showMoney ? loadInvoices(user, { customerId: o.customerId }) : Promise.resolve([]),
  ]);
  const linked = customerInvoices.filter((i) => i.orderId === o.id);
  const linkable = customerInvoices.filter((i) => !i.orderId);
  const exp = isoOf(o.expectedDeliveryDate);
  const late = exp && ORDER_PENDING_DELIVERY.includes(o.status) && exp < user.today;
  const m = { users, today: user.today };

  return (
    <>
      <PageHeader
        title={`Order ${o.number}`}
        crumbs={[["Orders", "/orders"], [o.number]]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={o.status} label={labelOf(ORDER_STATUSES, o.status)} /><Link className="link" href={`/customers/${o.customerId}`}>{customer?.name}</Link><span>· PO {o.customerPoNumber || "—"} · {fmtINR(o.value)}</span></span>}
        actions={<Link href={`/issues/new?orderId=${o.id}`} className="btn">Raise issue</Link>}
      />
      {late && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">Delivery commitment of {fmtDate(exp)} has passed by {daysBetween(exp!, user.today)} day(s). {o.delayReason ? `Recorded reason: ${o.delayReason}.` : "No delay reason recorded yet."}</div>}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {can(user, "orders:edit") ? <Card title="Order details & delivery commitment"><OrderForm orgId={user.orgId} o={o} today={user.today} /></Card> : (
            <Card title="Order details">
              <dl className="dl"><dt>Order date</dt><dd>{fmtDate(o.orderDate)}</dd><dt>Expected delivery</dt><dd>{fmtDate(o.expectedDeliveryDate)}</dd><dt>Owner</dt><dd>{o.ownerId ? users.get(o.ownerId) : "—"}</dd><dt>Delay reason</dt><dd>{o.delayReason || "—"}</dd><dt>Notes</dt><dd>{o.notes || "—"}</dd></dl>
            </Card>
          )}
          <Card title="Dispatches" bodyClass="p-0">
            <DispatchTable rows={dispatches} m={m} orders={new Map([[o.id, o.number]])} />
            {can(user, "dispatch:edit") && (
              <ActionForm action={addDispatch.bind(null, o.id)} resetOnSuccess className="flex flex-wrap items-end gap-2 border-t border-slate-100 p-4">
                <Field label="Challan number" className="w-40"><input name="challanNumber" className="input" required /></Field>
                <Field label="Committed date" className="w-40"><input type="date" name="committedDate" className="input" required /></Field>
                <Field label="Transporter" className="w-48"><input name="transporter" className="input" /></Field>
                <button className="btn">Plan dispatch</button>
              </ActionForm>
            )}
          </Card>
          {showMoney && (
            <Card title="Linked invoices" bodyClass="p-0">
              {linked.length === 0 ? <Empty title="No invoices linked" /> : (
                <TableWrap>
                  <table className="tbl">
                    <thead><tr><th>Invoice</th><th>Date</th><th className="num">Total</th><th className="num">Outstanding</th><th>Status</th></tr></thead>
                    <tbody>{linked.map((i) => <tr key={i.id}><td><Link className="link" href={`/receivables/${i.id}`}>{i.number}</Link></td><td>{fmtDate(i.invoiceDate)}</td><td className="num">{fmtINR(i.total)}</td><td className="num">{fmtINR(i.outstanding)}</td><td><StatusBadge value={i.status} label={labelOf(INVOICE_STATUSES, i.status)} /></td></tr>)}</tbody>
                  </table>
                </TableWrap>
              )}
              {can(user, "orders:edit") && linkable.length > 0 && (
                <ActionForm action={linkInvoiceToOrder.bind(null, o.id)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 p-4">
                  <Field label="Link an invoice of this customer" className="w-72">
                    <select name="invoiceId" className="input" required defaultValue="">
                      <option value="" disabled>Select invoice</option>
                      {linkable.map((i) => <option key={i.id} value={i.id}>{i.number} · {fmtINR(i.total)}</option>)}
                    </select>
                  </Field>
                  <button className="btn">Link</button>
                </ActionForm>
              )}
            </Card>
          )}
          <Card title="Issues on this order" bodyClass="p-0"><IssuesTable rows={issues} m={m} /></Card>
          <Card title="Customer updates & history">
            {can(user, "orders:edit") && (
              <ActionForm action={addOrderUpdate.bind(null, o.id)} resetOnSuccess className="mb-4 space-y-2">
                <Field label="Record an update (e.g. what the customer was told)"><textarea name="comment" rows={2} className="input" required /></Field>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="shared" /> Visible to customer in portal</label>
                <button className="btn btn-primary">Add update</button>
              </ActionForm>
            )}
            <Timeline events={events} users={users} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Summary">
            <dl className="dl">
              <dt>Customer</dt><dd><Link className="link" href={`/customers/${o.customerId}`}>{customer?.name}</Link></dd>
              <dt>Customer PO</dt><dd className="font-mono text-xs">{o.customerPoNumber || "—"}</dd>
              <dt>Order value</dt><dd>{fmtINR(o.value)}</dd>
              <dt>Commitment</dt><dd>{fmtDate(o.expectedDeliveryDate)} {late && <Badge tone="red">Late</Badge>}</dd>
              <dt>Responsible</dt><dd>{o.ownerId ? users.get(o.ownerId) : "Unassigned"}</dd>
              <dt>Quotation</dt><dd>{quote ? <Link className="link" href={`/quotations/${quote.id}`}>{quote.number}</Link> : "—"}</dd>
            </dl>
          </Card>
          <DocumentsPanel user={user} link={{ orderId: o.id, customerId: o.customerId }} />
        </div>
      </div>
    </>
  );
}
