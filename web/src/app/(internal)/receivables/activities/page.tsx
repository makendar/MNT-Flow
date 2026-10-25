import Link from "next/link";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { ReceivablesTabs } from "@/components/subnav";
import { Badge, Card, Empty, Field, FilterBar, PageHeader, Select, TableWrap } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { dateFromISO, fmtDate, fmtDateTime } from "@/lib/dates";
import { CHANNELS, labelOf } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Collection activity" };

export default async function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("receivables:view");
  const p = await readParams(searchParams);
  const [rows, customers, users, invoices] = await Promise.all([
    db.collectionActivity.findMany({
      where: {
        orgId: user.orgId,
        ...(p("customer") ? { customerId: p("customer") } : {}),
        ...(p("owner") ? { userId: p("owner") } : {}),
        ...(p("channel") ? { channel: p("channel") } : {}),
        ...(p("from") || p("to") ? { occurredAt: { ...(p("from") ? { gte: dateFromISO(p("from")!) } : {}), ...(p("to") ? { lt: new Date(dateFromISO(p("to")!).getTime() + 86_400_000) } : {}) } } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: 300,
    }),
    getCustomerMap(user.orgId),
    getUserMap(user.orgId),
    db.invoice.findMany({ where: { orgId: user.orgId }, select: { id: true, number: true } }),
  ]);
  const invNo = new Map(invoices.map((i) => [i.id, i.number]));

  return (
    <>
      <PageHeader title="Receivables" subtitle="Manually logged follow-ups. MNT Flow does not send messages to customers automatically." />
      <ReceivablesTabs active="activities" />
      <FilterBar resetHref="/receivables/activities">
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} label="Logged by" />
        <Field label="Channel" className="w-32"><Select name="channel" options={CHANNELS} defaultValue={p("channel")} placeholder="All" /></Field>
        <Field label="From"><input type="date" name="from" defaultValue={p("from")} className="input w-36" /></Field>
        <Field label="To"><input type="date" name="to" defaultValue={p("to")} className="input w-36" /></Field>
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} activit${rows.length === 1 ? "y" : "ies"}`}>
        {rows.length === 0 ? <Empty title="No activity logged" hint="Log calls, emails and meetings from an invoice page." /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>When</th><th>Channel</th><th>Customer</th><th>Invoice</th><th>Summary</th><th>Customer response</th><th>Next step</th><th>By</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(a.occurredAt)}</td>
                    <td><Badge tone="blue">{labelOf(CHANNELS, a.channel)}</Badge></td>
                    <td className="min-w-36"><Link className="hover:underline" href={`/customers/${a.customerId}`}>{customers.get(a.customerId)?.name}</Link></td>
                    <td>{a.invoiceId ? <Link className="link" href={`/receivables/${a.invoiceId}`}>{invNo.get(a.invoiceId)}</Link> : "—"}</td>
                    <td className="min-w-48">{a.summary}</td>
                    <td className="min-w-48 text-slate-600">{a.customerResponse || "—"}</td>
                    <td className="min-w-40 text-xs">{a.nextStep || "—"}{a.nextFollowUpDate && <div className="text-slate-500">by {fmtDate(a.nextFollowUpDate)}</div>}</td>
                    <td className="whitespace-nowrap">{a.userId ? users.get(a.userId) : "—"}</td>
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
