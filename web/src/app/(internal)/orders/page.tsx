import Link from "next/link";
import { BusinessUnitSelect, CustomerSelect, OwnerSelect } from "@/components/lookups";
import { OrdersTable } from "@/components/record-tables";
import { Card, Field, FilterBar, PageHeader, Select } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { isoOf } from "@/lib/dates";
import { ORDER_PENDING_DELIVERY, ORDER_STATUSES } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("orders:view");
  const p = await readParams(searchParams);
  const [all, users, customers] = await Promise.all([
    db.salesOrder.findMany({ where: { orgId: user.orgId, ...(p("customer") ? { customerId: p("customer") } : {}), ...(p("owner") ? { ownerId: p("owner") } : {}), ...(p("bu") ? { businessUnitId: p("bu") } : {}) }, orderBy: { orderDate: "desc" } }),
    getUserMap(user.orgId),
    getCustomerMap(user.orgId),
  ]);
  const q = p("q")?.toLowerCase();
  const rows = all
    .filter((o) => !p("status") || o.status === p("status"))
    .filter((o) => !p("pending") || (ORDER_PENDING_DELIVERY.includes(o.status) && !!o.expectedDeliveryDate))
    .filter((o) => !p("late") || (ORDER_PENDING_DELIVERY.includes(o.status) && !!o.expectedDeliveryDate && isoOf(o.expectedDeliveryDate)! < user.today))
    .filter((o) => !q || [o.number, o.customerPoNumber, customers.get(o.customerId)?.name ?? ""].some((v) => v.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Order register and delivery commitments. Expected delivery dates are operational commitments, not guarantees. No production planning or inventory is tracked here."
        actions={can(user, "orders:edit") && <Link href="/orders/new" className="btn btn-primary">New order</Link>}
      />
      <FilterBar resetHref="/orders">
        <Field label="Search" className="w-48"><input name="q" defaultValue={p("q")} className="input" placeholder="Order, PO or customer" /></Field>
        <Field label="Status" className="w-44"><Select name="status" options={ORDER_STATUSES} defaultValue={p("status")} placeholder="All" /></Field>
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} />
        <BusinessUnitSelect orgId={user.orgId} value={p("bu")} />
        <Field label="Delivery" className="w-44"><Select name="late" options={[{ value: "1", label: "Past commitment only" }]} defaultValue={p("late")} placeholder="Any" /></Field>
        {p("pending") && <input type="hidden" name="pending" value="1" />}
      </FilterBar>
      {p("pending") && <p className="-mt-2 mb-3 text-xs text-slate-600">Showing orders with a pending delivery commitment. <Link className="link" href="/orders">Clear</Link></p>}
      <Card bodyClass="p-0" title={`${rows.length} order(s)`}><OrdersTable rows={rows} m={{ users, customers, today: user.today }} /></Card>
    </>
  );
}
