"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { nextNumber } from "@/lib/data/numbering";
import { fmtDate, isoOf } from "@/lib/dates";
import { DISPATCH_STATUSES, ORDER_STATUSES, QUOTE_STATUSES, labelOf } from "@/lib/domain/constants";
import { dateField, money, oneOf, req, run, s, UserError, type ActionState } from "./run";

async function customerOf(orgId: string, id: string | null) {
  if (!id) throw new UserError("Customer is required.");
  const c = await db.customer.findFirst({ where: { id, orgId } });
  if (!c) throw new UserError("Customer not found.");
  return c;
}

async function ownerOf(orgId: string, id: string | null) {
  if (id && !(await db.user.findFirst({ where: { id, orgId, role: { not: "customer_portal" } } }))) throw new UserError("Invalid owner.");
  return id;
}

// ---------- Quotations ----------

export async function saveQuotation(id: string | null, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("quotes:edit");
    const existing = id ? await db.quotation.findFirst({ where: { id, orgId: user.orgId } }) : null;
    if (id && !existing) throw new UserError("Quotation not found.");
    const customer = await customerOf(user.orgId, s(fd, "customerId"));
    const quoteDate = dateField(fd, "quoteDate");
    if (!quoteDate) throw new UserError("Quotation date is required.");
    const validUntil = dateField(fd, "validUntil");
    if (validUntil && validUntil < quoteDate) throw new UserError("Valid-until date must be on or after the quotation date.");
    const status = oneOf(s(fd, "status") ?? "draft", QUOTE_STATUSES, "status");
    const lostReason = s(fd, "lostReason");
    if (status === "rejected" && !lostReason) throw new UserError("Record why the opportunity was lost.");
    const number = s(fd, "number") ?? existing?.number ?? (await nextNumber(user.orgId, "quotation", user.today));
    if (await db.quotation.findFirst({ where: { orgId: user.orgId, number, ...(id ? { id: { not: id } } : {}) } })) throw new UserError(`Quotation number ${number} already exists.`);
    const data = {
      number, customerId: customer.id, quoteDate, validUntil, amount: money(fd, "amount", "Amount"), status,
      ownerId: await ownerOf(user.orgId, s(fd, "ownerId")),
      lastContactDate: dateField(fd, "lastContactDate"), nextFollowUpDate: dateField(fd, "nextFollowUpDate"),
      lostReason: status === "rejected" || status === "expired" ? lostReason : null,
      feedback: s(fd, "feedback") ?? "", notes: s(fd, "notes") ?? "", businessUnitId: customer.businessUnitId,
    };
    if (existing) {
      await db.quotation.update({ where: { id: existing.id }, data });
      const msg = existing.status !== status ? `Status changed from ${labelOf(QUOTE_STATUSES, existing.status)} to ${labelOf(QUOTE_STATUSES, status)}.` : "Quotation updated.";
      await logEvent(user, { entityType: "quotation", entityId: existing.id, customerId: customer.id, kind: existing.status !== status ? "status_change" : "updated", message: `${number}: ${msg}${data.feedback && data.feedback !== existing.feedback ? ` Feedback: ${data.feedback}` : ""}` });
      revalidatePath(`/quotations/${existing.id}`);
      return "Quotation saved.";
    }
    const q = await db.quotation.create({ data: { ...data, orgId: user.orgId } });
    await logEvent(user, { entityType: "quotation", entityId: q.id, customerId: customer.id, kind: "created", message: `Quotation ${number} created (recorded in MNT Flow; not sent externally).` });
    redirect(`/quotations/${q.id}`);
  });
}

export async function convertQuotation(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("orders:edit");
    const q = await db.quotation.findFirst({ where: { id, orgId: user.orgId } });
    if (!q) throw new UserError("Quotation not found.");
    if (q.status !== "accepted") throw new UserError("Only accepted quotations can be converted to a sales order.");
    const linked = await db.salesOrder.findFirst({ where: { orgId: user.orgId, quotationId: q.id } });
    if (linked) throw new UserError(`Already linked to order ${linked.number}.`);
    const number = await nextNumber(user.orgId, "order", user.today);
    const o = await db.salesOrder.create({
      data: {
        orgId: user.orgId, number, customerId: q.customerId, customerPoNumber: s(fd, "customerPoNumber") ?? "", orderDate: new Date(`${user.today}T00:00:00.000Z`),
        value: q.amount, expectedDeliveryDate: dateField(fd, "expectedDeliveryDate"), ownerId: q.ownerId, status: "received", quotationId: q.id, businessUnitId: q.businessUnitId,
      },
    });
    await logEvent(user, { entityType: "order", entityId: o.id, customerId: q.customerId, kind: "created", message: `Order ${number} created from accepted quotation ${q.number}.` });
    await logEvent(user, { entityType: "quotation", entityId: q.id, customerId: q.customerId, kind: "updated", message: `Linked to sales order ${number}.` });
    redirect(`/orders/${o.id}`);
  });
}

// ---------- Orders ----------

