import Link from "next/link";
import { notFound } from "next/navigation";
import { AiDraft } from "@/components/ai-draft";
import { CustomerForm } from "@/components/customer-form";
import { DocumentsPanel } from "@/components/documents-panel";
import { DispatchTable, IssuesTable, OrdersTable, QuotesTable, TasksTable } from "@/components/record-tables";
import { Timeline } from "@/components/timeline";
import { Badge, Card, Empty, Kpi, PageHeader, StatusBadge, TableWrap, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { aiSummarizeCustomer } from "@/lib/actions/ai";
import { getBusinessUnits, getUserMap } from "@/lib/data/lookups";
import { loadInvoices, loadPromises, sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES, CUSTOMER_STATUSES, INVOICE_STATUSES, PROMISE_STATUSES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireInternal("customers:view");
  const { id } = await params;
  const p = await readParams(searchParams);
  const c = await db.customer.findFirst({ where: { id, orgId: user.orgId } });
  if (!c) notFound();
  const showMoney = can(user, "receivables:view");
  const showQuotes = can(user, "quotes:view");
  const where = { orgId: user.orgId, customerId: id };
  const [users, bus, quotes, orders, dispatches, issues, tasks, invoices, promises, events, docCount] = await Promise.all([
    getUserMap(user.orgId),
    getBusinessUnits(user.orgId),
    showQuotes ? db.quotation.findMany({ where, orderBy: { quoteDate: "desc" } }) : Promise.resolve([]),
    db.salesOrder.findMany({ where, orderBy: { orderDate: "desc" } }),
    db.dispatch.findMany({ where, orderBy: { committedDate: "desc" } }),
    db.issue.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.task.findMany({ where, orderBy: [{ status: "asc" }, { dueDate: "asc" }] }),
    showMoney ? loadInvoices(user, { customerId: id }) : Promise.resolve([]),
    showMoney ? loadPromises(user, { customerId: id }) : Promise.resolve([]),
    db.activityEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db.document.count({ where }),
  ]);
  const m = { users, today: user.today };
  const orderNo = new Map(orders.map((o) => [o.id, o.number]));
  const open = invoices.filter((i) => i.outstanding > 0);
  const overdue = open.filter((i) => (i.overdueDays ?? 0) > 0);
  const openIssues = issues.filter((i) => !CLOSED_ISSUE_STATUSES.includes(i.status));
  const labels = bucketLabels(user.settings.ageingBoundaries);
  const tab = p("tab") ?? "overview";
  const tabs = [
    { key: "overview", label: "Overview" },
    ...(showQuotes ? [{ key: "quotations", label: "Quotations", count: quotes.length }] : []),
    { key: "orders", label: "Orders", count: orders.length },
    { key: "dispatches", label: "Dispatches", count: dispatches.length },
    ...(showMoney ? [{ key: "invoices", label: "Invoices & payments", count: invoices.length }] : []),
    { key: "issues", label: "Issues & disputes", count: issues.length },
    { key: "tasks", label: "Tasks", count: tasks.length },
    { key: "documents", label: "Documents", count: docCount },
    { key: "timeline", label: "Activity timeline" },
    ...(can(user, "customers:edit") ? [{ key: "edit", label: "Edit" }] : []),
  ].map((t) => ({ ...t, href: `/customers/${id}${t.key === "overview" ? "" : `?tab=${t.key}`}` }));

  return (
    <>
      <PageHeader
        title={c.name}
        crumbs={[["Customers", "/customers"], [c.code]]}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={c.status} label={labelOf(CUSTOMER_STATUSES, c.status)} /><span>{c.segment}</span><span>· {[c.city, c.state].filter(Boolean).join(", ")}</span>{c.isDemo && <Badge tone="amber">Demo record</Badge>}</span>}
        actions={<><Link href={`/issues/new?customerId=${c.id}`} className="btn">Raise issue</Link><Link href={`/tasks/new?customerId=${c.id}`} className="btn">New task</Link></>}
      />
      <Tabs tabs={tabs} active={tab} />

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {showMoney && <Kpi label="Outstanding" value={fmtINR(sumBy(open, (i) => i.outstanding))} sub={`${open.length} open invoice(s)`} href={`/receivables?customer=${c.id}&status=open`} />}
            {showMoney && <Kpi label="Overdue" value={fmtINR(sumBy(overdue, (i) => i.outstanding))} sub={`${overdue.length} invoice(s) past due`} tone={overdue.length ? "red" : "default"} href={`/receivables?customer=${c.id}&overdue=1`} />}
            <Kpi label="Open issues" value={openIssues.length} sub={`${openIssues.filter((i) => i.blocksPayment).length} blocking payment`} href={`/customers/${c.id}?tab=issues`} />
            {showMoney && <Kpi label="Missed promises" value={promises.filter((x) => x.status === "missed").length} sub={`${promises.length} promise(s) recorded`} />}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Profile">
              <dl className="dl">
                <dt>Customer code</dt><dd className="font-mono">{c.code}</dd>
                <dt>GSTIN</dt><dd>{c.gstin || "—"}</dd>
                <dt>Payment terms</dt><dd>{c.paymentTermsDays} days</dd>
                <dt>Account owner</dt><dd>{c.ownerId ? users.get(c.ownerId) : "—"}</dd>
                <dt>Business unit</dt><dd>{bus.find((b) => b.id === c.businessUnitId)?.name ?? "—"}</dd>
                <dt>Billing address</dt><dd className="whitespace-pre-wrap">{c.billingAddress || "—"}</dd>
                <dt>Shipping address</dt><dd className="whitespace-pre-wrap">{c.shippingAddress || "—"}</dd>
                <dt>Tags</dt><dd className="flex flex-wrap gap-1">{c.tags.split(",").filter(Boolean).map((t) => <Badge key={t}>{t}</Badge>)}</dd>
                <dt>Created / updated</dt><dd className="text-xs">{fmtDateTime(c.createdAt)} / {fmtDateTime(c.updatedAt)}</dd>
              </dl>
            </Card>
            <Card title="Contacts">
              <div className="space-y-3 text-[13px]">
                {[["Primary", c.primaryContactName, c.primaryContactEmail, c.primaryContactPhone], ["Procurement", c.procurementContactName, c.procurementContactEmail, c.procurementContactPhone], ["Accounts", c.accountsContactName, c.accountsContactEmail, c.accountsContactPhone]].map(([role, n, e, ph]) => (
                  <div key={role}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{role}</div>
                    <div>{n || "—"}</div>
                    <div className="text-xs text-slate-500">{e && <a className="link" href={`mailto:${e}`}>{e}</a>} {ph}</div>
                  </div>
                ))}
              </div>
              {c.notes && <div className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900"><b>Internal note:</b> {c.notes}</div>}
            </Card>
            <Card title="Recent activity" actions={<Link href={`/customers/${c.id}?tab=timeline`} className="link text-xs">Full timeline →</Link>}>
              <Timeline events={events.slice(0, 6)} users={users} showEntity />
            </Card>
          </div>
          <AiDraft title="Summarize recent interactions" description="Summarizes this customer's balances, open issues and recent activity from MNT Flow records." action={aiSummarizeCustomer.bind(null, c.id)} buttonLabel="Summarize" />
        </div>
      )}

      {tab === "quotations" && <Card bodyClass="p-0" actions={can(user, "quotes:edit") && <Link className="btn btn-sm" href={`/quotations/new?customerId=${c.id}`}>New quotation</Link>} title="Quotations"><QuotesTable rows={quotes} m={m} /></Card>}
      {tab === "orders" && <Card bodyClass="p-0" title="Sales orders" actions={can(user, "orders:edit") && <Link className="btn btn-sm" href={`/orders/new?customerId=${c.id}`}>New order</Link>}><OrdersTable rows={orders} m={m} /></Card>}
      {tab === "dispatches" && <Card bodyClass="p-0" title="Dispatches & deliveries"><DispatchTable rows={dispatches} m={m} orders={orderNo} /></Card>}
      {tab === "invoices" && showMoney && (
        <div className="space-y-4">
          <Card bodyClass="p-0" title={`Invoices · ${fmtINR(sumBy(open, (i) => i.outstanding))} outstanding`}>
            {invoices.length === 0 ? <Empty title="No invoices" /> : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th className="num">Total</th><th className="num">Paid + credits</th><th className="num">Outstanding</th><th>Bucket</th><th>Status</th></tr></thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td><Link className="link font-medium" href={`/receivables/${i.id}`}>{i.number}</Link></td>
                        <td>{fmtDate(i.invoiceDate)}</td><td>{fmtDate(i.dueDate)}</td>
                        <td className="num">{fmtINR(i.total)}</td><td className="num">{fmtINR(i.paid + i.credited)}</td><td className="num font-medium">{fmtINR(i.outstanding)}</td>
                        <td className="text-xs">{i.outstanding > 0 ? labels[i.bucket] : "—"}</td>
                        <td><StatusBadge value={i.status} label={labelOf(INVOICE_STATUSES, i.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
          <Card bodyClass="p-0" title="Payment promises">
            {promises.length === 0 ? <Empty title="No promises" /> : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Promised date</th><th className="num">Amount</th><th>Contact</th><th>Status</th></tr></thead>
                  <tbody>{promises.map((x) => <tr key={x.id}><td>{fmtDate(x.promisedDate)}</td><td className="num">{fmtINR(x.amount)}</td><td>{x.contactName}</td><td><StatusBadge value={x.status} label={labelOf(PROMISE_STATUSES, x.status)} /></td></tr>)}</tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
      )}
      {tab === "issues" && <Card bodyClass="p-0" title="Issues & disputes" actions={<Link className="btn btn-sm" href={`/issues/new?customerId=${c.id}`}>Raise issue</Link>}><IssuesTable rows={issues} m={m} /></Card>}
      {tab === "tasks" && <Card bodyClass="p-0" title="Tasks & follow-ups" actions={<Link className="btn btn-sm" href={`/tasks/new?customerId=${c.id}`}>New task</Link>}><TasksTable rows={tasks} m={m} /></Card>}
      {tab === "documents" && <DocumentsPanel user={user} link={{ customerId: c.id }} allForCustomer title="All documents for this customer" />}
      {tab === "timeline" && (
        <Card title="Consolidated activity timeline" actions={<span className="flex gap-1 text-[11px]"><Badge tone="violet">Imported</Badge><Badge tone="blue">User</Badge><Badge tone="slate">System</Badge><Badge tone="teal">Customer portal</Badge></span>}>
          <Timeline events={events} users={users} showEntity />
        </Card>
      )}
      {tab === "edit" && can(user, "customers:edit") && <Card title="Edit customer"><CustomerForm orgId={user.orgId} c={c} /></Card>}
    </>
  );
}
