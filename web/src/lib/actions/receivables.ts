"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { loadInvoices } from "@/lib/data/receivables";
import { fmtDate, isoOf } from "@/lib/dates";
import { CHANNELS } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";
import { dateField, money, oneOf, req, run, s, UserError, type ActionState } from "./run";

type U = Awaited<ReturnType<typeof authorize>>;

async function invoiceRow(user: U, id: string) {
  const [row] = await loadInvoices(user, { ids: [id] });
  if (!row) throw new UserError("Invoice not found.");
  return row;
}

function done(id: string) {
  revalidatePath(`/receivables/${id}`);
  revalidatePath("/receivables");
}

export async function recordPayment(invoiceId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("payments:record");
    const inv = await invoiceRow(user, invoiceId);
    const amount = money(fd, "amount", "Amount");
    const date = dateField(fd, "paymentDate");
    if (!date) throw new UserError("Payment date is required.");
    if (isoOf(date)! > user.today) throw new UserError("Payment date cannot be in the future.");
    if (amount > inv.outstanding + 0.5) throw new UserError(`Amount exceeds the outstanding balance (${fmtINR(inv.outstanding, true)}). Record the excess as an unapplied payment via import instead.`);
    const reference = req(fd, "reference", "Reference (UTR / cheque no.)");
    await db.payment.create({ data: { orgId: user.orgId, customerId: inv.customerId, invoiceId: inv.id, amount, paymentDate: date, reference, mode: s(fd, "mode") ?? "bank_transfer", createdById: user.id } });
    await logEvent(user, { entityType: "invoice", entityId: inv.id, customerId: inv.customerId, kind: "payment", message: `Payment of ${fmtINR(amount, true)} recorded (ref ${reference}, dated ${fmtDate(date)}).` });
    done(inv.id);
    return "Payment recorded.";
  });
}

export async function addCredit(invoiceId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("payments:record");
    const inv = await invoiceRow(user, invoiceId);
    const amount = money(fd, "amount", "Amount");
    if (amount > inv.outstanding + 0.5) throw new UserError("Credit exceeds the outstanding balance.");
    const date = dateField(fd, "date") ?? new Date(`${user.today}T00:00:00.000Z`);
    const type = s(fd, "type") === "adjustment" ? "adjustment" : "credit_note";
    const reason = req(fd, "reason", "Reason");
    await db.creditAdjustment.create({ data: { orgId: user.orgId, invoiceId: inv.id, amount, type, reference: s(fd, "reference") ?? "", date, reason, createdById: user.id } });
    await logEvent(user, { entityType: "invoice", entityId: inv.id, customerId: inv.customerId, kind: "credit", message: `${type === "credit_note" ? "Credit note" : "Adjustment"} of ${fmtINR(amount, true)} recorded: ${reason}` });
    done(inv.id);
    return "Credit recorded.";
  });
}

export async function recordPromise(invoiceId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("receivables:edit");
    const inv = await invoiceRow(user, invoiceId);
    if (inv.outstanding <= 0) throw new UserError("This invoice has no outstanding balance.");
    const amount = money(fd, "amount", "Promised amount");
    if (amount > inv.outstanding + 0.5) throw new UserError(`Promised amount exceeds the outstanding balance (${fmtINR(inv.outstanding, true)}).`);
    const promisedDate = dateField(fd, "promisedDate");
    if (!promisedDate) throw new UserError("Promised date is required.");
    if (isoOf(promisedDate)! < user.today) throw new UserError("Promised date cannot be in the past.");
    const contactName = req(fd, "contactName", "Contact who made the promise");
    const ownerId = s(fd, "ownerId") ?? inv.ownerId;
    if (ownerId && !(await db.user.findFirst({ where: { id: ownerId, orgId: user.orgId } }))) throw new UserError("Invalid owner.");
    await db.paymentPromise.create({
      data: { orgId: user.orgId, invoiceId: inv.id, customerId: inv.customerId, amount, promisedDate, contactName, recordedAt: new Date(`${user.today}T00:00:00.000Z`), notes: s(fd, "notes") ?? "", ownerId, createdById: user.id },
    });
    await logEvent(user, { entityType: "invoice", entityId: inv.id, customerId: inv.customerId, kind: "promise", message: `Payment promise recorded: ${fmtINR(amount, true)} by ${fmtDate(promisedDate)} (from ${contactName}).` });
    done(inv.id);
    return "Promise recorded.";
  });
}

