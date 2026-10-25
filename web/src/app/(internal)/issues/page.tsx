import Link from "next/link";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { IssuesTable } from "@/components/record-tables";
import { Card, Field, FilterBar, PageHeader, Select } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, PRIORITIES, TEAMS } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Issues & Disputes" };

export default async function IssuesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("issues:view");
  const p = await readParams(searchParams);
  const status = p("status") ?? "open";
  const [all, users, customers] = await Promise.all([
    db.issue.findMany({
      where: {
        orgId: user.orgId,
        ...(p("customer") ? { customerId: p("customer") } : {}),
        ...(p("owner") ? { ownerId: p("owner") } : {}),
        ...(p("category") ? { category: p("category") } : {}),
        ...(p("priority") ? { priority: p("priority") } : {}),
        ...(p("team") ? { team: p("team") } : {}),
        ...(p("blocking") ? { blocksPayment: true } : {}),
        ...(p("source") ? { source: p("source") } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    getUserMap(user.orgId),
    getCustomerMap(user.orgId),
  ]);
  const q = p("q")?.toLowerCase();
  const rows = all
    .filter((i) => status === "all" || (status === "open" ? !CLOSED_ISSUE_STATUSES.includes(i.status) : i.status === status))
    .filter((i) => !q || [i.number, i.title, i.description, customers.get(i.customerId)?.name ?? ""].some((v) => v.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="Issues & Disputes"
        subtitle="Every payment blocker and customer query with a responsible owner, missing evidence, next action and due date."
        actions={can(user, "issues:edit") && <Link href="/issues/new" className="btn btn-primary">Raise issue</Link>}
      />
      <FilterBar resetHref="/issues">
        <Field label="Search" className="w-44"><input name="q" defaultValue={p("q")} className="input" placeholder="Number, title, customer" /></Field>
        <Field label="Status" className="w-44"><Select name="status" options={[{ value: "open", label: "All open" }, ...ISSUE_STATUSES, { value: "all", label: "All" }]} defaultValue={status} /></Field>
        <Field label="Category" className="w-48"><Select name="category" options={ISSUE_CATEGORIES} defaultValue={p("category")} placeholder="All" /></Field>
        <Field label="Priority" className="w-28"><Select name="priority" options={PRIORITIES} defaultValue={p("priority")} placeholder="All" /></Field>
        <Field label="Team" className="w-32"><Select name="team" options={TEAMS} defaultValue={p("team")} placeholder="All" /></Field>
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <OwnerSelect orgId={user.orgId} value={p("owner")} />
        <Field label="Blocking payment" className="w-32"><Select name="blocking" options={[{ value: "1", label: "Yes" }]} defaultValue={p("blocking")} placeholder="Any" /></Field>
        <Field label="Source" className="w-32"><Select name="source" options={[{ value: "internal", label: "Internal" }, { value: "portal", label: "Customer portal" }]} defaultValue={p("source")} placeholder="Any" /></Field>
      </FilterBar>
      <Card bodyClass="p-0" title={`${rows.length} issue(s)`}><IssuesTable rows={rows} m={{ users, customers, today: user.today }} /></Card>
    </>
  );
}
