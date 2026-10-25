import Link from "next/link";
import { Card, Kpi, PageHeader, StatusBadge } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { PORTAL_STATUS, portalInvoices } from "@/lib/data/portal";
import { sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES, ISSUE_STATUSES, ORDER_PENDING_DELIVERY, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

export const metadata = { title: "Customer Portal" };

export default async function PortalHome() {
  const u = await requirePortal();
  const [invoices, orders, queries] = await Promise.all([
    portalInvoices(),
    db.salesOrder.findMany({ where: { orgId: u.orgId, customerId: u.customerId, status: { in: ORDER_PENDING_DELIVERY } }, orderBy: { expectedDeliveryDate: "asc" } }),
    db.issue.findMany({ where: { orgId: u.orgId, customerId: u.customerId, source: "portal" }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const open = invoices.filter((i) => i.outstanding > 0);

  return (
    <>
      <PageHeader title="Welcome" subtitle={`Your account with ${u.org.name}: orders, invoices, shared documents and queries in one place.`} actions={<Link href="/portal/queries/new" className="btn btn-primary">Raise a query</Link>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open invoices" value={open.length} href="/portal/invoices" />
        <Kpi label="Balance as per supplier records" value={fmtINR(sumBy(open, (i) => i.outstanding))} href="/portal/invoices" />
        <Kpi label="Orders in progress" value={orders.length} href="/portal/orders" />
        <Kpi label="Open queries" value={queries.filter((q) => !CLOSED_ISSUE_STATUSES.includes(q.status)).length} href="/portal/queries" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upcoming deliveries" bodyClass="p-0">
          <ul className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((o) => <li key={o.id} className="px-4 py-2 text-[13px]"><b>{o.number}</b> · PO {o.customerPoNumber || "—"}<div className="text-xs text-slate-500">Estimated delivery {fmtDate(o.expectedDeliveryDate)} (estimate, subject to change)</div></li>)}
            {orders.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No orders in progress.</li>}
          </ul>
        </Card>
        <Card title="Recent queries" bodyClass="p-0">
          <ul className="divide-y divide-slate-100">
            {queries.map((q) => <li key={q.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px]"><Link className="link" href={`/portal/queries/${q.id}`}>{q.number} {q.title}</Link><StatusBadge value={q.status} label={labelOf(ISSUE_STATUSES, q.status)} /></li>)}
            {queries.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No queries raised yet.</li>}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-[11px] text-slate-500">Status labels: {Object.values(PORTAL_STATUS).join(" · ")}. Please contact your account manager for anything not shown here.</p>
    </>
  );
}
