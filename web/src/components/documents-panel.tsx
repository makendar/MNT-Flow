import { Download } from "lucide-react";
import { ActionForm } from "./action-form";
import { Badge, Card, Empty, Field, Select } from "./ui";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { toggleDocumentShare, uploadDocument, type DocLink } from "@/lib/actions/documents";
import { getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { DOCUMENT_TYPES, labelOf } from "@/lib/domain/constants";

/** Documents linked to the most specific record given; upload form for authorized users. */
export async function DocumentsPanel({ user, link, title = "Documents & evidence", allForCustomer }: { user: SessionUser; link: DocLink; title?: string; allForCustomer?: boolean }) {
  const where = allForCustomer
    ? { customerId: link.customerId }
    : link.issueId ? { issueId: link.issueId } : link.invoiceId ? { invoiceId: link.invoiceId } : link.orderId ? { orderId: link.orderId } : { customerId: link.customerId };
  const [docs, users] = await Promise.all([db.document.findMany({ where: { orgId: user.orgId, ...where }, orderBy: { createdAt: "desc" } }), getUserMap(user.orgId)]);
  const canUpload = can(user, "documents:upload");

  return (
    <Card title={title} bodyClass="p-0">
      {docs.length === 0 ? (
        <Empty title="No documents attached" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-2 px-4 py-2 text-[13px]">
              <div className="min-w-0">
                <a href={`/api/documents/${d.id}`} className="link inline-flex items-center gap-1 break-all font-medium"><Download className="h-3.5 w-3.5 shrink-0" />{d.fileName}</a>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                  <Badge>{labelOf(DOCUMENT_TYPES, d.type)}</Badge>
                  {d.sharedWithCustomer ? <Badge tone="teal">Shared with customer</Badge> : <Badge tone="slate">Internal</Badge>}
                  {d.isSynthetic && <Badge tone="amber">Synthetic</Badge>}
                  <span>{fmtDate(d.createdAt)} · {d.uploadedByPortal ? "Customer portal" : d.uploadedById ? users.get(d.uploadedById) : "—"} · {(d.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              {canUpload && (
                <ActionForm action={toggleDocumentShare.bind(null, d.id)}>
                  <button className="btn btn-sm" title="Toggle customer portal visibility">{d.sharedWithCustomer ? "Unshare" : "Share"}</button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && !allForCustomer && (
        <ActionForm action={uploadDocument.bind(null, link)} resetOnSuccess className="space-y-2 border-t border-slate-100 p-4">
          <Field label="Attach file" hint="PDF, image, CSV, XLSX, DOCX or TXT · max 5 MB · stored privately"><input type="file" name="file" required className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1" /></Field>
          <Field label="Document type"><Select name="type" options={DOCUMENT_TYPES} defaultValue="correspondence" /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="shared" /> Share with customer portal</label>
          <button className="btn btn-sm">Upload</button>
        </ActionForm>
      )}
    </Card>
  );
}
