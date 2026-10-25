import Link from "next/link";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { ReceivablesTabs } from "@/components/subnav";
import { Card, Empty, Field, FilterBar, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { loadPromises, sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { fmtDate, isoOf } from "@/lib/dates";
import { PROMISE_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Payment promises" };

export default async function PromisesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("receivables:view");
  const p = await readParams(searchParams);
  const [all, customers, users, invoices] = await Promise.all([
    loadPromises(user, p("customer") ? { customerId: p("customer") } : {}),
    getCustomerMap(user.orgId),
    getUserMap(user.orgId),
    db.invoice.findMany({ where: { orgId: user.orgId }, select: { id: true, number: true } }),
  ]);
  const invNo = new Map(invoices.map((i) => [i.id, i.number]));
  const rows = all
    .filter((r) => !p("status") || r.status === p("status"))
    .filter((r) => !p("owner") || r.ownerId === p("owner"))
    .filter((r) => p("due") !== "today" || (r.status === "open" && isoOf(r.promisedDate) === user.today))
    .filter((r) => !p("from") || isoOf(r.promisedDate)! >= p("from")!)
    .filter((r) => !p("to") || isoOf(r.promisedDate)! <= p("to")!);

  return (
    <>
      <PageHeader title="Receivables" subtitle="Payment commitments made by customers and whether they were kept, derived from recorded payments." />
      <ReceivablesTabs active="promises" />
      <FilterBar resetHref="/receivables/promises">
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} label="Follow-up owner" />
        <Field label="Status" className="w-40"><Select name="status" options={PROMISE_STATUSES} defaultValue={p("status")} placeholder="All" /></Field>
        <Field label="Promised from"><input type="date" name="from" defaultValue={p("from")} className="input w-36" /></Field>
        <Field label="Promised to"><input type="date" name="to" defaultValue={p("to")} className="input w-36" /></Field>
        <Field label="Due" className="w-32"><Select name="due" options={[{ value: "today", label: "Due today" }]} defaultValue={p("due")} placeholder="Any" /></Field>
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} promise(s) · ${fmtINR(sumBy(rows, (r) => r.amount))} promised`}>
        {rows.length === 0 ? <Empty title="No promises match these filters" hint="Record promises from an invoice page." /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Promised date</th><th>Customer</th><th>Invoice</th><th className="num">Promised</th><th className="num">Paid by date</th><th>Contact</th><th>Owner</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{fmtDate(r.promisedDate)}</td>
                    <td><Link className="hover:underline" href={`/customers/${r.customerId}`}>{customers.get(r.customerId)?.name}</Link></td>
                    <td><Link className="link" href={`/receivables/${r.invoiceId}`}>{invNo.get(r.invoiceId)}</Link></td>
                    <td className="num">{fmtINR(r.amount)}</td>
                    <td className="num">{fmtINR(r.paidByDate)}</td>
                    <td>{r.contactName}</td>
                    <td>{r.ownerId ? users.get(r.ownerId) : "—"}</td>
                    <td><StatusBadge value={r.status} label={labelOf(PROMISE_STATUSES, r.status)} /></td>
                    <td className="max-w-64 text-xs text-slate-600">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
