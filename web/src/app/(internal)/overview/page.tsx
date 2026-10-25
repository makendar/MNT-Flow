import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AgeingChart } from "@/components/charts";
import { BusinessUnitSelect, CustomerSelect, OwnerSelect } from "@/components/lookups";
import { Badge, Card, Empty, Field, FilterBar, Kpi, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { syncActions } from "@/lib/data/actions";
import { getDashboard } from "@/lib/data/dashboard";
import { addDays, fmtDate, isValidISO } from "@/lib/dates";
import { ACTION_CATEGORIES, INVOICE_STATUSES, ISSUE_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR, fmtINRCompact } from "@/lib/format";
import { recordHref } from "@/lib/links";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("overview:view");
  const p = await readParams(searchParams);
  const asOf = p("asOf") && isValidISO(p("asOf")!) ? p("asOf")! : user.today;
  const to = p("to") && isValidISO(p("to")!) ? p("to")! : asOf;
  const from = p("from") && isValidISO(p("from")!) ? p("from")! : addDays(to, -29);
  await syncActions(user);
  const f = { asOf, from, to, customerId: p("customer"), ownerId: p("owner"), businessUnitId: p("bu"), invoiceStatus: p("invoiceStatus"), issueStatus: p("issueStatus") };
  const d = await getDashboard(user, f);
  const k = d.kpis;
  const c = d.collection;
  const pct = c.target ? Math.min(100, Math.round((c.received / c.target) * 100)) : 0;
  const rq = new URLSearchParams(Object.entries({ customer: f.customerId, owner: f.ownerId, bu: f.businessUnitId, asOf: asOf !== user.today ? asOf : undefined }).filter(([, v]) => v) as [string, string][]).toString();
  const withF = (base: string) => (rq ? `${base}${base.includes("?") ? "&" : "?"}${rq}` : base);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={<>Reporting date <b className="text-slate-700">{fmtDate(asOf)}</b> · collections period {fmtDate(from)} – {fmtDate(to)} · every figure is calculated from the records in this workspace.</>}
      />
      <FilterBar resetHref="/overview">
        <Field label="Reporting date"><input type="date" name="asOf" defaultValue={asOf} className="input w-36" /></Field>
        <Field label="Period from"><input type="date" name="from" defaultValue={from} className="input w-36" /></Field>
        <Field label="Period to"><input type="date" name="to" defaultValue={to} className="input w-36" /></Field>
        <CustomerSelect orgId={user.orgId} value={f.customerId} />
        <OwnerSelect orgId={user.orgId} value={f.ownerId} />
        <BusinessUnitSelect orgId={user.orgId} value={f.businessUnitId} />
        <Field label="Invoice status" className="w-36"><Select name="invoiceStatus" options={INVOICE_STATUSES} defaultValue={f.invoiceStatus} placeholder="All" /></Field>
        <Field label="Issue status" className="w-40"><Select name="issueStatus" options={ISSUE_STATUSES.filter((s) => !["resolved", "closed"].includes(s.value))} defaultValue={f.issueStatus} placeholder="All open" /></Field>
      </FilterBar>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total outstanding" value={fmtINRCompact(k.totalOutstanding)} sub={`${fmtINR(k.totalOutstanding)} · ${k.openInvoiceCount} open invoices`} href={withF("/receivables?status=open")} />
        <Kpi label="Overdue receivables" value={fmtINRCompact(k.overdueAmount)} sub={`${k.overdueInvoiceCount} invoices past due date`} href={withF("/receivables?overdue=1")} tone={k.overdueAmount ? "red" : "default"} />
        <Kpi label="% of receivables overdue" value={`${k.overduePct}%`} sub="Overdue ÷ total outstanding" href={withF("/receivables?overdue=1")} tone={k.overduePct > 40 ? "red" : k.overduePct > 20 ? "amber" : "default"} />
        <Kpi label="Open payment blockers" value={k.openBlockers} sub="Open issues blocking payment" href={withF("/issues?blocking=1")} tone={k.openBlockers ? "amber" : "default"} />
        <Kpi label="Promises due today" value={k.promisesDueToday} sub={k.promisesDueToday ? fmtINR(k.promisesDueTodayAmount) : "No promises due"} href={withF("/receivables/promises?due=today")} />
        <Kpi label="Overdue action items" value={k.overdueActions} sub="Open actions past due date" href={withF("/action-center?due=overdue")} tone={k.overdueActions ? "red" : "default"} />
        <Kpi label="Open customer issues" value={k.openIssues} sub="Not yet resolved or closed" href={withF("/issues")} />
        <Kpi label="Orders pending delivery" value={k.pendingDeliveries} sub={`${k.ordersAtRisk} commitment(s) due ≤ ${user.settings.priority.commitmentWindowDays} days or late`} href={withF("/orders?pending=1")} tone={k.ordersAtRisk ? "amber" : "default"} />
      </div>

      <Card title="Today's priorities" actions={<Link href={withF("/action-center")} className="link text-xs">Open Action Center →</Link>} className="mb-4" bodyClass="p-0">
        {d.priorities.length === 0 ? (
          <Empty title="Nothing needs attention" hint="No open actions match these filters." />
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr><th>Priority</th><th>Action</th><th>Customer</th><th className="num">Amount</th><th>Why</th><th>Owner</th><th>Due</th><th>Next step</th></tr>
              </thead>
              <tbody>
                {d.priorities.map((a) => (
                  <tr key={a.id}>
                    <td><StatusBadge value={a.priority} /></td>
                    <td className="min-w-52">
                      <Link href={`/action-center/${a.id}`} className="link font-medium">{a.title}</Link>
                      <div className="text-[11px] text-slate-500">{labelOf(ACTION_CATEGORIES, a.category)}{recordHref(a) && <> · <Link className="link" href={recordHref(a)!}>record</Link></>}</div>
                    </td>
                    <td className="min-w-36">{a.customerId ? <Link href={`/customers/${a.customerId}`} className="hover:underline">{a.customerName}</Link> : "—"}</td>
                    <td className="num">{fmtINR(a.amount)}</td>
                    <td className="min-w-64 text-xs text-slate-600">{a.priorityReason}</td>
                    <td className="whitespace-nowrap">{a.ownerName}</td>
                    <td className="whitespace-nowrap">{fmtDate(a.dueDate)}</td>
                    <td className="min-w-56 text-xs text-slate-600">{a.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Card title="Receivables ageing" actions={<span className="text-[11px] text-slate-500">Outstanding by days past due date, as of {fmtDate(asOf)}</span>}>
          <AgeingChart data={d.ageing} />
          <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]">
            {d.ageing.map((b) => (
              <Link key={b.idx} href={withF(`/receivables?bucket=${b.idx}`)} className="rounded px-1 py-1 hover:bg-slate-100">
                <div className="text-slate-500">{b.label}</div>
                <div className="font-semibold tabular-nums text-slate-800">{fmtINRCompact(b.amount)}</div>
                <div className="text-slate-400">{b.count} inv.</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Payment blockers by category" bodyClass="p-0" actions={<Link href={withF("/issues?blocking=1")} className="link text-xs">View issues →</Link>}>
          {d.blockerDist.length === 0 ? (
            <Empty title="No open payment blockers" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Category</th><th className="num">Issues</th><th className="num">Outstanding blocked</th><th className="w-1/3">Share</th></tr></thead>
              <tbody>
                {d.blockerDist.map((b) => {
                  const max = Math.max(...d.blockerDist.map((x) => x.amount), 1);
                  return (
                    <tr key={b.category}>
                      <td><Link href={withF(`/issues?blocking=1&category=${b.category}`)} className="link">{b.label}</Link></td>
                      <td className="num">{b.count}</td>
                      <td className="num">{fmtINR(b.amount)}</td>
                      <td><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-amber-500" style={{ width: `${(b.amount / max) * 100}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Collections & payment promises" actions={<span className="text-[11px] text-slate-500">{fmtDate(from)} – {fmtDate(to)} ({c.periodDays} days)</span>}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Payments received</div>
              <div className="text-xl font-semibold tabular-nums text-slate-900">{fmtINR(c.received)}</div>
              <div className="text-xs text-slate-500">{c.payments} payment(s) recorded</div>
            </div>
            <div className="text-right text-xs text-slate-500">
              Target for period: <b className="text-slate-700">{fmtINR(c.target)}</b>
              <div>Monthly target {fmtINR(user.settings.monthlyCollectionTarget)} × {c.periodDays}/30 days (Settings)</div>
            </div>
          </div>
          <div className="mb-1 h-2.5 rounded bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-2.5 rounded ${pct >= 100 ? "bg-emerald-600" : pct >= 60 ? "bg-teal-600" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mb-4 text-xs text-slate-500">{pct}% of target collected</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["Promises due", c.promisesDue, "slate"],
              ["Fulfilled", c.promisesFulfilled, "green"],
              ["Partial", c.promisesPartial, "amber"],
              ["Missed", c.promisesMissed, "red"],
              ["Still open", c.promisesOpen, "blue"],
            ].map(([l, v, t]) => (
              <Link key={l as string} href={withF(`/receivables/promises?from=${from}&to=${to}`)} className="rounded border border-slate-200 p-2 text-center hover:bg-slate-50">
                <div className="text-[11px] text-slate-500">{l}</div>
                <div className={`text-lg font-semibold tabular-nums ${t === "red" && Number(v) > 0 ? "text-red-700" : "text-slate-800"}`}>{v}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Customer attention indicators" bodyClass="p-0" actions={<span className="text-[11px] text-slate-500">Rule-based signals, not a credit assessment</span>}>
          {d.riskRows.length === 0 ? (
            <Empty title="No customers meet the attention rules" />
          ) : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Customer</th><th className="num">Outstanding</th><th className="num">Overdue</th><th>Indicators</th></tr></thead>
                <tbody>
                  {d.riskRows.map((r) => (
                    <tr key={r.customerId}>
                      <td><Link href={`/customers/${r.customerId}`} className="link">{r.name}</Link></td>
                      <td className="num">{fmtINR(r.outstanding)}</td>
                      <td className="num">{fmtINR(r.overdue)}</td>
                      <td><div className="flex flex-wrap gap-1">{r.flags.map((fl) => <Badge key={fl} tone="amber"><AlertTriangle className="mr-1 h-3 w-3" />{fl}</Badge>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
          <p className="px-4 py-2 text-[11px] text-slate-500">
            Rules: ≥{user.settings.risk.multipleOverdueInvoices} overdue invoices, ≥{user.settings.risk.repeatedMissedPromises} missed promises, outstanding ≥ {fmtINR(user.settings.risk.largeOutstanding)}, or an issue open &gt; {user.settings.risk.longDisputeDays} days. Thresholds are configurable in Settings.
          </p>
        </Card>
      </div>
    </>
  );
}
