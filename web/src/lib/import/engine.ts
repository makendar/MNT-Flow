import { db } from "@/lib/db";
import { dateFromISO, parseFlexibleDate } from "@/lib/dates";
import { ORDER_STATUSES, QUOTE_STATUSES } from "@/lib/domain/constants";
import { round2 } from "@/lib/format";
import { loadInvoices } from "@/lib/data/receivables";
import type { SessionUser } from "@/lib/auth/session";
import { FIELDS, type EntityType } from "./fields";

export type RowResult = { row: number; action: "create" | "update" | "skip" | "reject"; key: string; errors: string[]; warnings: string[]; data: Record<string, unknown> };
export type ImportSummary = { create: number; update: number; skip: number; reject: number; amount: number; rows: number };
export const MAX_ROWS = 5000;

/** Parses "₹1,25,000.50", "Rs. 1,000", "INR 500". Returns null when not a valid non-negative number. */
export function parseMoney(raw: string): number | null {
  const s = raw.replace(/(₹|rs\.?|inr)/gi, "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return round2(Number(s));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates mapped rows against the organization's data. Never writes. Same function is used for the dry run
 * and again (server-side) at commit time, so client-side values are never trusted.
 */
export async function validateImport(user: SessionUser, entity: EntityType, rows: Record<string, string>[], updateExisting: boolean): Promise<{ results: RowResult[]; summary: ImportSummary }> {
  if (rows.length > MAX_ROWS) throw new Error(`Files are limited to ${MAX_ROWS} rows per import.`);
  const org = user.orgId;
  const fields = FIELDS[entity];
  const [customers, users] = await Promise.all([
    db.customer.findMany({ where: { orgId: org }, select: { id: true, code: true, paymentTermsDays: true, businessUnitId: true } }),
    db.user.findMany({ where: { orgId: org, role: { not: "customer_portal" } }, select: { id: true, email: true } }),
  ]);
  const custByCode = new Map(customers.map((c) => [c.code.toUpperCase(), c]));
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  const seen = new Map<string, number>();

  // Entity-specific lookups
  const existingNumbers = new Map<string, { id: string; total?: number }>();
  if (entity === "quotations") (await db.quotation.findMany({ where: { orgId: org }, select: { id: true, number: true } })).forEach((x) => existingNumbers.set(x.number.toUpperCase(), { id: x.id }));
  if (entity === "orders") (await db.salesOrder.findMany({ where: { orgId: org }, select: { id: true, number: true } })).forEach((x) => existingNumbers.set(x.number.toUpperCase(), { id: x.id }));
  if (entity === "invoices") (await db.invoice.findMany({ where: { orgId: org }, select: { id: true, number: true, total: true } })).forEach((x) => existingNumbers.set(x.number.toUpperCase(), { id: x.id, total: x.total }));
  const orders = entity === "invoices" ? new Map((await db.salesOrder.findMany({ where: { orgId: org }, select: { id: true, number: true, customerId: true } })).map((o) => [o.number.toUpperCase(), o])) : new Map();
  const quotes = entity === "orders" ? new Map((await db.quotation.findMany({ where: { orgId: org }, select: { id: true, number: true } })).map((o) => [o.number.toUpperCase(), o.id])) : new Map();
  const invRows = entity === "payments" || entity === "promises" ? await loadInvoices(user) : [];
  const invByNo = new Map(invRows.map((i) => [i.number.toUpperCase(), i]));
  const payments = entity === "payments" ? await db.payment.findMany({ where: { orgId: org }, select: { customerId: true, invoiceId: true, reference: true, amount: true, paymentDate: true } }) : [];
  const promises = entity === "promises" ? await db.paymentPromise.findMany({ where: { orgId: org }, select: { invoiceId: true, amount: true, promisedDate: true } }) : [];
  const pendingByInvoice = new Map<string, number>();

  const results: RowResult[] = rows.map((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const v: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (raw[f.key] ?? "").toString().trim();
      if (!val) {
        if (f.required) errors.push(`${f.label} is required`);
        v[f.key] = null;
        continue;
      }
      if (f.type === "date") {
        const iso = parseFlexibleDate(val);
        if (!iso) errors.push(`${f.label}: "${val}" is not a recognised date (use DD-MM-YYYY or YYYY-MM-DD)`);
        v[f.key] = iso;
      } else if (f.type === "money") {
        const n = parseMoney(val);
        if (n === null) errors.push(`${f.label}: "${val}" is not a valid amount`);
        else if (n <= 0) errors.push(`${f.label} must be greater than zero`);
        v[f.key] = n;
      } else if (f.type === "int") {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 0 || n > 365) errors.push(`${f.label}: "${val}" must be a whole number 0–365`);
        v[f.key] = n;
      } else if (f.type === "email") {
        if (!EMAIL.test(val)) errors.push(`${f.label}: "${val}" is not a valid email`);
        v[f.key] = val.toLowerCase();
      } else v[f.key] = val.slice(0, 500);
    }
    const ownerEmail = v.owner_email as string | null;
    if (ownerEmail) {
      const uid = userByEmail.get(ownerEmail);
      if (!uid) warnings.push(`Owner ${ownerEmail} is not a team member; left unassigned`);
      v.ownerId = uid ?? null;
    }
    let key = "";
    let action: RowResult["action"] = "create";
    const cust = v.customer_code ? custByCode.get(String(v.customer_code).toUpperCase()) : undefined;
    if (v.customer_code && !cust) errors.push(`Customer code ${v.customer_code} does not exist (import customers first)`);
    if (cust) { v.customerId = cust.id; v.businessUnitId = cust.businessUnitId; }

    switch (entity) {
      case "customers": {
        key = String(v.code ?? "").toUpperCase();
        if (v.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/i.test(String(v.gstin))) warnings.push("GSTIN format looks unusual; stored as provided");
        if (custByCode.has(key)) action = updateExisting ? "update" : "skip";
        break;
      }
      case "quotations": {
        key = String(v.number ?? "").toUpperCase();
        const st = v.status ? String(v.status).toLowerCase().replace(/\s+/g, "_") : "sent";
        if (!QUOTE_STATUSES.some((s) => s.value === st)) errors.push(`Unknown status "${v.status}"`);
        v.status = st;
        if (v.valid_until && v.quote_date && String(v.valid_until) < String(v.quote_date)) errors.push("Valid until is before quotation date");
        if (existingNumbers.has(key)) action = "skip";
        break;
      }
      case "orders": {
        key = String(v.number ?? "").toUpperCase();
        const st = v.status ? String(v.status).toLowerCase().replace(/\s+/g, "_") : "received";
        if (!ORDER_STATUSES.some((s) => s.value === st)) errors.push(`Unknown status "${v.status}"`);
        v.status = st;
        if (v.quotation_number) {
          v.quotationId = quotes.get(String(v.quotation_number).toUpperCase()) ?? null;
          if (!v.quotationId) warnings.push(`Quotation ${v.quotation_number} not found; order imported without link`);
        }
        if (existingNumbers.has(key)) action = "skip";
        break;
      }
      case "invoices": {
        key = String(v.number ?? "").toUpperCase();
        const cur = v.currency ? String(v.currency).toUpperCase() : "INR";
        if (cur !== "INR") errors.push(`Currency ${cur} is not supported (INR only); amounts are never converted`);
        v.currency = "INR";
        if (!v.due_date && !errors.length) warnings.push("No due date: shown as 'Not yet due' and listed under Data exceptions until corrected (no due date is assumed)");
        if (v.due_date && v.invoice_date && String(v.due_date) < String(v.invoice_date)) errors.push("Due date is before invoice date");
        if (v.invoice_date && String(v.invoice_date) > user.today) errors.push("Invoice date is in the future");
        if (v.order_number) {
          const o = orders.get(String(v.order_number).toUpperCase());
          if (!o) warnings.push(`Order ${v.order_number} not found; invoice imported without link`);
          else if (cust && o.customerId !== cust.id) errors.push(`Order ${v.order_number} belongs to a different customer`);
          v.orderId = o?.id ?? null;
        }
        const ex = existingNumbers.get(key);
        if (ex) {
          if (Math.abs((ex.total ?? 0) - Number(v.total ?? 0)) > 0.005) errors.push(`Invoice ${v.number} already exists with a different total; financial amounts are never overwritten`);
          else action = "skip";
        }
        break;
      }
      case "payments": {
        if (v.payment_date && String(v.payment_date) > user.today) errors.push("Payment date is in the future");
        if (v.invoice_number) {
          const inv = invByNo.get(String(v.invoice_number).toUpperCase());
          if (!inv) errors.push(`Invoice ${v.invoice_number} not found`);
          else if (cust && inv.customerId !== cust.id) errors.push(`Invoice ${v.invoice_number} belongs to a different customer`);
          else {
            const pending = pendingByInvoice.get(inv.id) ?? 0;
            if (Number(v.amount ?? 0) + pending > inv.outstanding + 0.5) errors.push(`Amount exceeds outstanding balance of invoice ${inv.number}; leave invoice_number blank to record it as unapplied`);
            v.invoiceId = inv.id;
          }
        } else if (!errors.length) warnings.push("No invoice: recorded as an unapplied payment (exception)");
        key = `${v.customer_code}|${v.reference || `${v.invoice_number}|${v.payment_date}|${v.amount}`}`.toUpperCase();
        const dup = payments.some((p) => p.customerId === v.customerId && ((v.reference && p.reference === v.reference) || (p.invoiceId === (v.invoiceId ?? null) && Math.abs(p.amount - Number(v.amount)) < 0.01 && p.paymentDate.toISOString().slice(0, 10) === v.payment_date)));
        if (dup) action = "skip";
        if (!errors.length && action === "create" && v.invoiceId) pendingByInvoice.set(String(v.invoiceId), (pendingByInvoice.get(String(v.invoiceId)) ?? 0) + Number(v.amount));
        break;
      }
      case "promises": {
        const inv = v.invoice_number ? invByNo.get(String(v.invoice_number).toUpperCase()) : undefined;
        if (v.invoice_number && !inv) errors.push(`Invoice ${v.invoice_number} not found`);
        if (inv) {
          v.invoiceId = inv.id;
          v.customerId = inv.customerId;
          if (Number(v.amount ?? 0) > inv.outstanding + 0.5) errors.push(`Promised amount exceeds the outstanding balance of ${inv.number}`);
          v.ownerId = v.ownerId ?? inv.ownerId;
        }
        key = `${v.invoice_number}|${v.promised_date}|${v.amount}`.toUpperCase();
        if (inv && promises.some((p) => p.invoiceId === inv.id && Math.abs(p.amount - Number(v.amount)) < 0.01 && p.promisedDate.toISOString().slice(0, 10) === v.promised_date)) action = "skip";
        break;
      }
    }
    if (key && !errors.length) {
      const prev = seen.get(key);
      if (prev !== undefined) errors.push(`Duplicate of row ${prev} in this file`);
      else seen.set(key, idx + 2);
    }
    if (errors.length) action = "reject";
    return { row: idx + 2, action, key, errors, warnings, data: v };
  });

  const amountKey = entity === "invoices" ? "total" : entity === "orders" ? "value" : entity === "customers" ? null : "amount";
  const summary: ImportSummary = {
    rows: rows.length,
    create: results.filter((r) => r.action === "create").length,
    update: results.filter((r) => r.action === "update").length,
    skip: results.filter((r) => r.action === "skip").length,
    reject: results.filter((r) => r.action === "reject").length,
    amount: amountKey ? round2(results.filter((r) => r.action === "create").reduce((s, r) => s + Number(r.data[amountKey] ?? 0), 0)) : 0,
  };
  return { results, summary };
}

