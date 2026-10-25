import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { CustomerSelect, OwnerSelect } from "@/components/lookups";
import { Badge, Card, Empty, Field, FilterBar, PageHeader, Select, StatusBadge, TableWrap } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { bulkUpdateActions } from "@/lib/actions/action-items";
import { syncActions } from "@/lib/data/actions";
import { getCustomerMap, getUserMap, getUsers } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { addDays, daysBetween, fmtDate, isoOf } from "@/lib/dates";
import { ACTION_CATEGORIES, PRIORITIES, RECEIVABLE_ACTION_CATEGORIES, labelOf } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";
import { recordHref } from "@/lib/links";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Action Center" };

const SORTS = [
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due date" },
  { value: "amount", label: "Amount" },
  { value: "age", label: "Age (oldest first)" },
  { value: "customer", label: "Customer" },
  { value: "owner", label: "Owner" },
];

export default async function ActionCenterPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("actions:view");
  const p = await readParams(searchParams);
  await syncActions(user);
  const status = p("status") ?? "open";
  const ownerParam = p("owner") === "me" ? user.id : p("owner");
  const due = p("due");
  const sort = p("sort") ?? "priority";
  const q = p("q")?.toLowerCase();
  const [all, customers, users, staff] = await Promise.all([
    db.actionItem.findMany({
      where: {
        orgId: user.orgId,
        ...(status !== "all" ? { status } : {}),
        ...(p("category") ? { category: p("category") } : {}),
        ...(p("priority") ? { priority: p("priority") } : {}),
        ...(ownerParam ? { ownerId: ownerParam === "none" ? null : ownerParam } : {}),
        ...(p("customer") ? { customerId: p("customer") } : {}),
      },
    }),
    getCustomerMap(user.orgId),
    getUserMap(user.orgId),
    getUsers(user.orgId),
  ]);
  const showMoney = can(user, "receivables:view");
  const canEdit = can(user, "actions:edit");
  const rows = all
    .filter((a) => showMoney || !RECEIVABLE_ACTION_CATEGORIES.includes(a.category))
    .filter((a) => {
      const d = isoOf(a.dueDate);
      if (due === "overdue") return !!d && d < user.today;
      if (due === "today") return !!d && d <= user.today;
      if (due === "week") return !!d && d <= addDays(user.today, 7);
      return true;
    })
    .map((a) => ({ ...a, customerName: a.customerId ? customers.get(a.customerId)?.name ?? "—" : "—", ownerName: a.ownerId ? users.get(a.ownerId) ?? "—" : "Unassigned" }))
    .filter((a) => !q || a.title.toLowerCase().includes(q) || a.customerName.toLowerCase().includes(q) || a.priorityReason.toLowerCase().includes(q))
    .sort((a, b) => {
      switch (sort) {
        case "due": return (isoOf(a.dueDate) ?? "9999").localeCompare(isoOf(b.dueDate) ?? "9999") || b.priorityScore - a.priorityScore;
        case "amount": return (b.amount ?? 0) - (a.amount ?? 0);
        case "age": return a.createdAt.getTime() - b.createdAt.getTime();
        case "customer": return a.customerName.localeCompare(b.customerName);
        case "owner": return a.ownerName.localeCompare(b.ownerName);
        default: return b.priorityScore - a.priorityScore || (isoOf(a.dueDate) ?? "").localeCompare(isoOf(b.dueDate) ?? "");
      }
    });
  const counts = { high: rows.filter((r) => r.priority === "high").length, overdue: rows.filter((r) => r.status === "open" && r.dueDate && isoOf(r.dueDate)! < user.today).length };

  return (
    <>
      <PageHeader
        title="Action Center"
        subtitle="Every open exception with an owner, a due date, a reason and a recommended next step. Priorities are rule-based (configurable in Settings), not AI predictions."
        actions={
          <>
            <Link href="/action-center?owner=me" className="btn">My actions</Link>
            <Link href="/action-center?due=overdue" className="btn">Overdue</Link>
          </>
        }
      />
      <FilterBar resetHref="/action-center">
        <Field label="Search" className="w-48"><input name="q" defaultValue={p("q")} className="input" placeholder="Title, customer, reason" /></Field>
        <Field label="Category" className="w-52"><Select name="category" options={ACTION_CATEGORIES.filter((c) => showMoney || !RECEIVABLE_ACTION_CATEGORIES.includes(c.value))} defaultValue={p("category")} placeholder="All categories" /></Field>
        <Field label="Priority" className="w-28"><Select name="priority" options={PRIORITIES} defaultValue={p("priority")} placeholder="All" /></Field>
        <Field label="Status" className="w-28"><Select name="status" options={[{ value: "open", label: "Open" }, { value: "completed", label: "Completed" }, { value: "all", label: "All" }]} defaultValue={status} /></Field>
        <Field label="Due" className="w-32"><Select name="due" options={[{ value: "overdue", label: "Overdue" }, { value: "today", label: "Due by today" }, { value: "week", label: "Next 7 days" }]} defaultValue={due} placeholder="Any time" /></Field>
        <OwnerSelect orgId={user.orgId} value={ownerParam} />
        <CustomerSelect orgId={user.orgId} value={p("customer")} />
        <Field label="Sort by" className="w-36"><Select name="sort" options={SORTS} defaultValue={sort} /></Field>
      </FilterBar>

      <Card
        bodyClass="p-0"
        title={<>{rows.length} action(s) <span className="ml-2 font-normal text-slate-500">{counts.high} high priority · {counts.overdue} overdue</span></>}
      >
        {rows.length === 0 ? (
          <Empty title="No actions match these filters" hint="Actions are generated automatically from overdue invoices, promises, open issues, quotation follow-ups, delivery commitments and overdue tasks." />
        ) : (
          <ActionForm action={bulkUpdateActions}>
            {canEdit && status !== "completed" && (
              <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
                <span className="text-xs font-medium text-slate-600">Bulk update selected:</span>
                <select name="bulkOwner" className="input w-44" defaultValue="" aria-label="Assign owner">
                  <option value="">Keep owner</option>
                  {staff.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" name="bulkDue" className="input w-36" aria-label="New due date" />
                <button className="btn btn-sm">Apply to selected</button>
                <span className="text-[11px] text-slate-500">Completion requires a resolution, so it is done per action.</span>
              </div>
            )}
            <TableWrap>
              <table className="tbl">
                <thead>
                  <tr>
                    {canEdit && <th className="w-8"><span className="sr-only">Select</span></th>}
                    <th>Priority</th><th>Action</th><th>Customer</th><th className="num">Amount</th><th>Reason</th><th>Owner</th><th>Due</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const d = isoOf(a.dueDate);
                    const late = a.status === "open" && d && d < user.today ? daysBetween(d, user.today) : 0;
                    return (
                      <tr key={a.id}>
                        {canEdit && <td>{a.status === "open" && <input type="checkbox" name="ids" value={a.id} aria-label={`Select ${a.title}`} className="mt-0.5" />}</td>}
                        <td><StatusBadge value={a.priority} /><div className="mt-0.5 text-[10px] text-slate-400">score {a.priorityScore}</div></td>
                        <td className="min-w-56">
                          <Link href={`/action-center/${a.id}`} className="link font-medium">{a.title}</Link>
                          <div className="text-[11px] text-slate-500">
                            {labelOf(ACTION_CATEGORIES, a.category)}
                            {recordHref(a) && <> · <Link href={recordHref(a)!} className="link">linked record</Link></>}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">Next: {a.recommendedAction}</div>
                        </td>
                        <td className="min-w-36">{a.customerId ? <Link href={`/customers/${a.customerId}`} className="hover:underline">{a.customerName}</Link> : "—"}</td>
                        <td className="num">{fmtINR(a.amount)}</td>
                        <td className="min-w-64 text-xs text-slate-600">{a.priorityReason}</td>
                        <td className="whitespace-nowrap">{a.ownerName}</td>
                        <td className="whitespace-nowrap">
                          {fmtDate(a.dueDate)}
                          {late > 0 && <div><Badge tone="red">{late}d late</Badge></div>}
                        </td>
                        <td>{a.status === "completed" ? <Badge tone={a.systemClosed ? "slate" : "green"}>{a.systemClosed ? "Auto-closed" : "Completed"}</Badge> : <Badge tone="blue">Open</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
