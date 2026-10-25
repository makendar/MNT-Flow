"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { addDays, dateFromISO } from "@/lib/dates";
import { nextNumber } from "@/lib/data/numbering";
import { PORTAL_QUERY_TYPES } from "@/lib/domain/constants";
import { req, run, s, UserError, type ActionState } from "./run";

/** Every portal action re-derives the customer from the session; client-supplied ids are only accepted if they belong to that customer. */
async function portalUser() {
  const u = await getCurrentUser();
  if (!u || u.role !== "customer_portal" || !u.customerId) throw new UserError("Not allowed.");
  return u as typeof u & { customerId: string };
}

export async function raiseQuery(_: ActionState, fd: FormData) {
  return run(async () => {
    const u = await portalUser();
    const category = s(fd, "category");
    if (!PORTAL_QUERY_TYPES.some((t) => t.value === category)) throw new UserError("Choose a query type.");
    const invoiceId = s(fd, "invoiceId");
    const orderId = s(fd, "orderId");
    const inv = invoiceId ? await db.invoice.findFirst({ where: { id: invoiceId, orgId: u.orgId, customerId: u.customerId } }) : null;
    if (invoiceId && !inv) throw new UserError("Invoice not found.");
    const ord = orderId ? await db.salesOrder.findFirst({ where: { id: orderId, orgId: u.orgId, customerId: u.customerId } }) : null;
    if (orderId && !ord) throw new UserError("Order not found.");
    const customer = await db.customer.findFirst({ where: { id: u.customerId, orgId: u.orgId } });
    const title = req(fd, "title", "Subject").slice(0, 200);
    const description = req(fd, "description", "Details").slice(0, 4000);
    const number = await nextNumber(u.orgId, "issue", u.today);
    const issue = await db.issue.create({
      data: {
        orgId: u.orgId, number, customerId: u.customerId, invoiceId: inv?.id ?? null, orderId: ord?.id ?? null, category: category!, title, description,
        reportedBy: `${u.name} (via customer portal)`, source: "portal", ownerId: inv?.ownerId ?? customer?.ownerId ?? null,
        team: category === "quality_complaint" ? "quality" : category === "delivery_issue" || category === "missing_pod" ? "dispatch" : "finance",
        priority: "medium", status: "open", dueDate: dateFromISO(addDays(u.today, 3)),
      },
    });
    await logEvent(u, { entityType: "issue", entityId: issue.id, customerId: u.customerId, kind: "created", source: "portal", visibility: "customer", message: `Query raised by customer: ${title}` });
    redirect(`/portal/queries/${issue.id}`);
  });
}

async function ownIssue(u: Awaited<ReturnType<typeof portalUser>>, id: string) {
  const is = await db.issue.findFirst({ where: { id, orgId: u.orgId, customerId: u.customerId, source: "portal" } });
  if (!is) throw new UserError("Query not found.");
  return is;
}

export async function portalComment(id: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const u = await portalUser();
    const is = await ownIssue(u, id);
    const text = req(fd, "comment", "Comment").slice(0, 4000);
    await logEvent(u, { entityType: "issue", entityId: is.id, customerId: u.customerId, kind: "comment", source: "portal", visibility: "customer", message: text });
    revalidatePath(`/portal/queries/${is.id}`);
    return "Comment sent to the supplier team.";
  });
}

export async function acknowledgeResolution(id: string, _: ActionState, __: FormData) {
  return run(async () => {
    const u = await portalUser();
    const is = await ownIssue(u, id);
    if (!["resolved", "closed"].includes(is.status)) throw new UserError("This query has not been marked resolved yet.");
    if (is.customerConfirmed) throw new UserError("Already acknowledged.");
    await db.issue.update({ where: { id: is.id }, data: { customerConfirmed: true } });
    await logEvent(u, { entityType: "issue", entityId: is.id, customerId: u.customerId, kind: "status_change", source: "portal", visibility: "customer", message: "Customer acknowledged the resolution." });
    revalidatePath(`/portal/queries/${is.id}`);
    return "Thank you. Resolution acknowledged.";
  });
}