export async function orgTotals(orgId: string) {
  const [inv, pay] = await Promise.all([db.invoice.aggregate({ where: { orgId }, _sum: { total: true }, _count: true }), db.payment.aggregate({ where: { orgId }, _sum: { amount: true }, _count: true })]);
  return { invoiceTotal: round2(inv._sum.total ?? 0), invoiceCount: inv._count, paymentTotal: round2(pay._sum.amount ?? 0), paymentCount: pay._count };
}

/** Writes validated rows in a single transaction, tagged with the batch id for rollback. */
export async function commitRows(user: SessionUser, entity: EntityType, batchId: string, results: RowResult[]) {
  const d = (x: unknown) => (x ? dateFromISO(String(x)) : null);
  const org = user.orgId;
  const ops = results.filter((r) => r.action === "create" || r.action === "update").map((r) => {
    const v = r.data;
    switch (entity) {
      case "customers": {
        const data = {
          name: String(v.name), segment: (v.segment as string) ?? "", gstin: (v.gstin as string) ?? null, billingAddress: (v.billing_address as string) ?? "", shippingAddress: (v.shipping_address as string) ?? "",
          city: (v.city as string) ?? "", state: (v.state as string) ?? "", primaryContactName: (v.primary_contact_name as string) ?? "", primaryContactEmail: (v.primary_contact_email as string) ?? "",
          primaryContactPhone: (v.primary_contact_phone as string) ?? "", accountsContactName: (v.accounts_contact_name as string) ?? "", accountsContactEmail: (v.accounts_contact_email as string) ?? "",
          accountsContactPhone: (v.accounts_contact_phone as string) ?? "", ...(v.payment_terms_days !== null ? { paymentTermsDays: Number(v.payment_terms_days) } : {}),
          ...(v.ownerId ? { ownerId: String(v.ownerId) } : {}), tags: (v.tags as string) ?? "",
        };
        return r.action === "update"
          ? db.customer.update({ where: { orgId_code: { orgId: org, code: String(v.code).toUpperCase() } }, data })
          : db.customer.create({ data: { ...data, orgId: org, code: String(v.code).toUpperCase(), importBatchId: batchId } });
      }
      case "quotations":
        return db.quotation.create({ data: { orgId: org, number: String(v.number), customerId: String(v.customerId), quoteDate: d(v.quote_date)!, validUntil: d(v.valid_until), amount: Number(v.amount), status: String(v.status), ownerId: (v.ownerId as string) ?? null, nextFollowUpDate: d(v.next_follow_up_date), notes: (v.notes as string) ?? "", businessUnitId: (v.businessUnitId as string) ?? null, importBatchId: batchId } });
      case "orders":
        return db.salesOrder.create({ data: { orgId: org, number: String(v.number), customerId: String(v.customerId), customerPoNumber: (v.customer_po as string) ?? "", orderDate: d(v.order_date)!, value: Number(v.value), expectedDeliveryDate: d(v.expected_delivery_date), status: String(v.status), ownerId: (v.ownerId as string) ?? null, quotationId: (v.quotationId as string) ?? null, businessUnitId: (v.businessUnitId as string) ?? null, importBatchId: batchId } });
      case "invoices":
        return db.invoice.create({ data: { orgId: org, number: String(v.number), customerId: String(v.customerId), orderId: (v.orderId as string) ?? null, invoiceDate: d(v.invoice_date)!, dueDate: d(v.due_date), total: Number(v.total), currency: "INR", ownerId: (v.ownerId as string) ?? null, businessUnitId: (v.businessUnitId as string) ?? null, importBatchId: batchId } });
      case "payments":
        return db.payment.create({ data: { orgId: org, customerId: String(v.customerId), invoiceId: (v.invoiceId as string) ?? null, amount: Number(v.amount), paymentDate: d(v.payment_date)!, reference: (v.reference as string) ?? "", mode: (v.mode as string) ?? "bank_transfer", importBatchId: batchId, createdById: user.id } });
      case "promises":
        return db.paymentPromise.create({ data: { orgId: org, invoiceId: String(v.invoiceId), customerId: String(v.customerId), amount: Number(v.amount), promisedDate: d(v.promised_date)!, recordedAt: dateFromISO(user.today), contactName: String(v.contact_name), notes: (v.notes as string) ?? "", ownerId: (v.ownerId as string) ?? null, createdById: user.id, importBatchId: batchId } });
    }
  });
  await db.$transaction(ops);
}

