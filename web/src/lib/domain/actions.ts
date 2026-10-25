import { addDays, daysBetween, fmtDate, isoOf } from "../dates";
import { fmtINR } from "../format";
import { CLOSED_ISSUE_STATUSES, ISSUE_CATEGORIES, MISMATCH_CATEGORIES, MISSING_DOC_CATEGORIES, OPEN_QUOTE_STATUSES, ORDER_PENDING_DELIVERY, labelOf, type ActionCategory } from "./constants";
import { scorePriority } from "./receivables";
import type { OrgSettings } from "./settings";

// Pure generation of Action Center candidates from source records. The data layer upserts these by `key`,
// preserving user-set owner / due date / completion, and auto-closes actions whose condition has cleared.

export type ActionCandidate = {
  key: string;
  category: ActionCategory;
  title: string;
  customerId: string | null;
  invoiceId?: string | null;
  orderId?: string | null;
  issueId?: string | null;
  quotationId?: string | null;
  taskId?: string | null;
  promiseId?: string | null;
  amount: number | null;
  ownerId: string | null;
  dueDate: string | null;
  priority: string;
  priorityScore: number;
  priorityReason: string;
  recommendedAction: string;
};

export type ActionSources = {
  invoices: { id: string; number: string; customerId: string; ownerId: string | null; onHold: boolean; currency: string; nextFollowUpDate: Date | null; outstanding: number; overdueDays: number | null }[];
  promises: { id: string; invoiceId: string; customerId: string; ownerId: string | null; amount: number; promisedDate: Date; contactName: string; status: string }[];
  issues: { id: string; number: string; title: string; customerId: string; invoiceId: string | null; orderId: string | null; ownerId: string | null; category: string; status: string; source: string; blocksPayment: boolean; createdAt: Date; dueDate: Date | null; nextAction: string | null }[];
  quotations: { id: string; number: string; customerId: string; ownerId: string | null; amount: number; status: string; nextFollowUpDate: Date | null; validUntil: Date | null }[];
  orders: { id: string; number: string; customerId: string; ownerId: string | null; value: number; status: string; orderDate: Date; expectedDeliveryDate: Date | null; delayReason: string | null }[];
  dispatches: { id: string; orderId: string; customerId: string; challanNumber: string; ownerId: string | null; status: string; podReceived: boolean; deliveredDate: Date | null }[];
  tasks: { id: string; title: string; customerId: string | null; invoiceId: string | null; orderId: string | null; issueId: string | null; ownerId: string | null; status: string; dueDate: Date | null }[];
};

const ISSUE_PLAYBOOK: Record<string, string> = {
  missing_pod: "Obtain the signed proof of delivery from dispatch/transporter and share it with the customer's accounts team.",
  missing_grn: "Ask the customer's stores team for the goods receipt note reference and attach it to the invoice.",
  missing_po: "Request the purchase order copy from the customer's procurement contact and link it to the invoice.",
  quantity_mismatch: "Reconcile dispatched vs received quantity with dispatch records; agree a credit note or re-supply.",
  pricing_mismatch: "Compare invoice rates with the PO/quotation; confirm the correct price with sales before revising.",
  tax_mismatch: "Have finance verify GST treatment and issue a corrected invoice or credit note if required.",
  quality_complaint: "Get the inspection report reviewed by quality and agree a corrective action with the customer.",
  credit_note_pending: "Finance to issue the pending credit note and share it with the customer.",
  approval_pending: "Follow up with the customer's approver and record the expected approval date.",
  promise_missed: "Call the accounts contact, understand the delay and record a revised commitment.",
  cashflow_delay: "Agree a realistic payment schedule with the customer and record it as payment promises.",
  delivery_issue: "Confirm the delivery status with operations and update the customer.",
  warranty_service: "Assign a service engineer and confirm the visit date with the customer.",
  other: "Clarify the issue with the customer and assign the right internal team.",
};

function actionCategoryForIssue(category: string, source: string): ActionCategory {
  if (source === "portal") return "customer_complaint";
  if (MISSING_DOC_CATEGORIES.includes(category)) return "missing_document";
  if (MISMATCH_CATEGORIES.includes(category)) return "invoice_mismatch";
  if (category === "delivery_issue") return "delivery_commitment";
  return "resolve_dispute";
}