export async function cancelPromise(promiseId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("receivables:edit");
    const p = await db.paymentPromise.findFirst({ where: { id: promiseId, orgId: user.orgId } });
    if (!p) throw new UserError("Promise not found.");
    if (p.status === "cancelled") throw new UserError("Already cancelled.");
    const reason = req(fd, "reason", "Reason");
    await db.paymentPromise.update({ where: { id: p.id }, data: { status: "cancelled", notes: `${p.notes}${p.notes ? "\n" : ""}Cancelled: ${reason}` } });
    await logEvent(user, { entityType: "invoice", entityId: p.invoiceId, customerId: p.customerId, kind: "promise", message: `Promise of ${fmtINR(p.amount, true)} due ${fmtDate(p.promisedDate)} cancelled: ${reason}` });
    done(p.invoiceId);
    return "Promise cancelled.";
  });
}

export async function logCollection(invoiceId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("receivables:edit");
    const inv = await invoiceRow(user, invoiceId);
    const channel = oneOf(s(fd, "channel"), CHANNELS, "channel");
    const summary = req(fd, "summary", "Summary");
    const response = s(fd, "customerResponse") ?? "";
    const nextFollowUpDate = dateField(fd, "nextFollowUpDate");
    if (nextFollowUpDate && isoOf(nextFollowUpDate)! < user.today) throw new UserError("Next follow-up date cannot be in the past.");
    await db.collectionActivity.create({
      data: { orgId: user.orgId, customerId: inv.customerId, invoiceId: inv.id, occurredAt: new Date(), channel, summary, customerResponse: response, nextStep: s(fd, "nextStep") ?? "", nextFollowUpDate, userId: user.id },
    });
    await db.invoice.update({ where: { id: inv.id }, data: { lastFollowUpDate: new Date(`${user.today}T00:00:00.000Z`), ...(nextFollowUpDate ? { nextFollowUpDate } : {}) } });
    await logEvent(user, { entityType: "invoice", entityId: inv.id, customerId: inv.customerId, kind: "collection", message: `${channel[0].toUpperCase() + channel.slice(1)}: ${summary}${response ? ` Response: ${response}` : ""}` });
    done(inv.id);
    return "Activity logged.";
  });
}

export async function updateInvoiceControl(invoiceId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("receivables:edit");
    const inv = await invoiceRow(user, invoiceId);
    const ownerId = s(fd, "ownerId");
    if (ownerId && !(await db.user.findFirst({ where: { id: ownerId, orgId: user.orgId } }))) throw new UserError("Invalid owner.");
    const nextFollowUpDate = dateField(fd, "nextFollowUpDate");
    const onHold = fd.get("onHold") === "on";
    const holdReason = s(fd, "holdReason");
    if (onHold !== inv.onHold && !can(user, "payments:record")) throw new UserError("Only a Finance Manager or Admin can place or release a collection hold.");
    if (onHold && !holdReason) throw new UserError("A hold reason is required.");
    await db.invoice.update({ where: { id: inv.id }, data: { ownerId, nextFollowUpDate, onHold, holdReason: onHold ? holdReason : null } });
    const changes = [
      ownerId !== inv.ownerId && "collection owner",
      isoOf(nextFollowUpDate) !== isoOf(inv.nextFollowUpDate) && `next follow-up → ${fmtDate(nextFollowUpDate)}`,
      onHold !== inv.onHold && (onHold ? `placed on hold (${holdReason})` : "hold released"),
    ].filter(Boolean);
    if (changes.length) await logEvent(user, { entityType: "invoice", entityId: inv.id, customerId: inv.customerId, kind: "updated", message: `Updated: ${changes.join(", ")}.` });
    done(inv.id);
    return "Invoice updated.";
  });
}
