import Link from "next/link";
import { Badge, Card, Empty, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { DISPATCH_STATUSES, ORDER_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

export const metadata = { title: "Orders & deliveries" };

export default async function PortalOrders() {
  const u = await requirePortal();
  const where = { orgId: u.orgId, customerId: u.customerId };
  const [orders, dispatches, updates] = await Promise.all([
    db.salesOrder.findMany({ where, orderBy: { orderDate: "desc" }, select: { id: true, number: true, customerPoNumber: true, orderDate: true, value: true, expectedDeliveryDate: true, status: true } }),
    db.dispatch.findMany({ where, select: { orderId: true, challanNumber: true, status: true, dispatchDate: true, deliveredDate: true } }),
    db.activityEvent.findMany({ where: { ...where, entityType: "order", visibility: "customer" }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Orders & deliveries" subtitle="Estimated delivery dates are operational commitments, not guarantees. We will update you if they change." />
      <Card bodyClass="p-0">
        {orders.length === 0 ? <Empty title="No orders" /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Order</th><th>Your PO</th><th>Order date</th><th className="num">Value</th><th>Estimated delivery</th><th>Status</th><th>Dispatches</th><th>Latest update</th><th /></tr></thead>
              <tbody>
                {orders.map((o) => {
                  const ds = dispatches.filter((d) => d.orderId === o.id);
                  const up = updates.find((e) => e.entityId === o.id);
                  return (
                    <tr key={o.id}>
                      <td className="font-medium">{o.number}</td>
                      <td className="font-mono text-xs">{o.customerPoNumber || "—"}</td>
                      <td>{fmtDate(o.orderDate)}</td>
                      <td className="num">{fmtINR(o.value)}</td>
                      <td>{fmtDate(o.expectedDeliveryDate)}</td>
                      <td><StatusBadge value={o.status} label={labelOf(ORDER_STATUSES, o.status)} /></td>
                      <td className="text-xs">{ds.map((d) => <div key={d.challanNumber}>{d.challanNumber} <Badge>{labelOf(DISPATCH_STATUSES, d.status)}</Badge> {d.deliveredDate && fmtDate(d.deliveredDate)}</div>)}{ds.length === 0 && "—"}</td>
                      <td className="max-w-56 text-xs text-slate-600">{up ? `${fmtDate(up.createdAt)}: ${up.message}` : "—"}</td>
                      <td><Link className="link text-xs" href={`/portal/queries/new?orderId=${o.id}`}>Raise query</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
