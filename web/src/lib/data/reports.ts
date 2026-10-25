import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { addDays, dateFromISO, daysBetween, isoOf } from "@/lib/dates";
import { CHANNELS, CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, INVOICE_STATUSES, OPEN_QUOTE_STATUSES, ORDER_PENDING_DELIVERY, ORDER_STATUSES, PROMISE_STATUSES, QUOTE_STATUSES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import { getCustomerMap, getUserMap } from "./lookups";
import { loadInvoices, loadPromises, sumBy } from "./receivables";

export type ColType = "text" | "money" | "int" | "date" | "pct";
export type Col = { key: string; label: string; type?: ColType };
export type ReportResult = { columns: Col[]; rows: Record<string, string | number | null>[]; totals?: Record<string, string | number | null>; note?: string };
export type ReportFilters = { asOf: string; from: string; to: string; customerId?: string; ownerId?: string; businessUnitId?: string; status?: string; category?: string };

type Def = { key: string; title: string; description: string; filters: ("asOf" | "range" | "customer" | "owner" | "bu" | "status" | "category")[]; statusOptions?: readonly { value: string; label: string }[]; hidden?: boolean; run: (u: SessionUser, f: ReportFilters) => Promise<ReportResult> };

const iso = (d: Date | null | undefined) => isoOf(d);
const inRange = (d: Date | null | undefined, f: ReportFilters) => { const x = iso(d); return !!x && x >= f.from && x <= f.to; };

export const REPORTS: Def[] = [
  {
    key: "outstanding", title: "Outstanding receivables", description: "Every unpaid invoice with balance, days overdue and ageing bucket as of the reporting date.",
    filters: ["asOf", "customer", "owner", "bu", "status"], statusOptions: INVOICE_STATUSES.filter((s) => s.value !== "paid"),
    async run(u, f) {
      const labels = bucketLabels(u.settings.ageingBoundaries);
      const rows = (await loadInvoices(u, { asOf: f.asOf, customerId: f.customerId, ownerId: f.ownerId, businessUnitId: f.businessUnitId, status: f.status ?? "open" })).filter((r) => r.outstanding > 0);
      return {
        columns: [{ key: "invoice", label: "Invoice" }, { key: "customer", label: "Customer" }, { key: "invoiceDate", label: "Invoice date", type: "date" }, { key: "dueDate", label: "Due date", type: "date" }, { key: "total", label: "Total", type: "money" }, { key: "paid", label: "Paid", type: "money" }, { key: "credits", label: "Credits", type: "money" }, { key: "outstanding", label: "Outstanding", type: "money" }, { key: "overdueDays", label: "Days overdue", type: "int" }, { key: "bucket", label: "Bucket" }, { key: "status", label: "Status" }, { key: "owner", label: "Owner" }],
        rows: rows.map((r) => ({ invoice: r.number, customer: r.customerName, invoiceDate: iso(r.invoiceDate), dueDate: iso(r.dueDate), total: r.total, paid: r.paid, credits: r.credited, outstanding: r.outstanding, overdueDays: r.overdueDays, bucket: labels[r.bucket], status: labelOf(INVOICE_STATUSES, r.status), owner: r.ownerName })),
        totals: { invoice: `${rows.length} invoices`, total: sumBy(rows, (r) => r.total), paid: sumBy(rows, (r) => r.paid), credits: sumBy(rows, (r) => r.credited), outstanding: sumBy(rows, (r) => r.outstanding) },
      };
    },
  },
  {
    key: "ageing", title: "Ageing by bucket", description: "Outstanding balance per customer split by configurable overdue buckets.", filters: ["asOf", "customer", "owner", "bu"],
    async run(u, f) {
      const labels = bucketLabels(u.settings.ageingBoundaries);
      const inv = (await loadInvoices(u, { asOf: f.asOf, customerId: f.customerId, ownerId: f.ownerId, businessUnitId: f.businessUnitId })).filter((r) => r.outstanding > 0);
      const custs = [...new Set(inv.map((i) => i.customerName))].sort();
      const row = (name: string, xs: typeof inv) => ({ customer: name, ...Object.fromEntries(labels.map((_, i) => [`b${i}`, sumBy(xs.filter((x) => x.bucket === i), (x) => x.outstanding)])), total: sumBy(xs, (x) => x.outstanding) });
      return {
        columns: [{ key: "customer", label: "Customer" }, ...labels.map((l, i) => ({ key: `b${i}`, label: l, type: "money" as const })), { key: "total", label: "Total", type: "money" }],
        rows: custs.map((c) => row(c, inv.filter((i) => i.customerName === c))),
        totals: row("All customers", inv),
        note: `Buckets by days past due date as of ${f.asOf}. Boundaries: ${u.settings.ageingBoundaries.join(", ")} days (Settings).`,
      };
    },
  },
  {
    key: "top-overdue", title: "Top overdue customers", description: "Customers ranked by overdue balance.", filters: ["asOf", "owner", "bu"],
    async run(u, f) {
      const inv = (await loadInvoices(u, { asOf: f.asOf, ownerId: f.ownerId, businessUnitId: f.businessUnitId })).filter((r) => r.outstanding > 0 && (r.overdueDays ?? 0) > 0);
      const issues = await db.issue.groupBy({ by: ["customerId"], where: { orgId: u.orgId, status: { notIn: CLOSED_ISSUE_STATUSES } }, _count: true });
      const ic = new Map(issues.map((i) => [i.customerId, i._count]));
      const byC = [...new Set(inv.map((i) => i.customerId))].map((cid) => {
        const xs = inv.filter((i) => i.customerId === cid);
        return { customer: xs[0].customerName, invoices: xs.length, overdue: sumBy(xs, (x) => x.outstanding), oldest: Math.max(...xs.map((x) => x.overdueDays ?? 0)), openIssues: ic.get(cid) ?? 0 };
      }).sort((a, b) => b.overdue - a.overdue);
      return { columns: [{ key: "customer", label: "Customer" }, { key: "invoices", label: "Overdue invoices", type: "int" }, { key: "overdue", label: "Overdue balance", type: "money" }, { key: "oldest", label: "Oldest (days)", type: "int" }, { key: "openIssues", label: "Open issues", type: "int" }], rows: byC, totals: { customer: "Total", overdue: sumBy(byC, (r) => r.overdue) } };
    },
  },
  {
    key: "overdue-by-owner", title: "Overdue balance by owner", description: "Collection workload and overdue balance per collection owner.", filters: ["asOf", "bu"],
    async run(u, f) {
      const inv = (await loadInvoices(u, { asOf: f.asOf, businessUnitId: f.businessUnitId })).filter((r) => r.outstanding > 0);
      const owners = [...new Set(inv.map((i) => i.ownerName))].sort();
      const rows = owners.map((o) => { const xs = inv.filter((i) => i.ownerName === o); const od = xs.filter((x) => (x.overdueDays ?? 0) > 0); return { owner: o, open: xs.length, outstanding: sumBy(xs, (x) => x.outstanding), overdueInvoices: od.length, overdue: sumBy(od, (x) => x.outstanding) }; });
      return { columns: [{ key: "owner", label: "Owner" }, { key: "open", label: "Open invoices", type: "int" }, { key: "outstanding", label: "Outstanding", type: "money" }, { key: "overdueInvoices", label: "Overdue invoices", type: "int" }, { key: "overdue", label: "Overdue", type: "money" }], rows, totals: { owner: "Total", outstanding: sumBy(rows, (r) => r.outstanding), overdue: sumBy(rows, (r) => r.overdue) } };
    },
  },
  {
    key: "issues-by-category", title: "Open issues by category", description: "Open issues, payment blockers and blocked value per category.", filters: ["customer", "owner"],
    async run(u, f) {
      const [issues, inv] = await Promise.all([db.issue.findMany({ where: { orgId: u.orgId, status: { notIn: CLOSED_ISSUE_STATUSES }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}) } }), loadInvoices(u)]);
      const out = new Map(inv.map((i) => [i.id, i.outstanding]));
      const rows = ISSUE_CATEGORIES.map((c) => { const xs = issues.filter((i) => i.category === c.value); const bl = xs.filter((i) => i.blocksPayment); return { category: c.label, open: xs.length, blocking: bl.length, value: sumBy([...new Set(bl.map((i) => i.invoiceId).filter(Boolean))] as string[], (id) => out.get(id) ?? 0), avgAge: xs.length ? Math.round(xs.reduce((s, i) => s + daysBetween(i.createdAt, u.today), 0) / xs.length) : null }; }).filter((r) => r.open);
      return { columns: [{ key: "category", label: "Category" }, { key: "open", label: "Open", type: "int" }, { key: "blocking", label: "Blocking payment", type: "int" }, { key: "value", label: "Outstanding blocked", type: "money" }, { key: "avgAge", label: "Avg age (days)", type: "int" }], rows };
    },
  },
  {
    key: "issue-resolution", title: "Issue resolution time", description: "Issues resolved in the period and days taken to resolve.", filters: ["range", "customer", "category"], statusOptions: undefined,
    async run(u, f) {
      const [issues, cm] = await Promise.all([db.issue.findMany({ where: { orgId: u.orgId, resolvedAt: { not: null }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.category ? { category: f.category } : {}) } }), getCustomerMap(u.orgId)]);
      const rows = issues.filter((i) => inRange(i.resolvedAt, f)).map((i) => ({ issue: i.number, customer: cm.get(i.customerId)?.name ?? "", category: labelOf(ISSUE_CATEGORIES, i.category), created: iso(i.createdAt), resolved: iso(i.resolvedAt), days: daysBetween(i.createdAt, i.resolvedAt!), confirmed: i.customerConfirmed ? "Yes" : "No" }));
      const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.days, 0) / rows.length) * 10) / 10 : null;
      return { columns: [{ key: "issue", label: "Issue" }, { key: "customer", label: "Customer" }, { key: "category", label: "Category" }, { key: "created", label: "Created", type: "date" }, { key: "resolved", label: "Resolved", type: "date" }, { key: "days", label: "Days to resolve", type: "int" }, { key: "confirmed", label: "Customer confirmed" }], rows, note: avg !== null ? `Average ${avg} days across ${rows.length} resolved issue(s).` : "No issues resolved in this period." };
    },
  },
  {
    key: "missed-promises", title: "Missed payment promises", description: "Promises whose date passed without full payment, by promised date.", filters: ["range", "customer", "owner"],
    async run(u, f) {
      const [ps, cm, um, invs] = await Promise.all([loadPromises(u, f.customerId ? { customerId: f.customerId } : {}), getCustomerMap(u.orgId), getUserMap(u.orgId), db.invoice.findMany({ where: { orgId: u.orgId }, select: { id: true, number: true } })]);
      const no = new Map(invs.map((i) => [i.id, i.number]));
      const rows = ps.filter((p) => ["missed", "partially_fulfilled"].includes(p.status) && inRange(p.promisedDate, f) && (!f.ownerId || p.ownerId === f.ownerId)).map((p) => ({ promised: iso(p.promisedDate), customer: cm.get(p.customerId)?.name ?? "", invoice: no.get(p.invoiceId) ?? "", amount: p.amount, paid: p.paidByDate, contact: p.contactName, status: labelOf(PROMISE_STATUSES, p.status), owner: p.ownerId ? um.get(p.ownerId) ?? "" : "" }));
      return { columns: [{ key: "promised", label: "Promised date", type: "date" }, { key: "customer", label: "Customer" }, { key: "invoice", label: "Invoice" }, { key: "amount", label: "Promised", type: "money" }, { key: "paid", label: "Paid by date", type: "money" }, { key: "contact", label: "Contact" }, { key: "status", label: "Status" }, { key: "owner", label: "Owner" }], rows, totals: { promised: `${rows.length} promises`, amount: sumBy(rows, (r) => r.amount), paid: sumBy(rows, (r) => r.paid) } };
    },
  },
  {
    key: "collection-activities", title: "Collection activities completed", description: "Follow-ups logged in the period, by user and channel.", filters: ["range", "customer", "owner"],
    async run(u, f) {
      const [acts, um] = await Promise.all([db.collectionActivity.findMany({ where: { orgId: u.orgId, occurredAt: { gte: dateFromISO(f.from), lt: dateFromISO(addDays(f.to, 1)) }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { userId: f.ownerId } : {}) } }), getUserMap(u.orgId)]);
      const keys = [...new Set(acts.map((a) => a.userId ?? ""))];
      const rows = keys.map((k) => ({ user: um.get(k) ?? "—", ...Object.fromEntries(CHANNELS.map((c) => [c.value, acts.filter((a) => (a.userId ?? "") === k && a.channel === c.value).length])), total: acts.filter((a) => (a.userId ?? "") === k).length }));
      return { columns: [{ key: "user", label: "Logged by" }, ...CHANNELS.map((c) => ({ key: c.value, label: c.label, type: "int" as const })), { key: "total", label: "Total", type: "int" }], rows, totals: { user: "All users", total: acts.length } };
    },
  },
  {
    key: "quotes-followup", title: "Quotations awaiting follow-up", description: "Open quotations with a follow-up due on or before the reporting date.", filters: ["asOf", "customer", "owner"],
    async run(u, f) {
      const [qs, cm, um] = await Promise.all([db.quotation.findMany({ where: { orgId: u.orgId, status: { in: OPEN_QUOTE_STATUSES }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}) }, orderBy: { nextFollowUpDate: "asc" } }), getCustomerMap(u.orgId), getUserMap(u.orgId)]);
      const rows = qs.filter((q) => !q.nextFollowUpDate || iso(q.nextFollowUpDate)! <= f.asOf).map((q) => ({ quotation: q.number, customer: cm.get(q.customerId)?.name ?? "", amount: q.amount, status: labelOf(QUOTE_STATUSES, q.status), followUp: iso(q.nextFollowUpDate), daysLate: q.nextFollowUpDate ? Math.max(0, daysBetween(q.nextFollowUpDate, f.asOf)) : null, validUntil: iso(q.validUntil), owner: q.ownerId ? um.get(q.ownerId) ?? "" : "" }));
      return { columns: [{ key: "quotation", label: "Quotation" }, { key: "customer", label: "Customer" }, { key: "amount", label: "Amount", type: "money" }, { key: "status", label: "Status" }, { key: "followUp", label: "Follow-up due", type: "date" }, { key: "daysLate", label: "Days late", type: "int" }, { key: "validUntil", label: "Valid until", type: "date" }, { key: "owner", label: "Owner" }], rows, totals: { quotation: `${rows.length} quotations`, amount: sumBy(rows, (r) => r.amount) } };
    },
  },
  {
    key: "orders-overdue-delivery", title: "Orders with overdue delivery commitments", description: "Pending orders whose expected delivery date has passed.", filters: ["asOf", "customer", "owner", "bu"],
    async run(u, f) {
      const [os, cm, um] = await Promise.all([db.salesOrder.findMany({ where: { orgId: u.orgId, status: { in: ORDER_PENDING_DELIVERY }, expectedDeliveryDate: { lt: dateFromISO(f.asOf) }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}), ...(f.businessUnitId ? { businessUnitId: f.businessUnitId } : {}) }, orderBy: { expectedDeliveryDate: "asc" } }), getCustomerMap(u.orgId), getUserMap(u.orgId)]);
      const rows = os.map((o) => ({ order: o.number, customer: cm.get(o.customerId)?.name ?? "", po: o.customerPoNumber, value: o.value, committed: iso(o.expectedDeliveryDate), daysLate: daysBetween(o.expectedDeliveryDate!, f.asOf), status: labelOf(ORDER_STATUSES, o.status), reason: o.delayReason ?? "", owner: o.ownerId ? um.get(o.ownerId) ?? "" : "" }));
      return { columns: [{ key: "order", label: "Order" }, { key: "customer", label: "Customer" }, { key: "po", label: "Customer PO" }, { key: "value", label: "Value", type: "money" }, { key: "committed", label: "Committed date", type: "date" }, { key: "daysLate", label: "Days late", type: "int" }, { key: "status", label: "Status" }, { key: "reason", label: "Delay reason" }, { key: "owner", label: "Owner" }], rows };
    },
  },
  {
    key: "customer-summary", title: "Customer-wise outstanding & issue history", description: "Outstanding, overdue, issues and promise history per customer.", filters: ["asOf", "owner", "bu"],
    async run(u, f) {
      const [custs, inv, issues, ps] = await Promise.all([db.customer.findMany({ where: { orgId: u.orgId, ...(f.ownerId ? { ownerId: f.ownerId } : {}), ...(f.businessUnitId ? { businessUnitId: f.businessUnitId } : {}) }, orderBy: { name: "asc" } }), loadInvoices(u, { asOf: f.asOf }), db.issue.findMany({ where: { orgId: u.orgId } }), loadPromises(u, {}, f.asOf)]);
      const rows = custs.map((c) => { const xs = inv.filter((i) => i.customerId === c.id && i.outstanding > 0); const is = issues.filter((i) => i.customerId === c.id); return { customer: c.name, code: c.code, outstanding: sumBy(xs, (x) => x.outstanding), overdue: sumBy(xs.filter((x) => (x.overdueDays ?? 0) > 0), (x) => x.outstanding), openIssues: is.filter((i) => !CLOSED_ISSUE_STATUSES.includes(i.status)).length, totalIssues: is.length, missed: ps.filter((p) => p.customerId === c.id && p.status === "missed").length }; });
      return { columns: [{ key: "customer", label: "Customer" }, { key: "code", label: "Code" }, { key: "outstanding", label: "Outstanding", type: "money" }, { key: "overdue", label: "Overdue", type: "money" }, { key: "openIssues", label: "Open issues", type: "int" }, { key: "totalIssues", label: "All issues", type: "int" }, { key: "missed", label: "Missed promises", type: "int" }], rows, totals: { customer: "Total", outstanding: sumBy(rows, (r) => r.outstanding), overdue: sumBy(rows, (r) => r.overdue) } };
    },
  },
  // Raw data exports (Settings → Data export)
  {
    key: "export-customers", title: "Customer master export", description: "All customer records.", filters: [], hidden: true,
    async run(u) {
      const cs = await db.customer.findMany({ where: { orgId: u.orgId }, orderBy: { code: "asc" } });
      const cols = ["code", "name", "segment", "gstin", "city", "state", "primaryContactName", "primaryContactEmail", "accountsContactEmail", "paymentTermsDays", "status", "tags"];
      return { columns: cols.map((k) => ({ key: k, label: k })), rows: cs.map((c) => Object.fromEntries(cols.map((k) => [k, (c as unknown as Record<string, string | number | null>)[k]]))) };
    },
  },
  {
    key: "export-issues", title: "Issues export", description: "All issues with status and resolution.", filters: [], hidden: true,
    async run(u) {
      const [is, cm] = await Promise.all([db.issue.findMany({ where: { orgId: u.orgId }, orderBy: { number: "asc" } }), getCustomerMap(u.orgId)]);
      return { columns: ["number", "customer", "category", "title", "status", "priority", "created", "resolved", "blocksPayment", "resolutionNotes"].map((k) => ({ key: k, label: k })), rows: is.map((i) => ({ number: i.number, customer: cm.get(i.customerId)?.name ?? "", category: i.category, title: i.title, status: labelOf(ISSUE_STATUSES, i.status), priority: i.priority, created: iso(i.createdAt), resolved: iso(i.resolvedAt), blocksPayment: i.blocksPayment ? "yes" : "no", resolutionNotes: i.resolutionNotes ?? "" })) };
    },
  },
  {
    key: "export-payments", title: "Payments export", description: "All payments including unapplied.", filters: [], hidden: true,
    async run(u) {
      const [ps, cm, invs] = await Promise.all([db.payment.findMany({ where: { orgId: u.orgId }, orderBy: { paymentDate: "asc" } }), getCustomerMap(u.orgId), db.invoice.findMany({ where: { orgId: u.orgId }, select: { id: true, number: true } })]);
      const no = new Map(invs.map((i) => [i.id, i.number]));
      return { columns: [{ key: "date", label: "date", type: "date" }, { key: "customer", label: "customer" }, { key: "invoice", label: "invoice" }, { key: "amount", label: "amount", type: "money" }, { key: "reference", label: "reference" }], rows: ps.map((p) => ({ date: iso(p.paymentDate), customer: cm.get(p.customerId)?.name ?? "", invoice: p.invoiceId ? no.get(p.invoiceId) ?? "" : "UNAPPLIED", amount: p.amount, reference: p.reference })) };
    },
  },
];

export function getReport(key: string) {
  return REPORTS.find((r) => r.key === key);
}

export function reportFilters(user: SessionUser, p: (k: string) => string | undefined): ReportFilters {
  const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const asOf = ok(p("asOf")) ?? user.today;
  const to = ok(p("to")) ?? asOf;
  return { asOf, to, from: ok(p("from")) ?? addDays(to, -89), customerId: p("customer"), ownerId: p("owner"), businessUnitId: p("bu"), status: p("status"), category: p("category") };
}

/** CSV with formula-injection protection (cells starting with = + - @ are prefixed with '). */
export function toCSV(r: ReportResult): string {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [r.columns.map((c) => esc(c.label)).join(",")];
  for (const row of r.rows) lines.push(r.columns.map((c) => esc(row[c.key])).join(","));
  if (r.totals) lines.push(r.columns.map((c) => esc(r.totals![c.key])).join(","));
  return "\uFEFF" + lines.join("\r\n");
}
