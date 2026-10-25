import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { QuotationForm } from "@/components/sales-forms";
import { Timeline } from "@/components/timeline";
import { Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { convertQuotation } from "@/lib/actions/sales";
import { getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { daysBetween, fmtDate } from "@/lib/dates";
import { OPEN_QUOTE_STATUSES, QUOTE_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

export default async function QuotationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireInternal("quotes:view");
  const { id } = await params;
  const q = await db.quotation.findFirst({ where: { id, orgId: user.orgId } });
  if (!q) notFound();
  const [customer, order, users, events] = await Promise.all([
    db.customer.findFirst({ where: { id: q.customerId, orgId: user.orgId } }),
    db.salesOrder.findFirst({ where: { orgId: user.orgId, quotationId: q.id } }),
    getUserMap(user.orgId),
    db.activityEvent.findMany({ where: { orgId: user.orgId, entityType: "quotation", entityId: q.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const open = OPEN_QUOTE_STATUSES.includes(q.status);

  return (
    <>
      <PageHeader
        title={`Quotation ${q.number}`}
        crumbs={[["Quotations", "/quotations"], [q.number]]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={q.status} label={labelOf(QUOTE_STATUSES, q.status)} /><Link className="link" href={`/customers/${q.customerId}`}>{customer?.name}</Link><span>· {fmtINR(q.amount)}</span>{open && <span>· open {daysBetween(q.quoteDate, user.today)} days</span>}</span>}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {can(user, "quotes:edit") ? <Card title="Quotation details"><QuotationForm orgId={user.orgId} q={q} today={user.today} /></Card> : (
            <Card title="Quotation details">
              <dl className="dl">
                <dt>Date</dt><dd>{fmtDate(q.quoteDate)}</dd><dt>Valid until</dt><dd>{fmtDate(q.validUntil)}</dd><dt>Owner</dt><dd>{q.ownerId ? users.get(q.ownerId) : "—"}</dd>
                <dt>Next follow-up</dt><dd>{fmtDate(q.nextFollowUpDate)}</dd><dt>Feedback</dt><dd>{q.feedback || "—"}</dd><dt>Reason lost</dt><dd>{q.lostReason || "—"}</dd>
              </dl>
            </Card>
          )}
          <Card title="History"><Timeline events={events} users={users} /></Card>
        </div>
        <div className="space-y-4">
          <Card title="Sales order">
            {order ? (
              <p className="text-[13px]">Converted to <Link className="link font-medium" href={`/orders/${order.id}`}>{order.number}</Link> on {fmtDate(order.orderDate)}.</p>
            ) : q.status === "accepted" && can(user, "orders:edit") ? (
              <ActionForm action={convertQuotation.bind(null, q.id)} className="space-y-2">
                <p className="text-xs text-slate-500">Create a sales order for {fmtINR(q.amount)} linked to this quotation.</p>
                <Field label="Customer PO number"><input name="customerPoNumber" className="input" /></Field>
                <Field label="Expected delivery (commitment)"><input type="date" name="expectedDeliveryDate" min={user.today} className="input" /></Field>
                <button className="btn btn-primary">Create sales order</button>
              </ActionForm>
            ) : (
              <p className="text-xs text-slate-500">An order can be created once the quotation is marked Accepted.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
