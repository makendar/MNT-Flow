import type { Invoice } from "@prisma/client";
import { db } from "@/lib/db";
import { dateFromISO } from "@/lib/dates";
import { CLOSED_ISSUE_STATUSES } from "@/lib/domain/constants";
import { computeInvoice, promiseStatus, type InvoiceCalc } from "@/lib/domain/receivables";
import type { OrgSettings } from "@/lib/domain/settings";
import { getCustomerMap, getUserMap } from "./lookups";

type Ctx = { orgId: string; today: string; settings: OrgSettings; customerId?: string | null };

export type InvoiceFilters = {
  asOf?: string;
  customerId?: string;
  ownerId?: string;
  businessUnitId?: string;
  status?: string;
  bucket?: string;
  q?: string;
  ids?: string[];
};

export type InvoiceRow = Invoice &
  InvoiceCalc & {
    customerName: string;
    customerCode: string;
    ownerName: string;
    openIssues: { id: string; number: string; category: string; blocksPayment: boolean }[];
  };

/** Loads invoices with derived balances as of the reporting date (payments/credits after that date are ignored). */
export async function loadInvoices(ctx: Ctx, f: InvoiceFilters = {}): Promise<InvoiceRow[]> {
  const asOf = f.asOf ?? ctx.today;
  const asOfEnd = dateFromISO(asOf);
  const invoices = await db.invoice.findMany({
    where: {
      orgId: ctx.orgId,
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.ownerId ? { ownerId: f.ownerId } : {}),
      ...(f.businessUnitId ? { businessUnitId: f.businessUnitId } : {}),
      ...(f.ids ? { id: { in: f.ids } } : {}),
      invoiceDate: { lte: asOfEnd },
    },
    orderBy: [{ dueDate: "asc" }, { number: "asc" }],
  });
  const ids = invoices.map((i) => i.id);
  const [payments, credits, issues, customers, users] = await Promise.all([
    db.payment.findMany({ where: { orgId: ctx.orgId, invoiceId: { in: ids }, paymentDate: { lte: asOfEnd } } }),
    db.creditAdjustment.findMany({ where: { orgId: ctx.orgId, invoiceId: { in: ids }, date: { lte: asOfEnd } } }),
    db.issue.findMany({ where: { orgId: ctx.orgId, invoiceId: { in: ids }, status: { notIn: CLOSED_ISSUE_STATUSES } }, select: { id: true, number: true, category: true, blocksPayment: true, invoiceId: true } }),
    getCustomerMap(ctx.orgId),
    getUserMap(ctx.orgId),
  ]);
  const group = <T extends { invoiceId: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) if (x.invoiceId) m.set(x.invoiceId, [...(m.get(x.invoiceId) ?? []), x]);
    return m;
  };
  const pBy = group(payments), cBy = group(credits), iBy = group(issues);
  const q = f.q?.trim().toLowerCase();

  return invoices
    .map((inv) => {
      const openIssues = iBy.get(inv.id) ?? [];
      const calc = computeInvoice(
        { total: inv.total, dueDate: inv.dueDate, currency: inv.currency, onHold: inv.onHold, payments: pBy.get(inv.id) ?? [], credits: cBy.get(inv.id) ?? [], openBlockingIssues: openIssues.filter((i) => i.blocksPayment).length },
        asOf,
        ctx.settings.ageingBoundaries,
      );
      const c = customers.get(inv.customerId);
      return { ...inv, ...calc, customerName: c?.name ?? "Unknown", customerCode: c?.code ?? "", ownerName: inv.ownerId ? users.get(inv.ownerId) ?? "—" : "Unassigned", openIssues };
    })
    .filter((r) => !f.status || (f.status === "open" ? r.outstanding > 0 : r.status === f.status))
    .filter((r) => !f.bucket || (r.outstanding > 0 && String(r.bucket) === f.bucket))
    .filter((r) => !q || r.number.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q) || r.customerCode.toLowerCase().includes(q));
}

export async function loadPromises(ctx: Ctx, where: { invoiceId?: string; customerId?: string } = {}, asOf = ctx.today) {
  const promises = await db.paymentPromise.findMany({ where: { orgId: ctx.orgId, ...where }, orderBy: { promisedDate: "desc" } });
  const invIds = [...new Set(promises.map((p) => p.invoiceId))];
  const payments = await db.payment.findMany({ where: { orgId: ctx.orgId, invoiceId: { in: invIds }, paymentDate: { lte: dateFromISO(asOf) } } });
  return promises.map((p) => ({ ...p, ...promiseStatus(p, payments.filter((x) => x.invoiceId === p.invoiceId), asOf) }));
}

export function sumBy<T>(xs: T[], f: (x: T) => number): number {
  return Math.round(xs.reduce((s, x) => s + f(x), 0) * 100) / 100;
}
