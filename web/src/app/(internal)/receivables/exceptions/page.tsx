import Link from "next/link";
import { ReceivablesTabs } from "@/components/subnav";
import { Card, Empty, PageHeader, TableWrap } from "@/components/ui";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap } from "@/lib/data/lookups";
import { loadInvoices, sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { fmtINR } from "@/lib/format";

export const metadata = { title: "Data exceptions" };

export default async function ExceptionsPage() {
  const user = await requireInternal("receivables:view");
  const [invoices, unapplied, customers] = await Promise.all([
    loadInvoices(user),
    db.payment.findMany({ where: { orgId: user.orgId, invoiceId: null }, orderBy: { paymentDate: "desc" } }),
    getCustomerMap(user.orgId),
  ]);
  const flagged = invoices.filter((i) => i.exceptions.length);

  return (
    <>
      <PageHeader title="Receivables" subtitle="Records that need correction in the source system. MNT Flow never changes financial amounts silently." />
      <ReceivablesTabs active="exceptions" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={`Unapplied payments (${unapplied.length}) · ${fmtINR(sumBy(unapplied, (p) => p.amount))}`} bodyClass="p-0">
          {unapplied.length === 0 ? <Empty title="No unapplied payments" /> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Date</th><th>Customer</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {unapplied.map((p) => (
                    <tr key={p.id}><td>{fmtDate(p.paymentDate)}</td><td><Link className="hover:underline" href={`/customers/${p.customerId}`}>{customers.get(p.customerId)?.name}</Link></td><td>{p.reference}</td><td className="num">{fmtINR(p.amount, true)}</td></tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
          <p className="px-4 py-2 text-[11px] text-slate-500">Unapplied payments are not deducted from any invoice and are excluded from outstanding totals until allocated in the accounting system and re-imported.</p>
        </Card>
        <Card title={`Invoice data exceptions (${flagged.length})`} bodyClass="p-0">
          {flagged.length === 0 ? <Empty title="No invoice exceptions" hint="Missing due dates, non-INR currency and credit balances appear here." /> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Exception</th></tr></thead>
                <tbody>
                  {flagged.map((i) => (
                    <tr key={i.id}><td><Link className="link" href={`/receivables/${i.id}`}>{i.number}</Link></td><td>{i.customerName}</td><td className="text-amber-800">{i.exceptions.join(", ")}</td></tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}
