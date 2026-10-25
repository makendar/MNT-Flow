// Run with: npm test  (plain Node asserts, no framework)
import assert from "node:assert/strict";
import { dateFromISO, parseFlexibleDate, fmtDate } from "../dates";
import { fmtINR } from "../format";
import { bucketIndex, bucketLabels, computeInvoice, promiseStatus, scorePriority } from "./receivables";
import { buildActionCandidates } from "./actions";
import { DEFAULT_SETTINGS } from "./settings";

const asOf = "2026-10-25";
const B = [30, 60, 90];
const d = dateFromISO;

// Formatting
assert.equal(fmtINR(125000), "₹1,25,000");
assert.equal(fmtDate("2026-09-05"), "05 Sep 2026");

// Dates
assert.equal(parseFlexibleDate("05/09/2026"), "2026-09-05"); // day-first
assert.equal(parseFlexibleDate("5-Sep-2026"), "2026-09-05");
assert.equal(parseFlexibleDate("2026-02-30"), null);
assert.equal(parseFlexibleDate("46000"), "2025-12-09"); // Excel serial

// Ageing buckets
assert.deepEqual(bucketLabels(B), ["Not yet due", "1–30 days", "31–60 days", "61–90 days", ">90 days"]);
assert.equal(bucketIndex(0, B), 0);
assert.equal(bucketIndex(30, B), 1);
assert.equal(bucketIndex(31, B), 2);
assert.equal(bucketIndex(91, B), 4);

// Invoice: 45 days overdue, unpaid, blocked by an issue → disputed
const blocked = computeInvoice({ total: 180000, dueDate: d("2026-09-10"), currency: "INR", onHold: false, payments: [], credits: [], openBlockingIssues: 1 }, asOf, B);
assert.equal(blocked.overdueDays, 45);
assert.equal(blocked.status, "disputed");
assert.equal(blocked.bucket, 2);

// Partial payment + credit note
const partial = computeInvoice({ total: 188000, dueDate: d("2026-09-20"), currency: "INR", onHold: false, payments: [{ amount: 90000, paymentDate: d("2026-10-20") }], credits: [{ amount: 8000 }], openBlockingIssues: 0 }, asOf, B);
assert.equal(partial.outstanding, 90000);
assert.equal(partial.status, "overdue");

// Not yet due, partially paid
const notDue = computeInvoice({ total: 1000, dueDate: d("2026-11-25"), currency: "INR", onHold: false, payments: [{ amount: 400.1, paymentDate: d("2026-10-01") }], credits: [], openBlockingIssues: 0 }, asOf, B);
assert.equal(notDue.outstanding, 599.9);
assert.equal(notDue.status, "partially_paid");
assert.equal(notDue.overdueDays, 0);

// Overpaid → paid with credit balance exception; missing due date flagged
const over = computeInvoice({ total: 100, dueDate: null, currency: "INR", onHold: false, payments: [{ amount: 120, paymentDate: d(asOf) }], credits: [], openBlockingIssues: 0 }, asOf, B);
assert.equal(over.status, "paid");
assert.equal(over.creditBalance, 20);
assert.ok(over.exceptions.includes("Missing due date"));

// Reconciliation: Σ bucket amounts = Σ outstanding
const invs = [blocked, partial, notDue, over];
const total = invs.reduce((s, i) => s + i.outstanding, 0);
const byBucket = [0, 1, 2, 3, 4].map((b) => invs.filter((i) => i.bucket === b).reduce((s, i) => s + i.outstanding, 0));
assert.equal(Math.round(byBucket.reduce((a, b) => a + b, 0) * 100), Math.round(total * 100));

// Promise status
const pay = [{ amount: 50000, paymentDate: d("2026-10-18") }];
assert.equal(promiseStatus({ status: "open", amount: 100000, promisedDate: d("2026-10-20"), recordedAt: d("2026-10-10") }, pay, asOf).status, "partially_fulfilled");
assert.equal(promiseStatus({ status: "open", amount: 50000, promisedDate: d("2026-10-20"), recordedAt: d("2026-10-10") }, pay, asOf).status, "fulfilled");
assert.equal(promiseStatus({ status: "open", amount: 50000, promisedDate: d("2026-10-20"), recordedAt: d("2026-10-19") }, pay, asOf).status, "missed");
assert.equal(promiseStatus({ status: "open", amount: 50000, promisedDate: d(asOf), recordedAt: d("2026-10-19") }, [], asOf).status, "open");
assert.equal(promiseStatus({ status: "cancelled", amount: 1, promisedDate: d("2026-10-01"), recordedAt: d("2026-09-01") }, [], asOf).status, "cancelled");

// Priority reason matches the documented example
const p = scorePriority({ overdueDays: 45, amount: 180000, unresolvedIssue: "delivery-document" }, DEFAULT_SETTINGS.priority, "this invoice", true);
assert.equal(p.priority, "high");
assert.equal(p.reason, "High priority because this invoice is 45 days overdue, has an outstanding balance of ₹1,80,000, and has an unresolved delivery-document issue.");

// Action candidates: overdue invoice with blocking issue + missed promise
const cands = buildActionCandidates(
  {
    invoices: [{ id: "i1", number: "INV-1", customerId: "c1", ownerId: "u1", onHold: false, currency: "INR", nextFollowUpDate: null, outstanding: 180000, overdueDays: 45 }],
    promises: [{ id: "p1", invoiceId: "i1", customerId: "c1", ownerId: "u1", amount: 180000, promisedDate: d("2026-10-20"), contactName: "X", status: "missed" }],
    issues: [{ id: "s1", number: "ISS-1", title: "POD", customerId: "c1", invoiceId: "i1", orderId: null, ownerId: "u2", category: "missing_pod", status: "open", source: "internal", blocksPayment: true, createdAt: d("2026-10-01"), dueDate: null, nextAction: null }],
    quotations: [], orders: [], dispatches: [], tasks: [],
  },
  asOf,
  DEFAULT_SETTINGS,
);
assert.deepEqual(cands.map((c) => c.key).sort(), ["inv-overdue:i1", "issue:s1", "promise-missed:p1"]);
assert.equal(cands.find((c) => c.key === "issue:s1")!.category, "missing_document");
assert.equal(cands.find((c) => c.key === "inv-overdue:i1")!.priority, "high");

console.log("domain self-check: all assertions passed");
