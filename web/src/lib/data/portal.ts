import { requirePortal } from "@/lib/auth/session";
import { loadInvoices } from "./receivables";

// Customer-facing invoice status: internal states (holds, disputes) are described neutrally.
export const PORTAL_STATUS: Record<string, string> = {
  not_due: "Not yet due",
  partially_paid: "Partially paid",
  overdue: "Overdue",
  disputed: "Query open",
  paid: "Paid",
  on_hold: "Under review",
};

/** Invoices for the signed-in portal customer only, stripped of internal fields. */
export async function portalInvoices() {
  const u = await requirePortal();
  const rows = await loadInvoices(u, { customerId: u.customerId });
  return rows.map((r) => ({
    id: r.id, number: r.number, invoiceDate: r.invoiceDate, dueDate: r.dueDate, total: r.total, paid: r.paid, credited: r.credited,
    outstanding: r.outstanding, overdueDays: r.overdueDays, status: r.status, orderId: r.orderId,
  }));
}