export async function saveOrder(id: string | null, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("orders:edit");
    const existing = id ? await db.salesOrder.findFirst({ where: { id, orgId: user.orgId } }) : null;
    if (id && !existing) throw new UserError("Order not found.");
    const customer = await customerOf(user.orgId, s(fd, "customerId") ?? existing?.customerId ?? null);
    const orderDate = dateField(fd, "orderDate");
    if (!orderDate) throw new UserError("Order date is required.");
    const status = oneOf(s(fd, "status") ?? "received", ORDER_STATUSES, "status");
    const expected = dateField(fd, "expectedDeliveryDate");
    const delayReason = s(fd, "delayReason");
    if (existing && expected && existing.expectedDeliveryDate && isoOf(expected)! > isoOf(existing.expectedDeliveryDate)! && !delayReason) {
      throw new UserError("Moving the delivery commitment later requires a delay reason.");
    }
    const number = s(fd, "number") ?? existing?.number ?? (await nextNumber(user.orgId, "order", user.today));
    if (await db.salesOrder.findFirst({ where: { orgId: user.orgId, number, ...(id ? { id: { not: id } } : {}) } })) throw new UserError(`Order number ${number} already exists.`);
    const data = {
      number, customerId: customer.id, customerPoNumber: s(fd, "customerPoNumber") ?? "", orderDate, value: money(fd, "value", "Order value"), expectedDeliveryDate: expected,
      ownerId: await ownerOf(user.orgId, s(fd, "ownerId")), status, delayReason, notes: s(fd, "notes") ?? "", businessUnitId: customer.businessUnitId,
    };
    if (existing) {
      await db.salesOrder.update({ where: { id: existing.id }, data });
      const changes = [
        existing.status !== status && `status ${labelOf(ORDER_STATUSES, existing.status)} → ${labelOf(ORDER_STATUSES, status)}`,
        isoOf(existing.expectedDeliveryDate) !== isoOf(expected) && `delivery commitment ${fmtDate(existing.expectedDeliveryDate)} → ${fmtDate(expected)}${delayReason ? ` (reason: ${delayReason})` : ""}`,
      ].filter(Boolean);
      await logEvent(user, { entityType: "order", entityId: existing.id, customerId: customer.id, kind: changes.length ? "status_change" : "updated", message: `${number}: ${changes.length ? changes.join("; ") : "order updated"}.` });
      revalidatePath(`/orders/${existing.id}`);
      return "Order saved.";
    }
    const o = await db.salesOrder.create({ data: { ...data, orgId: user.orgId } });
    await logEvent(user, { entityType: "order", entityId: o.id, customerId: customer.id, kind: "created", message: `Order ${number} recorded.` });
    redirect(`/orders/${o.id}`);
  });
}

export async function addOrderUpdate(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("orders:edit");
    const o = await db.salesOrder.findFirst({ where: { id, orgId: user.orgId } });
    if (!o) throw new UserError("Order not found.");
    const text = req(fd, "comment", "Update");
    const shared = fd.get("shared") === "on";
    await logEvent(user, { entityType: "order", entityId: o.id, customerId: o.customerId, kind: "comment", visibility: shared ? "customer" : "internal", message: text });
    revalidatePath(`/orders/${o.id}`);
    return "Update recorded.";
  });
}

export async function linkInvoiceToOrder(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("orders:edit");
    const o = await db.salesOrder.findFirst({ where: { id, orgId: user.orgId } });
    if (!o) throw new UserError("Order not found.");
    const inv = await db.invoice.findFirst({ where: { id: s(fd, "invoiceId") ?? "", orgId: user.orgId, customerId: o.customerId } });
    if (!inv) throw new UserError("Choose an invoice of the same customer.");
    await db.invoice.update({ where: { id: inv.id }, data: { orderId: o.id } });
    await logEvent(user, { entityType: "order", entityId: o.id, customerId: o.customerId, kind: "updated", message: `Invoice ${inv.number} linked to order ${o.number}.` });
    revalidatePath(`/orders/${o.id}`);
    return "Invoice linked.";
  });
}

// ---------- Dispatch ----------

export async function addDispatch(orderId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("dispatch:edit");
    const o = await db.salesOrder.findFirst({ where: { id: orderId, orgId: user.orgId } });
    if (!o) throw new UserError("Order not found.");
    const committedDate = dateField(fd, "committedDate");
    if (!committedDate) throw new UserError("Committed date is required.");
    const challanNumber = req(fd, "challanNumber", "Challan number");
    await db.dispatch.create({ data: { orgId: user.orgId, orderId: o.id, customerId: o.customerId, challanNumber, committedDate, status: "planned", transporter: s(fd, "transporter") ?? "", ownerId: user.id } });
    await logEvent(user, { entityType: "order", entityId: o.id, customerId: o.customerId, kind: "updated", message: `Dispatch ${challanNumber} planned for ${fmtDate(committedDate)}.` });
    revalidatePath(`/orders/${o.id}`);
    revalidatePath("/dispatch");
    return "Dispatch planned.";
  });
}

export async function updateDispatch(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("dispatch:edit");
    const d = await db.dispatch.findFirst({ where: { id, orgId: user.orgId } });
    if (!d) throw new UserError("Dispatch not found.");
    const status = oneOf(s(fd, "status") ?? d.status, DISPATCH_STATUSES, "status");
    const date = dateField(fd, "date") ?? new Date(`${user.today}T00:00:00.000Z`);
    const podReceived = fd.get("podReceived") === "on";
    await db.dispatch.update({
      where: { id: d.id },
      data: {
        status,
        dispatchDate: status !== "planned" ? d.dispatchDate ?? date : null,
        deliveredDate: status === "delivered" ? d.deliveredDate ?? date : null,
        podReceived: status === "delivered" ? podReceived : false,
      },
    });
    await logEvent(user, { entityType: "order", entityId: d.orderId, customerId: d.customerId, kind: "status_change", message: `Dispatch ${d.challanNumber}: ${labelOf(DISPATCH_STATUSES, status)}${status === "delivered" ? (podReceived ? ", proof of delivery confirmed by user" : ", proof of delivery pending") : ""}.` });
    revalidatePath("/dispatch");
    revalidatePath(`/orders/${d.orderId}`);
    return "Dispatch updated.";
  });
}
