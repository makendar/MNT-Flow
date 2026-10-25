// Single source of truth for status / category vocabularies (SQLite stores them as strings).

type Opt = readonly { value: string; label: string }[];
const opts = <T extends Opt>(o: T) => o;

export const ROLES = opts([
  { value: "org_admin", label: "Organization Admin" },
  { value: "executive", label: "Owner / Executive" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "finance_exec", label: "Finance Executive" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "sales_exec", label: "Sales Executive" },
  { value: "operations", label: "Operations / Dispatch" },
  { value: "quality", label: "Quality / Issue Resolver" },
  { value: "auditor", label: "Read-only Auditor" },
  { value: "customer_portal", label: "Customer Portal User" },
]);
export type Role = (typeof ROLES)[number]["value"];

export const TEAMS = opts([
  { value: "finance", label: "Finance" },
  { value: "sales", label: "Sales" },
  { value: "dispatch", label: "Dispatch" },
  { value: "operations", label: "Operations" },
  { value: "quality", label: "Quality" },
]);

export const CUSTOMER_STATUSES = opts([
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
]);

export const QUOTE_STATUSES = opts([
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "awaiting_response", label: "Awaiting customer response" },
  { value: "negotiation", label: "Negotiation" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
]);
export const OPEN_QUOTE_STATUSES = ["draft", "sent", "awaiting_response", "negotiation"];

export const ORDER_STATUSES = opts([
  { value: "received", label: "Received" },
  { value: "confirmation_pending", label: "Confirmation pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "ready_for_dispatch", label: "Ready for dispatch" },
  { value: "partially_dispatched", label: "Partially dispatched" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "cancelled", label: "Cancelled" },
]);
/** Orders whose delivery commitment is still pending. */
export const ORDER_PENDING_DELIVERY = ["received", "confirmation_pending", "confirmed", "in_progress", "ready_for_dispatch", "partially_dispatched", "on_hold"];

export const DISPATCH_STATUSES = opts([
  { value: "planned", label: "Planned" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
]);

export const INVOICE_STATUSES = opts([
  { value: "not_due", label: "Not due" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "overdue", label: "Overdue" },
  { value: "disputed", label: "Disputed" },
  { value: "paid", label: "Paid" },
  { value: "on_hold", label: "On hold" },
]);
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]["value"];

export const PROMISE_STATUSES = opts([
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "partially_fulfilled", label: "Partially fulfilled" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
]);

export const CHANNELS = opts([
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
]);

export const ISSUE_CATEGORIES = opts([
  { value: "missing_po", label: "Missing purchase order" },
  { value: "missing_grn", label: "Missing goods receipt note" },
  { value: "missing_pod", label: "Missing delivery proof" },
  { value: "quantity_mismatch", label: "Quantity mismatch" },
  { value: "quality_complaint", label: "Quality complaint" },
  { value: "pricing_mismatch", label: "Pricing mismatch" },
  { value: "tax_mismatch", label: "Tax or invoice mismatch" },
  { value: "credit_note_pending", label: "Credit note pending" },
  { value: "approval_pending", label: "Customer approval pending" },
  { value: "promise_missed", label: "Payment promise missed" },
  { value: "cashflow_delay", label: "Customer cash-flow delay" },
  { value: "delivery_issue", label: "Order or delivery issue" },
  { value: "warranty_service", label: "Warranty or service issue" },
  { value: "other", label: "Other / unknown" },
]);
export const MISSING_DOC_CATEGORIES = ["missing_po", "missing_grn", "missing_pod"];
export const MISMATCH_CATEGORIES = ["quantity_mismatch", "pricing_mismatch", "tax_mismatch"];

/** Customer-facing query types offered in the portal (subset of issue categories). */
export const PORTAL_QUERY_TYPES = opts([
  { value: "tax_mismatch", label: "Invoice query (amount, tax, PO reference)" },
  { value: "pricing_mismatch", label: "Pricing or charges" },
  { value: "quantity_mismatch", label: "Quantity received differs" },
  { value: "delivery_issue", label: "Delivery status or delay" },
  { value: "missing_pod", label: "Need delivery document / POD" },
  { value: "quality_complaint", label: "Quality concern" },
  { value: "other", label: "Something else" },
]);

export const ISSUE_STATUSES = opts([
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "waiting_customer", label: "Waiting for customer" },
  { value: "waiting_internal", label: "Waiting for internal team" },
  { value: "waiting_document", label: "Waiting for document" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]);
export const CLOSED_ISSUE_STATUSES = ["resolved", "closed"];

export const PRIORITIES = opts([
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]);

export const TASK_STATUSES = opts([
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
]);

export const ACTION_CATEGORIES = opts([
  { value: "collect_overdue", label: "Collect overdue payment" },
  { value: "confirm_promise", label: "Confirm payment promise" },
  { value: "missing_document", label: "Resolve missing document" },
  { value: "invoice_mismatch", label: "Investigate invoice mismatch" },
  { value: "resolve_dispute", label: "Resolve customer dispute" },
  { value: "quote_follow_up", label: "Follow up on quotation" },
  { value: "confirm_order", label: "Confirm order status" },
  { value: "delivery_commitment", label: "Update delivery commitment" },
  { value: "customer_complaint", label: "Respond to customer complaint" },
  { value: "overdue_task", label: "Review overdue internal task" },
]);
export type ActionCategory = (typeof ACTION_CATEGORIES)[number]["value"];
/** Action categories that expose receivable amounts; hidden from roles without receivables access. */
export const RECEIVABLE_ACTION_CATEGORIES = ["collect_overdue", "confirm_promise"];

export const DOCUMENT_TYPES = opts([
  { value: "purchase_order", label: "Purchase order" },
  { value: "invoice", label: "Invoice" },
  { value: "delivery_challan", label: "Delivery challan" },
  { value: "proof_of_delivery", label: "Proof of delivery" },
  { value: "grn", label: "Goods receipt note" },
  { value: "inspection_report", label: "Inspection report" },
  { value: "credit_note", label: "Credit note" },
  { value: "correspondence", label: "Customer correspondence" },
  { value: "other", label: "Other" },
]);

export function labelOf(list: Opt, value: string | null | undefined): string {
  if (!value) return "—";
  return list.find((o) => o.value === value)?.label ?? value;
}