export function buildActionCandidates(src: ActionSources, asOf: string, settings: OrgSettings): ActionCandidate[] {
  const t = settings.priority;
  const out: ActionCandidate[] = [];
  const invById = new Map(src.invoices.map((i) => [i.id, i]));
  const openIssues = src.issues.filter((i) => !CLOSED_ISSUE_STATUSES.includes(i.status));
  const missedByInvoice = new Set(src.promises.filter((p) => p.status === "missed").map((p) => p.invoiceId));
  const issueLabel = (c: string) => labelOf(ISSUE_CATEGORIES, c);

  // 1. Overdue invoices
  for (const inv of src.invoices) {
    if (inv.outstanding <= 0 || !inv.overdueDays || inv.overdueDays <= 0 || inv.onHold || inv.currency !== "INR") continue;
    const blocking = openIssues.find((i) => i.invoiceId === inv.id && i.blocksPayment);
    const missingDoc = openIssues.some((i) => i.invoiceId === inv.id && MISSING_DOC_CATEGORIES.includes(i.category));
    const missed = missedByInvoice.has(inv.id);
    const p = scorePriority(
      { overdueDays: inv.overdueDays, amount: inv.outstanding, missedPromise: missed, unresolvedIssue: blocking ? issueLabel(blocking.category) : null, missingDocument: missingDoc },
      t, "this invoice", true,
    );
    out.push({
      key: `inv-overdue:${inv.id}`,
      category: "collect_overdue",
      title: `Collect ${fmtINR(inv.outstanding)} overdue on ${inv.number}`,
      customerId: inv.customerId,
      invoiceId: inv.id,
      issueId: blocking?.id ?? null,
      amount: inv.outstanding,
      ownerId: inv.ownerId,
      dueDate: isoOf(inv.nextFollowUpDate) ?? asOf,
      priority: p.priority,
      priorityScore: p.score,
      priorityReason: p.reason,
      recommendedAction: blocking
        ? `Resolve ${blocking.number} (${issueLabel(blocking.category).toLowerCase()}) first, then agree a payment date with the customer.`
        : missed
          ? "Call the accounts contact about the missed promise and record a revised commitment."
          : "Call the accounts contact, confirm payment status and record a payment promise or the reason for delay.",
    });
  }

  // 2. Payment promises
  for (const pr of src.promises) {
    const inv = invById.get(pr.invoiceId);
    const pd = isoOf(pr.promisedDate)!;
    if (pr.status === "missed") {
      const p = scorePriority({ missedPromise: true, amount: inv?.outstanding, overdueDays: inv?.overdueDays }, t, "this promise", false);
      out.push({
        key: `promise-missed:${pr.id}`,
        category: "confirm_promise",
        title: `Missed promise of ${fmtINR(pr.amount)} due ${fmtDate(pd)} on ${inv?.number ?? "invoice"}`,
        customerId: pr.customerId, invoiceId: pr.invoiceId, promiseId: pr.id,
        amount: pr.amount, ownerId: pr.ownerId, dueDate: asOf,
        priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
        recommendedAction: `Contact ${pr.contactName} to understand the missed payment, then record a revised promise or raise an issue if there is a blocker.`,
      });
    } else if (pr.status === "open" && pd <= addDays(asOf, settings.reminderLeadDays)) {
      const daysLeft = daysBetween(asOf, pd);
      const p = scorePriority({ amount: pr.amount, commitmentDaysLeft: daysLeft }, t, "this promise", false);
      out.push({
        key: `promise-due:${pr.id}`,
        category: "confirm_promise",
        title: `Confirm ${fmtINR(pr.amount)} promised for ${fmtDate(pd)} on ${inv?.number ?? "invoice"}`,
        customerId: pr.customerId, invoiceId: pr.invoiceId, promiseId: pr.id,
        amount: pr.amount, ownerId: pr.ownerId, dueDate: pd,
        priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
        recommendedAction: `Confirm with ${pr.contactName} that the payment is scheduled and check bank receipts on the promised date.`,
      });
    }
  }

  // 3. Open issues
  for (const is of openIssues) {
    const inv = is.invoiceId ? invById.get(is.invoiceId) : undefined;
    const age = daysBetween(is.createdAt, asOf);
    const due = isoOf(is.dueDate);
    const p = scorePriority(
      {
        amount: inv?.outstanding,
        overdueDays: inv?.overdueDays,
        issueAgeDays: age,
        missingDocument: MISSING_DOC_CATEGORIES.includes(is.category),
        followUpLateDays: due && due < asOf ? daysBetween(due, asOf) : 0,
      },
      t, "this issue", false,
    );
    out.push({
      key: `issue:${is.id}`,
      category: actionCategoryForIssue(is.category, is.source),
      title: `${is.number}: ${is.title}`,
      customerId: is.customerId, invoiceId: is.invoiceId, orderId: is.orderId, issueId: is.id,
      amount: inv?.outstanding ?? null, ownerId: is.ownerId, dueDate: due ?? asOf,
      priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
      recommendedAction: is.nextAction || ISSUE_PLAYBOOK[is.category] || ISSUE_PLAYBOOK.other,
    });
  }

  // 4. Quotation follow-ups
  for (const q of src.quotations) {
    if (!OPEN_QUOTE_STATUSES.includes(q.status) || q.status === "draft" || !q.nextFollowUpDate) continue;
    const fu = isoOf(q.nextFollowUpDate)!;
    if (fu > addDays(asOf, settings.reminderLeadDays)) continue;
    const vu = isoOf(q.validUntil);
    const p = scorePriority(
      { amount: q.amount, followUpLateDays: fu < asOf ? daysBetween(fu, asOf) : 0, commitmentDaysLeft: vu ? daysBetween(asOf, vu) : null },
      t, "this quotation", false,
    );
    out.push({
      key: `quote:${q.id}`,
      category: "quote_follow_up",
      title: `Follow up ${q.number} (${fmtINR(q.amount)})`,
      customerId: q.customerId, quotationId: q.id,
      amount: q.amount, ownerId: q.ownerId, dueDate: fu,
      priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
      recommendedAction: vu && vu <= addDays(asOf, t.commitmentWindowDays)
        ? `Validity ends ${fmtDate(vu)}: call the buyer for a decision or agree an extension, and record their feedback.`
        : "Call the buyer for feedback on the quotation; record their response and the next follow-up date.",
    });
  }

  // 5. Orders: confirmation and delivery commitments
  for (const o of src.orders) {
    if (o.status === "confirmation_pending") {
      const due = addDays(isoOf(o.orderDate)!, 2);
      const p = scorePriority({ amount: o.value, followUpLateDays: due < asOf ? daysBetween(due, asOf) : 0 }, t, "this order", false);
      out.push({
        key: `order-confirm:${o.id}`, category: "confirm_order",
        title: `Confirm order ${o.number} with the customer`,
        customerId: o.customerId, orderId: o.id, amount: o.value, ownerId: o.ownerId, dueDate: due,
        priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
        recommendedAction: "Confirm price, quantity and delivery date with the customer and move the order to Confirmed.",
      });
    }
    const exp = isoOf(o.expectedDeliveryDate);
    if (exp && ORDER_PENDING_DELIVERY.includes(o.status) && exp <= addDays(asOf, t.commitmentWindowDays)) {
      const p = scorePriority({ amount: o.value, commitmentDaysLeft: daysBetween(asOf, exp) }, t, "this order", false);
      out.push({
        key: `order-delivery:${o.id}`, category: "delivery_commitment",
        title: `${o.number} delivery committed for ${fmtDate(exp)}`,
        customerId: o.customerId, orderId: o.id, amount: o.value, ownerId: o.ownerId, dueDate: exp < asOf ? asOf : exp,
        priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
        recommendedAction: o.delayReason
          ? `Share a revised delivery date with the customer and record the reason (${o.delayReason}).`
          : "Confirm production and dispatch readiness with operations, then update the customer on the committed date.",
      });
    }
  }

  // 6. Delivered without proof of delivery (unless an issue already tracks it)
  for (const d of src.dispatches) {
    if (d.status !== "delivered" || d.podReceived) continue;
    if (openIssues.some((i) => i.orderId === d.orderId && i.category === "missing_pod")) continue;
    const due = addDays(isoOf(d.deliveredDate) ?? asOf, 3);
    const p = scorePriority({ missingDocument: true, followUpLateDays: due < asOf ? daysBetween(due, asOf) : 0 }, t, "this dispatch", false);
    out.push({
      key: `pod:${d.id}`, category: "missing_document",
      title: `Upload proof of delivery for ${d.challanNumber}`,
      customerId: d.customerId, orderId: d.orderId, amount: null, ownerId: d.ownerId, dueDate: due,
      priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
      recommendedAction: "Collect the signed delivery challan / POD from the transporter and attach it to the order.",
    });
  }

  // 7. Overdue internal tasks
  for (const tk of src.tasks) {
    const due = isoOf(tk.dueDate);
    if (tk.status === "done" || !due || due >= asOf) continue;
    const p = scorePriority({ followUpLateDays: daysBetween(due, asOf) }, t, "this task", false);
    out.push({
      key: `task:${tk.id}`, category: "overdue_task",
      title: `Overdue task: ${tk.title}`,
      customerId: tk.customerId, invoiceId: tk.invoiceId, orderId: tk.orderId, issueId: tk.issueId, taskId: tk.id,
      amount: null, ownerId: tk.ownerId, dueDate: due,
      priority: p.priority, priorityScore: p.score, priorityReason: p.reason,
      recommendedAction: "Complete the task or reschedule it with a reason.",
    });
  }

  return out;
}
