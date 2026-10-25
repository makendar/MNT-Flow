import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { fmtINR } from "@/lib/format";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Search" };

/** Deterministic search over the user's own authorized records (no AI involved). */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal();
  const q = (await readParams(searchParams))("q")?.slice(0, 80) ?? "";
  const ql = q.toLowerCase();
  const org = { orgId: user.orgId };
  const [customers, invoices, orders, quotes, issues] = q.length < 2 ? [[], [], [], [], []] : await Promise.all([
    db.customer.findMany({ where: org }),
    can(user, "receivables:view") ? db.invoice.findMany({ where: org }) : Promise.resolve([]),
    db.salesOrder.findMany({ where: org }),
    can(user, "quotes:view") ? db.quotation.findMany({ where: org }) : Promise.resolve([]),
    db.issue.findMany({ where: org }),
  ]);
  const cm = await getCustomerMap(user.orgId);
  const has = (...v: (string | null | undefined)[]) => v.some((x) => x?.toLowerCase().includes(ql));
  const groups: [string, { href: string; label: string; sub: string }[]][] = [
    ["Customers", customers.filter((c) => has(c.name, c.code, c.city, c.gstin, c.primaryContactName)).map((c) => ({ href: `/customers/${c.id}`, label: c.name, sub: `${c.code} · ${c.city}` }))],
    ["Invoices", invoices.filter((i) => has(i.number, cm.get(i.customerId)?.name)).map((i) => ({ href: `/receivables/${i.id}`, label: i.number, sub: `${cm.get(i.customerId)?.name} · ${fmtINR(i.total)}` }))],
    ["Orders", orders.filter((o) => has(o.number, o.customerPoNumber, cm.get(o.customerId)?.name)).map((o) => ({ href: `/orders/${o.id}`, label: o.number, sub: `PO ${o.customerPoNumber} · ${cm.get(o.customerId)?.name}` }))],
    ["Quotations", quotes.filter((x) => has(x.number, cm.get(x.customerId)?.name)).map((x) => ({ href: `/quotations/${x.id}`, label: x.number, sub: `${cm.get(x.customerId)?.name} · ${fmtINR(x.amount)}` }))],
    ["Issues", issues.filter((i) => has(i.number, i.title, i.description)).map((i) => ({ href: `/issues/${i.id}`, label: `${i.number} ${i.title}`, sub: cm.get(i.customerId)?.name ?? "" }))],
  ];
  const total = groups.reduce((s, [, r]) => s + r.length, 0);

  return (
    <>
      <PageHeader title={q ? `Search results for “${q}”` : "Search"} subtitle={q.length >= 2 ? `${total} result(s) across records you can access` : "Type at least 2 characters in the search box above."} />
      {q.length >= 2 && total === 0 && <Card><Empty title="No matching records" /></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.filter(([, r]) => r.length).map(([g, r]) => (
          <Card key={g} title={`${g} (${r.length})`} bodyClass="p-0">
            <ul className="divide-y divide-slate-100">
              {r.slice(0, 15).map((x) => (
                <li key={x.href} className="px-4 py-2"><Link href={x.href} className="link font-medium">{x.label}</Link><div className="text-xs text-slate-500">{x.sub}</div></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
