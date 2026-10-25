"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize, getCurrentUser } from "@/lib/auth/session";
import { DOCUMENT_TYPES } from "@/lib/domain/constants";
import { safeFileName, saveFile, validateUpload } from "@/lib/storage";
import { oneOf, run, s, UserError, type ActionState } from "./run";

export type DocLink = { customerId: string; invoiceId?: string | null; orderId?: string | null; issueId?: string | null };

/** Verifies every linked record belongs to the organization (and to the given customer). */
async function verifyLink(orgId: string, l: DocLink) {
  const c = await db.customer.findFirst({ where: { id: l.customerId, orgId } });
  if (!c) throw new UserError("Customer not found.");
  if (l.invoiceId && !(await db.invoice.findFirst({ where: { id: l.invoiceId, orgId, customerId: l.customerId } }))) throw new UserError("Invoice not found.");
  if (l.orderId && !(await db.salesOrder.findFirst({ where: { id: l.orderId, orgId, customerId: l.customerId } }))) throw new UserError("Order not found.");
  if (l.issueId && !(await db.issue.findFirst({ where: { id: l.issueId, orgId, customerId: l.customerId } }))) throw new UserError("Issue not found.");
}

async function storeUpload(orgId: string, fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UserError("Choose a file to upload.");
  const buf = Buffer.from(await file.arrayBuffer());
  const err = validateUpload(file.name, file.type, buf);
  if (err) throw new UserError(err);
  const storageKey = await saveFile(orgId, buf);
  return { storageKey, fileName: safeFileName(file.name), mimeType: file.type || "application/octet-stream", size: buf.length };
}

function revalidateLinked(l: DocLink) {
  if (l.invoiceId) revalidatePath(`/receivables/${l.invoiceId}`);
  if (l.orderId) revalidatePath(`/orders/${l.orderId}`);
  if (l.issueId) revalidatePath(`/issues/${l.issueId}`);
  revalidatePath(`/customers/${l.customerId}`);
}

export async function uploadDocument(link: DocLink, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await authorize("documents:upload");
    await verifyLink(user.orgId, link);
    const type = oneOf(s(fd, "type"), DOCUMENT_TYPES, "document type");
    const meta = await storeUpload(user.orgId, fd);
    const shared = fd.get("shared") === "on";
    const doc = await db.document.create({ data: { orgId: user.orgId, ...link, type, ...meta, sharedWithCustomer: shared, uploadedById: user.id } });
    const entityType = link.issueId ? "issue" : link.invoiceId ? "invoice" : link.orderId ? "order" : "customer";
    const entityId = link.issueId ?? link.invoiceId ?? link.orderId ?? link.customerId;
    await logEvent(user, { entityType, entityId, customerId: link.customerId, kind: "document", visibility: shared ? "customer" : "internal", message: `Document uploaded: ${doc.fileName} (${type.replace(/_/g, " ")})${shared ? ", shared with customer" : ""}. Uploading evidence does not change invoice status; an authorized user must confirm.` });
    revalidateLinked(link);
    return "Document uploaded.";
  });
}

export async function toggleDocumentShare(docId: string, _: ActionState, __: FormData) {
  return run(async () => {
    const user = await authorize("documents:upload");
    const doc = await db.document.findFirst({ where: { id: docId, orgId: user.orgId } });
    if (!doc) throw new UserError("Document not found.");
    await db.document.update({ where: { id: doc.id }, data: { sharedWithCustomer: !doc.sharedWithCustomer } });
    await logEvent(user, { entityType: "document", entityId: doc.id, customerId: doc.customerId, kind: "updated", message: `${doc.fileName} ${doc.sharedWithCustomer ? "unshared from" : "shared with"} customer portal.` });
    revalidateLinked({ customerId: doc.customerId!, invoiceId: doc.invoiceId, orderId: doc.orderId, issueId: doc.issueId });
    return doc.sharedWithCustomer ? "Document is now internal only." : "Document shared with customer.";
  });
}

/** Customer portal evidence upload: only onto the portal user's own issue; always visible to that customer. */
export async function portalUploadEvidence(issueId: string, _: ActionState, fd: FormData) {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "customer_portal" || !user.customerId) throw new UserError("Not allowed.");
    const issue = await db.issue.findFirst({ where: { id: issueId, orgId: user.orgId, customerId: user.customerId } });
    if (!issue) throw new UserError("Query not found.");
    const meta = await storeUpload(user.orgId, fd);
    await db.document.create({ data: { orgId: user.orgId, customerId: user.customerId, issueId: issue.id, invoiceId: issue.invoiceId, type: "correspondence", ...meta, sharedWithCustomer: true, uploadedByPortal: true } });
    await logEvent(user, { entityType: "issue", entityId: issue.id, customerId: user.customerId, kind: "document", source: "portal", visibility: "customer", message: `Customer uploaded evidence: ${meta.fileName}` });
    revalidatePath(`/portal/queries/${issue.id}`);
    return "File uploaded.";
  });
}
