import { db } from "@/lib/db";
import { daysBetween, dateFromISO, isoOf } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, ORDER_PENDING_DELIVERY, RECEIVABLE_ACTION_CATEGORIES, labelOf } from "@/lib/domain/constants";
import { bucketLabels } from "@/lib/domain/receivables";
import type { SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getCustomerMap, getUserMap } from "./lookups";
import { loadInvoices, loadPromises, sumBy } from "./receivables";

export type DashboardFilters = {
  asOf: string;
  from: string;
  to: string;
  customerId?: string;
  ownerId?: string;
  businessUnitId?: string;
  invoiceStatus?: string;
  issueStatus?: string;
};

export async function getDashboard(user: SessionUser, f: DashboardFilters) {
  const ctx = user;
  const s = user.settings;
  const allInvoices = await loadInvoices(ctx, { asOf: f.asOf, customerId: f.customerId, ownerId: f.ownerId, businessUnitId: f.businessUnitId });
  const invoices = allInvoices.filter((i) => !f.invoiceStatus || i.status === f.invoiceStatus);
  const open = invoices.filter((i) => i.outstanding > 0);
  const overdue = open.filter((i) => (i.overdueDays ?? 0) > 0);
  const totalOutstanding = sumBy(open, (i) => i.outstanding);
  const overdueAmount = sumBy(overdue, (i) => i.outstanding);
  const invById = new Map(allInvoices.map((i) => [i.id, i]));

  const customerIdsInScope = f.businessUnitId ? new Set(allInvoices.map((i) => i.customerId)) : null;
  const issues = (await db.issue.findMany({
    where: { orgId: ctx.orgId, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}), createdAt: { lte: new Date(dateFromISO(f.asOf).getTime() + 86_400_000) } },
  })).filter((i) => !customerIdsInScope || customerIdsInScope.has(i.customerId));
  const openIssues = issues.filter((i) => !CLOSED_ISSUE_STATUSES.includes(i.status) && (!f.issueStatus || i.status === f.issueStatus));
  const blockers = openIssues.filter((i) => i.blocksPayment);

  const promises = (await loadPromises(ctx, f.customerId ? { customerId: f.customerId } : {}, f.asOf)).filter((p) => !f.ownerId || p.ownerId === f.ownerId);
  const promisesDueToday = promises.filter((p) => p.status === "open" && isoOf(p.promisedDate) === f.asOf);

  const actions = (await db.actionItem.findMany({
    where: { orgId: ctx.orgId, status: "open", ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}) },
    orderBy: [{ priorityScore: "desc" }, { dueDate: "asc" }],
  })).filter((a) => can(user, "receivables:view") || !RECEIVABLE_ACTION_CATEGORIES.includes(a.category));
  const overdueActions = actions.filter((a) => a.dueDate && isoOf(a.dueDate)! < f.asOf);

  const orders = await db.salesOrder.findMany({
    where: { orgId: ctx.orgId, status: { in: ORDER_PENDING_DELIVERY }, expectedDeliveryDate: { not: null }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.ownerId ? { ownerId: f.ownerId } : {}), ...(f.businessUnitId ? { businessUnitId: f.businessUnitId } : {}) },
  });
  const ordersAtRisk = orders.filter((o) => isoOf(o.expectedDeliveryDate)! <= f.asOf || daysBetween(f.asOf, o.expectedDeliveryDate!) <= s.priority.commitmentWindowDays);

  // Ageing
  const labels = bucketLabels(s.ageingBoundaries);
  const ageing = labels.map((label, idx) => {
    const rows = open.filter((i) => i.bucket === idx);
    return { idx, label, amount: sumBy(rows, (i) => i.outstanding), count: rows.length };
  });

  // Blocker distribution (value counted once per invoice per category)
  const blockerMap = new Map<string, { category: string; label: string; count: number; amount: number; inv: Set<string> }>();
  for (const i of blockers) {
    const e = blockerMap.get(i.category) ?? { category: i.category, label: labelOf(ISSUE_CATEGORIES, i.category), count: 0, amount: 0, inv: new Set<string>() };
    e.count++;
    if (i.invoiceId && !e.inv.has(i.invoiceId)) {
      e.inv.add(i.invoiceId);
      e.amount += invById.get(i.invoiceId)?.outstanding ?? 0;
    }
    blockerMap.set(i.category, e);
  }
  const blockerDist = [...blockerMap.values()].map(({ inv: _inv, ...r }) => ({ ...r, amount: Math.round(r.amount) })).sort((a, b) => b.amount - a.amount);

  // Collections in period
  const fromD = dateFromISO(f.from), toD = dateFromISO(f.to);
  const scopedCustomerIds = new Set(allInvoices.map((i) => i.customerId));
  const payments = (await db.payment.findMany({
    where: { orgId: ctx.orgId, paymentDate: { gte: fromD, lte: toD }, ...(f.customerId ? { customerId: f.customerId } : {}) },
  })).filter((p) => (!f.businessUnitId && !f.ownerId) || (p.invoiceId ? invById.has(p.invoiceId) : scopedCustomerIds.has(p.customerId)));
  const received = sumBy(payments, (p) => p.amount);
  const periodDays = daysBetween(f.from, f.to) + 1;
  const target = Math.round((s.monthlyCollectionTarget * periodDays) / 30);
  const inPeriod = promises.filter((p) => { const d = isoOf(p.promisedDate)!; return d >= f.from && d <= f.to; });
  const collection = {
    received, target, periodDays, payments: payments.length,
    promisesDue: inPeriod.length,
    promisesFulfilled: inPeriod.filter((p) => p.status === "fulfilled").length,
    promisesPartial: inPeriod.filter((p) => p.status === "partially_fulfilled").length,
    promisesMissed: inPeriod.filter((p) => p.status === "missed").length,
    promisesOpen: inPeriod.filter((p) => p.status === "open").length,
  };

  // Customer risk indicators (transparent rules, not a credit judgement)
  const customers = await getCustomerMap(ctx.orgId);
  const users = await getUserMap(ctx.orgId);
  const missedPromises = promises.filter((p) => p.status === "missed");
  const riskRows = [...new Set(open.map((i) => i.customerId))].map((cid) => {
    const inv = open.filter((i) => i.customerId === cid);
    const od = inv.filter((i) => (i.overdueDays ?? 0) > 0);
    const outstanding = sumBy(inv, (i) => i.outstanding);
    const missed = missedPromises.filter((p) => p.customerId === cid).length;
    const longDisputes = openIssues.filter((i) => i.customerId === cid && daysBetween(i.createdAt, f.asOf) >= s.risk.longDisputeDays).length;
    const flags: string[] = [];
    if (od.length >= s.risk.multipleOverdueInvoices) flags.push(`${od.length} overdue invoices`);
    if (missed >= s.risk.repeatedMissedPromises) flags.push(`${missed} missed promises`);
    else if (missed === 1) flags.push("1 missed promise");
    if (outstanding >= s.risk.largeOutstanding) flags.push("Large outstanding balance");
    if (longDisputes) flags.push(`${longDisputes} issue(s) open > ${s.risk.longDisputeDays} days`);
    return { customerId: cid, name: customers.get(cid)?.name ?? "—", outstanding, overdue: sumBy(od, (i) => i.outstanding), flags };
  }).filter((r) => r.flags.length).sort((a, b) => b.flags.length - a.flags.length || b.overdue - a.overdue);

  return {
    kpis: {
      totalOutstanding, overdueAmount,
      overduePct: totalOutstanding ? Math.round((overdueAmount / totalOutstanding) * 1000) / 10 : 0,
      openBlockers: blockers.length,
      promisesDueToday: promisesDueToday.length,
      promisesDueTodayAmount: sumBy(promisesDueToday, (p) => p.amount),
      overdueActions: overdueActions.length,
      openIssues: openIssues.length,
      pendingDeliveries: orders.length,
      ordersAtRisk: ordersAtRisk.length,
      openInvoiceCount: open.length,
      overdueInvoiceCount: overdue.length,
    },
    priorities: actions.slice(0, 6).map((a) => ({ ...a, customerName: a.customerId ? customers.get(a.customerId)?.name ?? "—" : "—", ownerName: a.ownerId ? users.get(a.ownerId) ?? "—" : "Unassigned" })),
    ageing,
    blockerDist,
    collection,
    riskRows: riskRows.slice(0, 8),
  };
}
