import Link from "next/link";
import type { Dispatch, Issue, Quotation, SalesOrder, Task } from "@prisma/client";
import { Badge, Empty, StatusBadge, TableWrap } from "./ui";
import { daysBetween, fmtDate, isoOf } from "@/lib/dates";
import { DISPATCH_STATUSES, ISSUE_CATEGORIES, ISSUE_STATUSES, OPEN_QUOTE_STATUSES, ORDER_PENDING_DELIVERY, ORDER_STATUSES, QUOTE_STATUSES, TASK_STATUSES, labelOf, CLOSED_ISSUE_STATUSES } from "@/lib/domain/constants";
import { fmtINR } from "@/lib/format";

type Maps = { users: Map<string, string>; customers?: Map<string, { name: string }>; today: string };

function Cust({ id, m }: { id: string | null; m: Maps }) {
  if (!m.customers || !id) return null;
  return <td className="min-w-40"><Link className="hover:underline" href={`/customers/${id}`}>{m.customers.get(id)?.name ?? "—"}</Link></td>;
}

export function QuotesTable({ rows, m }: { rows: Quotation[]; m: Maps }) {
  if (!rows.length) return <Empty title="No quotations" />;
  return (
    <TableWrap>
      <table className="tbl">
        <thead><tr><th>Quotation</th>{m.customers && <th>Customer</th>}<th>Date</th><th>Valid until</th><th className="num">Amount</th><th>Status</th><th className="num">Age</th><th>Next follow-up</th><th>Owner</th></tr></thead>
        <tbody>
          {rows.map((q) => {
            const open = OPEN_QUOTE_STATUSES.includes(q.status);
            const fu = isoOf(q.nextFollowUpDate);
            return (
              <tr key={q.id}>
                <td className="whitespace-nowrap"><Link className="link font-medium" href={`/quotations/${q.id}`}>{q.number}</Link></td>
                <Cust id={q.customerId} m={m} />
                <td className="whitespace-nowrap">{fmtDate(q.quoteDate)}</td>
                <td className="whitespace-nowrap">{fmtDate(q.validUntil)}</td>
                <td className="num">{fmtINR(q.amount)}</td>
                <td><StatusBadge value={q.status} label={labelOf(QUOTE_STATUSES, q.status)} /></td>
                <td className="num">{open ? `${daysBetween(q.quoteDate, m.today)}d` : "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(q.nextFollowUpDate)}{open && fu && fu < m.today && <div><Badge tone="red">Follow-up overdue</Badge></div>}</td>
                <td className="whitespace-nowrap">{q.ownerId ? m.users.get(q.ownerId) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

export function OrdersTable({ rows, m }: { rows: SalesOrder[]; m: Maps }) {
  if (!rows.length) return <Empty title="No orders" />;
  return (
    <TableWrap>
      <table className="tbl">
        <thead><tr><th>Order</th>{m.customers && <th>Customer</th>}<th>Customer PO</th><th>Order date</th><th className="num">Value</th><th>Expected delivery</th><th>Status</th><th>Owner</th></tr></thead>
        <tbody>
          {rows.map((o) => {
            const exp = isoOf(o.expectedDeliveryDate);
            const late = exp && ORDER_PENDING_DELIVERY.includes(o.status) && exp < m.today;
            return (
              <tr key={o.id}>
                <td className="whitespace-nowrap"><Link className="link font-medium" href={`/orders/${o.id}`}>{o.number}</Link></td>
                <Cust id={o.customerId} m={m} />
                <td className="whitespace-nowrap font-mono text-xs">{o.customerPoNumber || "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(o.orderDate)}</td>
                <td className="num">{fmtINR(o.value)}</td>
                <td className="whitespace-nowrap">{fmtDate(o.expectedDeliveryDate)}{late && <div><Badge tone="red">{daysBetween(exp!, m.today)}d past commitment</Badge></div>}{o.delayReason && <div className="max-w-48 text-[11px] text-slate-500">Delay: {o.delayReason}</div>}</td>
                <td><StatusBadge value={o.status} label={labelOf(ORDER_STATUSES, o.status)} /></td>
                <td className="whitespace-nowrap">{o.ownerId ? m.users.get(o.ownerId) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

export function DispatchTable({ rows, m, orders }: { rows: Dispatch[]; m: Maps; orders: Map<string, string> }) {
  if (!rows.length) return <Empty title="No dispatches" />;
  return (
    <TableWrap>
      <table className="tbl">
        <thead><tr><th>Challan</th><th>Order</th>{m.customers && <th>Customer</th>}<th>Committed</th><th>Dispatched</th><th>Delivered</th><th>Status</th><th>POD</th><th>Transporter</th></tr></thead>
        <tbody>
          {rows.map((d) => {
            const c = isoOf(d.committedDate)!;
            const late = d.status === "planned" && c < m.today;
            return (
              <tr key={d.id}>
                <td className="whitespace-nowrap font-medium">{d.challanNumber}</td>
                <td><Link className="link" href={`/orders/${d.orderId}`}>{orders.get(d.orderId) ?? "—"}</Link></td>
                <Cust id={d.customerId} m={m} />
                <td className="whitespace-nowrap">{fmtDate(d.committedDate)}{late && <div><Badge tone="red">{daysBetween(c, m.today)}d late</Badge></div>}</td>
                <td className="whitespace-nowrap">{fmtDate(d.dispatchDate)}</td>
                <td className="whitespace-nowrap">{fmtDate(d.deliveredDate)}</td>
                <td><StatusBadge value={d.status} label={labelOf(DISPATCH_STATUSES, d.status)} /></td>
                <td>{d.status === "delivered" ? (d.podReceived ? <Badge tone="green">Received</Badge> : <Badge tone="red">Missing</Badge>) : "—"}</td>
                <td className="text-xs">{d.transporter || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

export function IssuesTable({ rows, m }: { rows: Issue[]; m: Maps }) {
  if (!rows.length) return <Empty title="No issues" />;
  return (
    <TableWrap>
      <table className="tbl">
        <thead><tr><th>Issue</th>{m.customers && <th>Customer</th>}<th>Category</th><th>Status</th><th>Priority</th><th>Owner</th><th className="num">Age</th><th>Due</th><th>Flags</th></tr></thead>
        <tbody>
          {rows.map((i) => {
            const open = !CLOSED_ISSUE_STATUSES.includes(i.status);
            const due = isoOf(i.dueDate);
            return (
              <tr key={i.id}>
                <td className="min-w-56"><Link className="link font-medium" href={`/issues/${i.id}`}>{i.number}</Link> <span className="text-slate-700">{i.title}</span></td>
                <Cust id={i.customerId} m={m} />
                <td className="whitespace-nowrap text-xs">{labelOf(ISSUE_CATEGORIES, i.category)}</td>
                <td><StatusBadge value={i.status} label={labelOf(ISSUE_STATUSES, i.status)} /></td>
                <td><StatusBadge value={i.priority} /></td>
                <td className="whitespace-nowrap">{i.ownerId ? m.users.get(i.ownerId) : "Unassigned"}</td>
                <td className="num">{open ? `${daysBetween(i.createdAt, m.today)}d` : "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(i.dueDate)}{open && due && due < m.today && <div><Badge tone="red">Overdue</Badge></div>}</td>
                <td><div className="flex flex-wrap gap-1">{i.blocksPayment && open && <Badge tone="amber">Blocks payment</Badge>}{i.source === "portal" && <Badge tone="teal">From portal</Badge>}{i.customerConfirmed && <Badge tone="green">Customer confirmed</Badge>}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}

export function TasksTable({ rows, m }: { rows: Task[]; m: Maps }) {
  if (!rows.length) return <Empty title="No tasks" />;
  return (
    <TableWrap>
      <table className="tbl">
        <thead><tr><th>Task</th>{m.customers && <th>Customer</th>}<th>Owner</th><th>Priority</th><th>Due</th><th>Status</th><th>Completed</th></tr></thead>
        <tbody>
          {rows.map((t) => {
            const due = isoOf(t.dueDate);
            return (
              <tr key={t.id}>
                <td className="min-w-56"><Link className="link font-medium" href={`/tasks/${t.id}`}>{t.title}</Link>{t.description && <div className="text-[11px] text-slate-500">{t.description}</div>}</td>
                {m.customers && <td className="min-w-36">{t.customerId ? <Link className="hover:underline" href={`/customers/${t.customerId}`}>{m.customers.get(t.customerId)?.name}</Link> : "—"}</td>}
                <td className="whitespace-nowrap">{t.ownerId ? m.users.get(t.ownerId) : "Unassigned"}</td>
                <td><StatusBadge value={t.priority} /></td>
                <td className="whitespace-nowrap">{fmtDate(t.dueDate)}{t.status !== "done" && due && due < m.today && <div><Badge tone="red">Overdue</Badge></div>}</td>
                <td><StatusBadge value={t.status} label={labelOf(TASK_STATUSES, t.status)} /></td>
                <td className="whitespace-nowrap text-xs">{t.completedAt ? `${fmtDate(t.completedAt)} · ${t.completedById ? m.users.get(t.completedById) : ""}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
