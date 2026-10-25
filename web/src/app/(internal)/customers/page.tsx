import Link from "next/link";
import { OwnerSelect } from "@/components/lookups";
import { Badge, Card, Empty, Field, FilterBar, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getUserMap } from "@/lib/data/lookups";
import { loadInvoices, sumBy } from "@/lib/data/receivables";
import { db } from "@/lib/db";
import { CLOSED_ISSUE_STATUSES, CUSTOMER_STATUSES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("customers:view");
  const p = await readParams(searchParams);
  const q = p("q")?.toLowerCase();
  const showMoney = can(user, "receivables:view");
  const [customers, users, invoices, issues] = await Promise.all([
    db.customer.findMany({ where: { orgId: user.orgId, ...(p("status") ? { status: p("status") } : {}), ...(p("owner") ? { ownerId: p("owner") } : {}) }, orderBy: { name: "asc" } }),
    getUserMap(user.orgId),
    showMoney ? loadInvoices(user, { status: "open" }) : Promise.resolve([]),
    db.issue.groupBy({ by: ["customerId"], where: { orgId: user.orgId, status: { notIn: CLOSED_ISSUE_STATUSES } }, _count: true }),
  ]);
  const issueCount = new Map(issues.map((i) => [i.customerId, i._count]));
  const rows = customers.filter((c) => !q || [c.name, c.code, c.segment, c.city, c.tags, c.gstin ?? ""].some((v) => v.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Customer master with contacts, terms and a connected view of quotations, orders, invoices and issues."
        actions={can(user, "customers:edit") && <Link href="/customers/new" className="btn btn-primary">New customer</Link>}
      />
      <FilterBar resetHref="/customers">
        <Field label="Search" className="w-60"><input name="q" defaultValue={p("q")} className="input" placeholder="Name, code, city, segment, tag" /></Field>
        <Field label="Status" className="w-32"><Select name="status" options={CUSTOMER_STATUSES} defaultValue={p("status")} placeholder="All" /></Field>
        <OwnerSelect orgId={user.orgId} value={p("owner")} label="Account owner" />
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} customer(s)`}>
        {rows.length === 0 ? <Empty title="No customers found" hint="Create a customer or import your customer master as CSV." /> : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr><th>Code</th><th>Customer</th><th>Segment</th><th>Location</th><th>Account owner</th>{showMoney && <><th className="num">Outstanding</th><th className="num">Overdue</th></>}<th className="num">Open issues</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const inv = invoices.filter((i) => i.customerId === c.id);
                  return (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap font-mono text-xs">{c.code}</td>
                      <td className="min-w-52">
                        <Link href={`/customers/${c.id}`} className="link font-medium">{c.name}</Link>
                        <div className="mt-0.5 flex flex-wrap gap-1">{c.tags.split(",").filter(Boolean).slice(0, 3).map((t) => <Badge key={t} tone={t === "demo" ? "amber" : "slate"}>{t}</Badge>)}</div>
                      </td>
                      <td>{c.segment || "—"}</td>
                      <td className="whitespace-nowrap">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="whitespace-nowrap">{c.ownerId ? users.get(c.ownerId) : "—"}</td>
                      {showMoney && (
                        <>
                          <td className="num">{fmtINR(sumBy(inv, (i) => i.outstanding))}</td>
                          <td className="num text-red-700">{fmtINR(sumBy(inv.filter((i) => (i.overdueDays ?? 0) > 0), (i) => i.outstanding)) }</td>
                        </>
                      )}
                      <td className="num">{issueCount.get(c.id) ?? 0}</td>
                      <td><StatusBadge value={c.status} label={labelOf(CUSTOMER_STATUSES, c.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
