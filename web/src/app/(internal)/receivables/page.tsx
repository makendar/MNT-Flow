import Link from "next/link";
import { BusinessUnitSelect, CustomerSelect, OwnerSelect } from "@/components/lookups";
import { ReceivablesTabs } from "@/components/subnav";
import { Badge, Card, Empty, Field, FilterBar, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { loadInvoices, sumBy } from "@/lib/data/receivables";
import { fmtDate, isValidISO } from "@/lib/dates";
import { INVOICE_STATUSES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import { fmtINR } from "@/lib/format";
import { qs, readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Receivables" };

export default async function ReceivablesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("receivables:view");
  const p = await readParams(searchParams);
  const asOf = p("asOf") && isValidISO(p("asOf")!) ? p("asOf")! : user.today;
  const labels = bucketLabels(user.settings.ageingBoundaries);
  const rows = (await loadInvoices(user, { asOf, customerId: p("customer"), ownerId: p("owner"), businessUnitId: p("bu"), status: p("status"), bucket: p("bucket"), q: p("q") }))
    .filter((r) => !p("overdue") || (r.outstanding > 0 && (r.overdueDays ?? 0) > 0));
  const totals = { total: sumBy(rows, (r) => r.total), paid: sumBy(rows, (r) => r.paid + r.credited), outstanding: sumBy(rows, (r) => r.outstanding), overdue: sumBy(rows.filter((r) => (r.overdueDays ?? 0) > 0), (r) => r.outstanding) };
  const exportQs = qs({ asOf, customer: p("customer"), owner: p("owner"), bu: p("bu"), status: p("status") });

  return (
    <>
      <PageHeader
        title="Receivables"
        subtitle={<>Balances as of <b className="text-slate-700">{fmtDate(asOf)}</b>. Outstanding = invoice total − payments − credit notes. Overdue days = reporting date − due date.</>}
        actions={can(user, "reports:export") && <a href={`/api/reports/outstanding${exportQs}`} className="btn">Export CSV</a>}
      />
      <ReceivablesTabs active="invoices" />
      <FilterBar resetHref="/receivables">
        <Field label="Search" className="w-44"><input name="q" defaultValue={p("q")} className="input" placeholder="Invoice no. or customer" /></Field>
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} label="Collection owner" />
        <BusinessUnitSelect orgId={user.orgId} value={p("bu")} />
        <Field label="Status" className="w-36"><Select name="status" options={[{ value: "open", label: "All unpaid" }, ...INVOICE_STATUSES]} defaultValue={p("status")} placeholder="All" /></Field>
        <Field label="Ageing bucket" className="w-32"><Select name="bucket" options={labels.map((l, i) => ({ value: String(i), label: l }))} defaultValue={p("bucket")} placeholder="All" /></Field>
        <Field label="Reporting date"><input type="date" name="asOf" defaultValue={asOf} className="input w-36" /></Field>
        {p("overdue") && <input type="hidden" name="overdue" value="1" />}
      </FilterBar>
      {p("overdue") && <p className="-mt-2 mb-3 text-xs text-slate-600">Showing invoices past their due date only. <Link className="link" href="/receivables">Clear</Link></p>}

      <Card bodyClass="p-0" title={`${rows.length} invoice(s)`}>
        {rows.length === 0 ? (
          <Empty title="No invoices match these filters" hint="Import invoices from your accounting system via Data Imports." action={can(user, "imports:run") ? <Link className="btn" href="/imports">Go to Data Imports</Link> : undefined} />
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Invoice date</th><th>Due date</th><th className="num">Total</th><th className="num">Paid + credits</th><th className="num">Outstanding</th>
                  <th className="num">Days overdue</th><th>Bucket</th><th>Status</th><th>Owner</th><th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/receivables/${r.id}`} className="link font-medium">{r.number}</Link>
                      {r.exceptions.length > 0 && <div><Badge tone="amber" title={r.exceptions.join(", ")}>{r.exceptions.length} exception</Badge></div>}
                    </td>
                    <td className="min-w-40"><Link href={`/customers/${r.customerId}`} className="hover:underline">{r.customerName}</Link></td>
                    <td className="whitespace-nowrap">{fmtDate(r.invoiceDate)}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                    <td className="num">{fmtINR(r.total)}</td>
                    <td className="num">{fmtINR(r.paid + r.credited)}</td>
                    <td className="num font-medium">{fmtINR(r.outstanding)}</td>
                    <td className={`num ${(r.overdueDays ?? 0) > 0 && r.outstanding > 0 ? "text-red-700" : ""}`}>{r.outstanding > 0 ? r.overdueDays ?? "—" : "—"}</td>
                    <td className="whitespace-nowrap text-xs">{r.outstanding > 0 ? labels[r.bucket] : "—"}</td>
                    <td>
                      <StatusBadge value={r.status} label={labelOf(INVOICE_STATUSES, r.status)} />
                      {r.status !== "paid" && r.paid > 0 && r.status !== "partially_paid" && <div className="mt-0.5 text-[10px] text-slate-500">part-paid</div>}
                    </td>
                    <td className="whitespace-nowrap">{r.ownerName}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.nextFollowUpDate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Totals for {rows.length} invoice(s) shown</td>
                  <td className="num">{fmtINR(totals.total)}</td>
                  <td className="num">{fmtINR(totals.paid)}</td>
                  <td className="num">{fmtINR(totals.outstanding)}</td>
                  <td colSpan={5} className="text-xs font-normal text-slate-600">of which overdue {fmtINR(totals.overdue)}</td>
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
