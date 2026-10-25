import Link from "next/link";
import { BusinessUnitSelect, CustomerSelect, OwnerSelect } from "@/components/lookups";
import { Card, Empty, Field, FilterBar, PageHeader, Select, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { REPORTS, getReport, reportFilters, type ColType } from "@/lib/data/reports";
import { fmtDate } from "@/lib/dates";
import { ISSUE_CATEGORIES } from "@/lib/domain/constants";
import { cn, fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Reports & Insights" };

function cell(v: string | number | null | undefined, t?: ColType) {
  if (v === null || v === undefined || v === "") return "—";
  if (t === "money" && typeof v === "number") return fmtINR(v);
  if (t === "date" && typeof v === "string") return fmtDate(v);
  return String(v);
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("reports:view");
  const p = await readParams(searchParams);
  const visible = REPORTS.filter((r) => !r.hidden);
  const report = getReport(p("r") ?? "outstanding") ?? visible[0];
  const f = reportFilters(user, p);
  const result = await report.run(user, f);
  const sp = new URLSearchParams(Object.entries({ asOf: f.asOf, from: f.from, to: f.to, customer: f.customerId, owner: f.ownerId, bu: f.businessUnitId, status: f.status, category: f.category }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title="Reports & Insights" subtitle="Operational reports calculated from current records. Figures are management information, not audited financial statements." actions={can(user, "reports:export") && <a className="btn" href={`/api/reports/${report.key}?${sp}`}>Export CSV</a>} />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="card h-fit p-1" aria-label="Reports">
          {visible.map((r) => (
            <Link key={r.key} href={`/reports?r=${r.key}`} className={cn("block rounded px-3 py-2 text-[13px]", r.key === report.key ? "bg-blue-50 font-medium text-blue-800" : "text-slate-700 hover:bg-slate-50")}>{r.title}</Link>
          ))}
          <div className="mt-1 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            DSO and cash-flow forecasts are not shown: they need complete historical sales and receipt data and validation, which this dataset does not yet have.
          </div>
        </nav>
        <div className="min-w-0">
          <FilterBar resetHref={`/reports?r=${report.key}`}>
            <input type="hidden" name="r" value={report.key} />
            {report.filters.includes("asOf") && <Field label="Reporting date"><input type="date" name="asOf" defaultValue={f.asOf} className="input w-36" /></Field>}
            {report.filters.includes("range") && <><Field label="From"><input type="date" name="from" defaultValue={f.from} className="input w-36" /></Field><Field label="To"><input type="date" name="to" defaultValue={f.to} className="input w-36" /></Field></>}
            {report.filters.includes("customer") && <CustomerSelect orgId={user.orgId} value={f.customerId} />}
            {report.filters.includes("owner") && <OwnerSelect orgId={user.orgId} value={f.ownerId} />}
            {report.filters.includes("bu") && <BusinessUnitSelect orgId={user.orgId} value={f.businessUnitId} />}
            {report.filters.includes("status") && report.statusOptions && <Field label="Status" className="w-36"><Select name="status" options={report.statusOptions} defaultValue={f.status} placeholder="All unpaid" /></Field>}
            {report.filters.includes("category") && <Field label="Issue category" className="w-48"><Select name="category" options={ISSUE_CATEGORIES} defaultValue={f.category} placeholder="All" /></Field>}
          </FilterBar>
          <Card bodyClass="p-0" title={report.title} actions={<span className="text-[11px] text-slate-500">{result.rows.length} row(s)</span>}>
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{report.description}{result.note && <> {result.note}</>}</p>
            {result.rows.length === 0 ? <Empty title="No data for these filters" /> : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr>{result.columns.map((c) => <th key={c.key} className={c.type && c.type !== "text" && c.type !== "date" ? "num" : ""}>{c.label}</th>)}</tr></thead>
                  <tbody>{result.rows.map((r, i) => <tr key={i}>{result.columns.map((c) => <td key={c.key} className={c.type && c.type !== "text" && c.type !== "date" ? "num" : c.type === "date" ? "whitespace-nowrap" : ""}>{cell(r[c.key], c.type)}</td>)}</tr>)}</tbody>
                  {result.totals && <tfoot><tr>{result.columns.map((c) => <td key={c.key} className={c.type && c.type !== "text" && c.type !== "date" ? "num" : ""}>{result.totals![c.key] !== undefined ? cell(result.totals![c.key], c.type) : ""}</td>)}</tr></tfoot>}
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
