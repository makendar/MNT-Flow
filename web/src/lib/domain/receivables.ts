import { daysBetween, isoOf } from "../dates";
import { fmtINR, round2 } from "../format";
import type { InvoiceStatus } from "./constants";

/*
 * Receivables rules (deterministic, documented in README):
 *  - outstanding = total − Σ applied payments − Σ credit notes/adjustments, clamped at 0 (credit balance shown as an exception).
 *  - overdueDays = max(0, reportingDate − dueDate) in calendar days; null when due date is missing.
 *  - status precedence: paid → on_hold → disputed (open payment-blocking issue) → overdue → partially_paid → not_due.
 */

export type InvoiceInput = {
  total: number;
  dueDate: Date | null;
  currency: string;
  onHold: boolean;
  payments: { amount: number; paymentDate: Date }[];
  credits: { amount: number }[];
  openBlockingIssues: number;
};

export type InvoiceCalc = {
  paid: number;
  credited: number;
  outstanding: number;
  creditBalance: number;
  overdueDays: number | null;
  status: InvoiceStatus;
  bucket: number;
  exceptions: string[];
};

export function bucketLabels(boundaries: number[]): string[] {
  const labels = ["Not yet due"];
  let lo = 1;
  for (const b of boundaries) {
    labels.push(`${lo}–${b} days`);
    lo = b + 1;
  }
  labels.push(`>${boundaries[boundaries.length - 1]} days`);
  return labels;
}

export function bucketIndex(overdueDays: number | null, boundaries: number[]): number {
  if (!overdueDays || overdueDays <= 0) return 0;
  const i = boundaries.findIndex((b) => overdueDays <= b);
  return i === -1 ? boundaries.length + 1 : i + 1;
}

export function computeInvoice(inv: InvoiceInput, asOf: string, boundaries: number[]): InvoiceCalc {
  const paid = round2(inv.payments.reduce((s, p) => s + p.amount, 0));
  const credited = round2(inv.credits.reduce((s, c) => s + c.amount, 0));
  const raw = round2(inv.total - paid - credited);
  const outstanding = Math.max(0, raw);
  const creditBalance = raw < 0 ? -raw : 0;
  const overdueDays = inv.dueDate ? Math.max(0, daysBetween(inv.dueDate, asOf)) : null;
  const exceptions: string[] = [];
  if (!inv.dueDate) exceptions.push("Missing due date");
  if (inv.currency !== "INR") exceptions.push(`Currency ${inv.currency} (not INR)`);
  if (creditBalance > 0) exceptions.push("Credit balance (overpaid)");

  let status: InvoiceStatus;
  if (outstanding <= 0) status = "paid";
  else if (inv.onHold) status = "on_hold";
  else if (inv.openBlockingIssues > 0) status = "disputed";
  else if (overdueDays && overdueDays > 0) status = "overdue";
  else if (paid + credited > 0) status = "partially_paid";
  else status = "not_due";

  const bucket = outstanding > 0 ? bucketIndex(overdueDays, boundaries) : 0;
  return { paid, credited, outstanding, creditBalance, overdueDays, status, bucket, exceptions };
}

export type PromiseInput = { status: string; amount: number; promisedDate: Date; recordedAt: Date };

/**
 * Promise status is derived from payments on the linked invoice made between the recording date and the promised date.
 * Stored status is only "open" or "cancelled". A promise due today is still open.
 */
export function promiseStatus(p: PromiseInput, invoicePayments: { amount: number; paymentDate: Date }[], asOf: string) {
  const from = isoOf(p.recordedAt)!;
  const to = isoOf(p.promisedDate)!;
  const paidByDate = round2(
    invoicePayments.filter((x) => isoOf(x.paymentDate)! >= from && isoOf(x.paymentDate)! <= to).reduce((s, x) => s + x.amount, 0),
  );
  let status: string;
  if (p.status === "cancelled") status = "cancelled";
  else if (paidByDate >= p.amount - 0.5) status = "fulfilled";
  else if (to >= asOf) status = "open";
  else if (paidByDate > 0) status = "partially_fulfilled";
  else status = "missed";
  return { status, paidByDate };
}

export type PrioritySignals = {
  amount?: number;
  overdueDays?: number | null;
  missedPromise?: boolean;
  unresolvedIssue?: string | null;
  issueAgeDays?: number;
  missingDocument?: boolean;
  commitmentDaysLeft?: number | null;
  followUpLateDays?: number;
};

export type PriorityThresholds = {
  highAmount: number;
  mediumAmount: number;
  highOverdueDays: number;
  mediumOverdueDays: number;
  staleIssueDays: number;
  commitmentWindowDays: number;
  highScore: number;
  mediumScore: number;
};

/** Rule-based, explainable priority. Not a statistical or AI prediction. */
export function scorePriority(s: PrioritySignals, t: PriorityThresholds, subject: string, isInvoice: boolean) {
  let score = 0;
  const why: string[] = [];
  const od = s.overdueDays ?? 0;
  if (od > 0) {
    score += od >= t.highOverdueDays ? 30 : od >= t.mediumOverdueDays ? 15 : 5;
    why.push(isInvoice ? `is ${od} days overdue` : `is linked to an invoice ${od} days overdue`);
  }
  if (s.amount !== undefined && s.amount >= t.mediumAmount) {
    score += s.amount >= t.highAmount ? 25 : 12;
    why.push(isInvoice ? `has an outstanding balance of ${fmtINR(s.amount)}` : `involves ${fmtINR(s.amount)}`);
  }
  if (s.missedPromise) {
    score += 25;
    why.push("has a missed payment promise");
  }
  if (s.unresolvedIssue) {
    score += 15;
    why.push(`has an unresolved ${s.unresolvedIssue.toLowerCase()} issue`);
  }
  if (s.issueAgeDays !== undefined && s.issueAgeDays >= t.staleIssueDays) {
    score += 15;
    why.push(`has been open for ${s.issueAgeDays} days`);
  }
  if (s.missingDocument) {
    score += 10;
    why.push("is waiting on a missing document");
  }
  if (s.commitmentDaysLeft !== undefined && s.commitmentDaysLeft !== null) {
    if (s.commitmentDaysLeft < 0) {
      score += 25;
      why.push(`is ${-s.commitmentDaysLeft} days past its committed date`);
    } else if (s.commitmentDaysLeft <= t.commitmentWindowDays) {
      score += 15;
      why.push(s.commitmentDaysLeft === 0 ? "is due today" : `is due within ${s.commitmentDaysLeft} days`);
    }
  }
  if (s.followUpLateDays && s.followUpLateDays > 0) {
    score += 10;
    why.push(`has a follow-up ${s.followUpLateDays} days late`);
  }
  const priority = score >= t.highScore ? "high" : score >= t.mediumScore ? "medium" : "low";
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);
  const reason = why.length
    ? `${label} priority because ${subject} ${joinAnd(why)}.`
    : `${label} priority: no escalation signals beyond the scheduled follow-up.`;
  return { score, priority, reason };
}

function joinAnd(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}
