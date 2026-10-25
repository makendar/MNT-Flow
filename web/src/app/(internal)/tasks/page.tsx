import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, PageHeader, StatusBadge, TableWrap, Tabs } from "@/components/ui";
import { can } from "@/lib/auth/permissions";
import { requireInternal } from "@/lib/auth/session";
import { completeTask } from "@/lib/actions/work";
import { getCustomerMap, getUserMap } from "@/lib/data/lookups";
import { db } from "@/lib/db";
import { addDays, fmtDate, isoOf } from "@/lib/dates";
import { TASK_STATUSES, labelOf } from "@/lib/domain/constants";
import { readParams, type SearchParams } from "@/lib/params";

export const metadata = { title: "Tasks & Follow-ups" };

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireInternal("tasks:view");
  const p = await readParams(searchParams);
  const view = p("view") ?? "mine";
  const [all, users, customers] = await Promise.all([db.task.findMany({ where: { orgId: user.orgId }, orderBy: [{ dueDate: "asc" }] }), getUserMap(user.orgId), getCustomerMap(user.orgId)]);
  const open = all.filter((t) => t.status !== "done");
  const d = (t: { dueDate: Date | null }) => isoOf(t.dueDate);
  const views: Record<string, typeof all> = {
    mine: open.filter((t) => t.ownerId === user.id),
    team: open,
    overdue: open.filter((t) => d(t) && d(t)! < user.today),
    today: open.filter((t) => d(t) === user.today),
    upcoming: open.filter((t) => d(t) && d(t)! > user.today && d(t)! <= addDays(user.today, 14)),
    completed: all.filter((t) => t.status === "done").sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
  };
  const rows = views[view] ?? views.mine;
  const labels: Record<string, string> = { mine: "My tasks", team: "Team tasks", overdue: "Overdue", today: "Due today", upcoming: "Upcoming (14 days)", completed: "Completed" };
  const canEdit = can(user, "tasks:edit");

  return (
    <>
      <PageHeader title="Tasks & Follow-ups" subtitle="Internal tasks linked to customers, invoices, orders and issues." actions={canEdit && <Link href="/tasks/new" className="btn btn-primary">New task</Link>} />
      <Tabs active={view} tabs={Object.keys(views).map((k) => ({ key: k, label: labels[k], href: `/tasks?view=${k}`, count: views[k].length }))} />
      <Card bodyClass="p-0">
        {rows.length === 0 ? <Empty title={`No ${labels[view].toLowerCase()}`} /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Task</th><th>Customer</th><th>Linked</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th>{canEdit && view !== "completed" && <th />}</tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="min-w-56"><Link className="link font-medium" href={`/tasks/${t.id}`}>{t.title}</Link>{t.description && <div className="text-[11px] text-slate-500">{t.description}</div>}</td>
                    <td className="min-w-36">{t.customerId ? <Link className="hover:underline" href={`/customers/${t.customerId}`}>{customers.get(t.customerId)?.name}</Link> : "—"}</td>
                    <td className="whitespace-nowrap text-xs">
                      {t.issueId && <Link className="link mr-2" href={`/issues/${t.issueId}`}>Issue</Link>}
                      {t.invoiceId && can(user, "receivables:view") && <Link className="link mr-2" href={`/receivables/${t.invoiceId}`}>Invoice</Link>}
                      {t.orderId && <Link className="link" href={`/orders/${t.orderId}`}>Order</Link>}
                      {!t.issueId && !t.invoiceId && !t.orderId && "—"}
                    </td>
                    <td className="whitespace-nowrap">{t.ownerId ? users.get(t.ownerId) : "Unassigned"}</td>
                    <td><StatusBadge value={t.priority} /></td>
                    <td className="whitespace-nowrap">{fmtDate(t.dueDate)}{t.status !== "done" && d(t) && d(t)! < user.today && <div><Badge tone="red">Overdue</Badge></div>}{t.completedAt && <div className="text-[11px] text-slate-500">Done {fmtDate(t.completedAt)} by {t.completedById ? users.get(t.completedById) : "—"}</div>}</td>
                    <td><StatusBadge value={t.status} label={labelOf(TASK_STATUSES, t.status)} /></td>
                    {canEdit && view !== "completed" && (
                      <td><ActionForm action={completeTask.bind(null, t.id)}><button className="btn btn-sm">Mark done</button></ActionForm></td>
                    )}
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