/** Compensating rollback: deletes records created by the batch, refusing if other records now depend on them. */
export async function rollbackBatch(orgId: string, batchId: string, entity: EntityType): Promise<number> {
  const where = { orgId, importBatchId: batchId };
  switch (entity) {
    case "customers": {
      const ids = (await db.customer.findMany({ where, select: { id: true } })).map((c) => c.id);
      const deps = await Promise.all([db.invoice.count({ where: { orgId, customerId: { in: ids } } }), db.salesOrder.count({ where: { orgId, customerId: { in: ids } } }), db.quotation.count({ where: { orgId, customerId: { in: ids } } }), db.issue.count({ where: { orgId, customerId: { in: ids } } })]);
      if (deps.some((n) => n > 0)) throw new Error("Customers from this batch now have invoices, orders, quotations or issues. Remove those first.");
      return (await db.customer.deleteMany({ where })).count;
    }
    case "invoices": {
      const ids = (await db.invoice.findMany({ where, select: { id: true } })).map((c) => c.id);
      const deps = await Promise.all([db.payment.count({ where: { orgId, invoiceId: { in: ids } } }), db.paymentPromise.count({ where: { orgId, invoiceId: { in: ids } } }), db.issue.count({ where: { orgId, invoiceId: { in: ids } } }), db.creditAdjustment.count({ where: { orgId, invoiceId: { in: ids } } })]);
      if (deps.some((n) => n > 0)) throw new Error("Invoices from this batch now have payments, promises, credits or issues. Roll those back first.");
      return (await db.invoice.deleteMany({ where })).count;
    }
    case "orders": {
      const ids = (await db.salesOrder.findMany({ where, select: { id: true } })).map((c) => c.id);
      if ((await db.invoice.count({ where: { orgId, orderId: { in: ids } } })) + (await db.dispatch.count({ where: { orgId, orderId: { in: ids } } })) > 0) throw new Error("Orders from this batch have linked invoices or dispatches.");
      return (await db.salesOrder.deleteMany({ where })).count;
    }
    case "quotations":
      return (await db.quotation.deleteMany({ where })).count;
    case "payments":
      return (await db.payment.deleteMany({ where })).count;
    case "promises":
      return (await db.paymentPromise.deleteMany({ where })).count;
  }
}
