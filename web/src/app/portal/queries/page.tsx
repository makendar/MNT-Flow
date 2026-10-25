import Link from "next/link";
import { Card, Empty, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { requirePortal } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { ISSUE_STATUSES, PORTAL_QUERY_TYPES, labelOf } from "@/lib/domain/constants";

export const metadata = { title: "My queries" };

export default async function PortalQueries() {
  const u = await requirePortal();
  const rows = await db.issue.findMany({ where: { orgId: u.orgId, customerId: u.customerId, source: "portal" }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="My queries" subtitle="Queries you raised and their current status." actions={<Link href="/portal/queries/new" className="btn btn-primary">Raise a query</Link>} />
      <Card bodyClass="p-0">
        {rows.length === 0 ? <Empty title="No queries yet" /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Query</th><th>Type</th><th>Raised</th><th>Status</th><th>Your confirmation</th></tr></thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td><Link className="link font-medium" href={`/portal/queries/${q.id}`}>{q.number}</Link> {q.title}</td>
                    <td className="text-xs">{labelOf(PORTAL_QUERY_TYPES, q.category)}</td>
                    <td>{fmtDate(q.createdAt)}</td>
                    <td><StatusBadge value={q.status} label={labelOf(ISSUE_STATUSES, q.status)} /></td>
                    <td className="text-xs">{q.customerConfirmed ? "Acknowledged" : ["resolved", "closed"].includes(q.status) ? "Please review" : "—"}</td>
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
