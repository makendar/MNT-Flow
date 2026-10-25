import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { CustomerSelect } from "@/components/lookups";
import { Badge, Card, Empty, Field, FilterBar, Kpi, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { updateDispatch } from "@/lib/actions/sales";
import { getCustomerMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { daysBetween, fmtDate, isoOf } from "@/lib/dates";
import { DISPATCH_STATUSES, labelOf } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Dispatch & Delivery" };

export default async function DispatchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("orders:view");
  const p = await readParams(searchParams);
  const [all, orders, customers] = await Promise.all([
    db.dispatch.findMany({ where: { orgId: user.orgId, ...(p("customer") ? { customerId: p("customer") } : {}) }, orderBy: { committedDate: "asc" } }),
    db.salesOrder.findMany({ where: { orgId: user.orgId }, select: { id: true, number: true } }),
    getCustomerMap(user.orgId),
  ]);
  const orderNo = new Map(orders.map((o) => [o.id, o.number]));
  const rows = all
    .filter((d) => !p("status") || d.status === p("status"))
    .filter((d) => p("pod") !== "missing" || (d.status === "delivered" && !d.podReceived));
  const late = all.filter((d) => d.status === "planned" && isoOf(d.committedDate)! < user.today);
  const podMissing = all.filter((d) => d.status === "delivered" && !d.podReceived);
  const canEdit = can(user, "dispatch:edit");

  return (
    <>
      <PageHeader title="Dispatch & Delivery" subtitle="Dispatch commitments, delivery confirmation and proof-of-delivery tracking. Plan new dispatches from an order page." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Planned dispatches" value={all.filter((d) => d.status === "planned").length} href="/dispatch?status=planned" />
        <Kpi label="Past committed date" value={late.length} tone={late.length ? "red" : "default"} href="/dispatch?status=planned" />
        <Kpi label="In transit" value={all.filter((d) => d.status === "dispatched").length} href="/dispatch?status=dispatched" />
        <Kpi label="Delivered, POD missing" value={podMissing.length} tone={podMissing.length ? "amber" : "default"} href="/dispatch?pod=missing" />
      </div>
      <FilterBar resetHref="/dispatch">
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <Field label="Status" className="w-36"><Select name="status" options={DISPATCH_STATUSES} defaultValue={p("status")} placeholder="All" /></Field>
        <Field label="Proof of delivery" className="w-36"><Select name="pod" options={[{ value: "missing", label: "Missing" }]} defaultValue={p("pod")} placeholder="Any" /></Field>
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} dispatch(es)`}>
        {rows.length === 0 ? <Empty title="No dispatches match" /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Challan</th><th>Order</th><th>Customer</th><th>Committed</th><th>Dispatched</th><th>Delivered</th><th>Status</th><th>POD</th>{canEdit && <th>Update</th>}</tr></thead>
              <tbody>
                {rows.map((d) => {
                  const c = isoOf(d.committedDate)!;
                  return (
                    <tr key={d.id}>
                      <td className="whitespace-nowrap font-medium">{d.challanNumber}<div className="text-[11px] font-normal text-slate-500">{d.transporter}</div></td>
                      <td><Link className="link" href={`/orders/${d.orderId}`}>{orderNo.get(d.orderId)}</Link></td>
                      <td className="min-w-40"><Link className="hover:underline" href={`/customers/${d.customerId}`}>{customers.get(d.customerId)?.name}</Link></td>
                      <td className="whitespace-nowrap">{fmtDate(d.committedDate)}{d.status === "planned" && c < user.today && <div><Badge tone="red">{daysBetween(c, user.today)}d late</Badge></div>}</td>
                      <td className="whitespace-nowrap">{fmtDate(d.dispatchDate)}</td>
                      <td className="whitespace-nowrap">{fmtDate(d.deliveredDate)}</td>
                      <td><StatusBadge value={d.status} label={labelOf(DISPATCH_STATUSES, d.status)} /></td>
                      <td>{d.status === "delivered" ? (d.podReceived ? <Badge tone="green">Received</Badge> : <Badge tone="red">Missing</Badge>) : "—"}</td>
                      {canEdit && (
                        <td>
                          <ActionForm action={updateDispatch.bind(null, d.id)} className="flex flex-wrap items-center gap-1">
                            <select name="status" defaultValue={d.status} className="input h-7 w-28 text-xs" aria-label="Status">
                              {DISPATCH_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <input type="date" name="date" max={user.today} className="input h-7 w-32 text-xs" aria-label="Date" />
                            <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" name="podReceived" defaultChecked={d.podReceived} /> POD</label>
                            <button className="btn btn-sm">Save</button>
                          </ActionForm>
                        </td>
                      )}
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
