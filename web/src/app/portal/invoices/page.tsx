import Link from "next/link";
import { Card, Empty, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { PORTAL_STATUS, portalInvoices } from "@/lib/data/portal";
import { sumBy } from "@/lib/data/receivables";
import { fmtDate } from "@/lib/dates";
import { fmtINR } from "@/lib/format";

export const metadata = { title: "Invoices" };

export default async function PortalInvoices() {
  const rows = await portalInvoices();
  return (
    <>
      <PageHeader title="Invoices" subtitle="Balances as per our records. If something doesn't match yours, raise a query on the invoice." />
      <Card bodyClass="p-0">
        {rows.length === 0 ? <Empty title="No invoices" /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Due date</th><th className="num">Amount</th><th className="num">Received / credited</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.number}</td>
                    <td>{fmtDate(r.invoiceDate)}</td>
                    <td>{fmtDate(r.dueDate)}</td>
                    <td className="num">{fmtINR(r.total, true)}</td>
                    <td className="num">{fmtINR(r.paid + r.credited, true)}</td>
                    <td className="num font-medium">{fmtINR(r.outstanding, true)}</td>
                    <td><StatusBadge value={r.status} label={PORTAL_STATUS[r.status]} /></td>
                    <td>{r.outstanding > 0 && <Link className="link text-xs" href={`/portal/queries/new?invoiceId=${r.id}`}>Raise query</Link>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total balance</td><td className="num">{fmtINR(sumBy(rows, (r) => r.outstanding), true)}</td><td colSpan={2} /></tr></tfoot>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
