import { Download } from "lucide-react";
import { Badge, Card, Empty, PageHeader, TableWrap } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { DOCUMENT_TYPES, labelOf } from "@/lib/domain/constants";

export const metadata = { title: "Shared documents" };

export default async function PortalDocuments() {
  const u = await requirePortal();
  const docs = await db.document.findMany({ where: { orgId: u.orgId, customerId: u.customerId, sharedWithCustomer: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Shared documents" subtitle="Documents your supplier has shared with you, and files you uploaded." />
      <Card bodyClass="p-0">
        {docs.length === 0 ? <Empty title="No documents shared yet" /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>File</th><th>Type</th><th>Date</th><th>Source</th></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td><a className="link inline-flex items-center gap-1" href={`/api/documents/${d.id}`}><Download className="h-3.5 w-3.5" />{d.fileName}</a>{d.isSynthetic && <Badge tone="amber">Synthetic</Badge>}</td>
                    <td>{labelOf(DOCUMENT_TYPES, d.type)}</td>
                    <td>{fmtDate(d.createdAt)}</td>
                    <td>{d.uploadedByPortal ? "Uploaded by you" : "Shared by supplier"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
