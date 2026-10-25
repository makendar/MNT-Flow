import Link from "next/link";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { QuotesTable } from "@/components/record-tables";
import { Card, Field, FilterBar, Kpi, PageHeader, Select } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { daysBetween, isoOf } from "@/lib/dates";
import { OPEN_QUOTE_STATUSES, QUOTE_STATUSES } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Quotations" };

export default async function QuotationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("quotes:view");
  const p = await readParams(searchParams);
  const [all, users, customers] = await Promise.all([db.quotation.findMany({ where: { orgId: user.orgId }, orderBy: { quoteDate: "desc" } }), getUserMap(user.orgId), getCustomerMap(user.orgId)]);
  const q = p("q")?.toLowerCase();
  const rows = all
    .filter((r) => !p("status") || (p("status") === "open" ? OPEN_QUOTE_STATUSES.includes(r.status) : r.status === p("status")))
    .filter((r) => !p("customer") || r.customerId === p("customer"))
    .filter((r) => !p("owner") || r.ownerId === p("owner"))
    .filter((r) => !p("followup") || (OPEN_QUOTE_STATUSES.includes(r.status) && !!r.nextFollowUpDate && isoOf(r.nextFollowUpDate)! < user.today))
    .filter((r) => !q || r.number.toLowerCase().includes(q) || (customers.get(r.customerId)?.name ?? "").toLowerCase().includes(q));

  const open = all.filter((r) => OPEN_QUOTE_STATUSES.includes(r.status));
  const decided = all.filter((r) => ["accepted", "rejected", "expired"].includes(r.status));
  const won = all.filter((r) => r.status === "accepted");
  const overdueFu = open.filter((r) => r.nextFollowUpDate && isoOf(r.nextFollowUpDate)! < user.today);
  const age = (lo: number, hi: number) => open.filter((r) => { const d = daysBetween(r.quoteDate, user.today); return d >= lo && d <= hi; });

  return (
    <>
      <PageHeader
        title="Quotations"
        subtitle="Lightweight quotation tracker for follow-ups and conversion. Quotations are recorded here; MNT Flow does not email them to customers."
        actions={can(user, "quotes:edit") && <Link href="/quotations/new" className="btn btn-primary">New quotation</Link>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Open pipeline" value={fmtINR(sumBy(open, (r) => r.amount))} sub={`${open.length} open quotation(s)`} href="/quotations?status=open" />
        <Kpi label="Follow-ups overdue" value={overdueFu.length} sub="Open quotes past next follow-up" tone={overdueFu.length ? "red" : "default"} href="/quotations?followup=1" />
        <Kpi label="Win rate (by count)" value={decided.length ? `${Math.round((won.length / decided.length) * 100)}%` : "—"} sub={`${won.length} accepted of ${decided.length} decided`} />
        <Kpi label="Won value" value={fmtINR(sumBy(won, (r) => r.amount))} sub="Accepted quotations" href="/quotations?status=accepted" />
        <Kpi label="Open quote ageing" value={`${age(0, 15).length} / ${age(16, 30).length} / ${age(31, 99999).length}`} sub="0–15 / 16–30 / 31+ days since quote" />
      </div>
      <FilterBar resetHref="/quotations">
        <Field label="Search" className="w-48"><input name="q" defaultValue={p("q")} className="input" placeholder="Number or customer" /></Field>
        <Field label="Status" className="w-48"><Select name="status" options={[{ value: "open", label: "All open" }, ...QUOTE_STATUSES]} defaultValue={p("status")} placeholder="All" /></Field>
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} label="Sales owner" />
        {p("followup") && <input type="hidden" name="followup" value="1" />}
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} quotation(s)`}><QuotesTable rows={rows} m={{ users, customers, today: user.today }} /></Card>
    </>
  );
}
